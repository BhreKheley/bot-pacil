// Aksi konfigurasi Welcome dari panel /pacilsetup (tombol, select, modal). Semua menulis lewat saveWelcomeConfig.

import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getWelcomeConfig, saveWelcomeConfig } from '../utils/database.js';
import { renderWelcomeSubPanel } from '../ui/panels/welcomeSubPanel.js';
import {
  buildGoodbyeEmbed,
  buildWelcomeEmbed,
  GOODBYE_DEFAULT_MESSAGE,
  GOODBYE_DEFAULT_TITLE,
  MAX_AUTOROLE_DELAY_SECONDS,
  MAX_AUTOROLES,
  WELCOME_DEFAULT_MESSAGE,
  WELCOME_DEFAULT_TITLE,
} from './welcomeService.js';

const HTTPS_URL = /^https:\/\/\S+$/i;

const input = (id, label, style, { value, placeholder, max, required = false } = {}) => {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required);
  if (value) t.setValue(String(value).slice(0, max ?? 4000));
  if (placeholder) t.setPlaceholder(placeholder);
  if (max) t.setMaxLength(max);
  return new ActionRowBuilder().addComponents(t);
};


async function refresh(interaction, client, viewName, notice) {
  const payload = await renderWelcomeSubPanel(client, interaction.guild, { view: viewName, notice });
  return interaction.update(payload);
}

async function patch(client, guildId, changes) {
  const ok = await saveWelcomeConfig(client, guildId, changes);
  if (!ok) throw new Error('Gagal menyimpan konfigurasi. Coba lagi sebentar lagi.');
}

function previewReply(interaction, embed, label) {
  return interaction.reply({ content: `*(Preview ${label} — pesan ini hanya terlihat olehmu)*`, embeds: [embed], flags: MessageFlags.Ephemeral });
}

/** Tombol: customId setup:welcome:<aksi>[:arg] */
export async function handleWelcomeButton(interaction, client, [action, arg]) {
  const guildId = interaction.guildId;
  const config = await getWelcomeConfig(client, guildId);

  switch (action) {
    case 'view': return refresh(interaction, client, arg);
    case 'toggle': {
      if (!config.enabled && !config.channelId) return refresh(interaction, client, 'arrival', '⚠️ Pilih channel sambutan dulu sebelum mengaktifkan.');
      await patch(client, guildId, { enabled: !config.enabled });
      return refresh(interaction, client, 'arrival');
    }
    case 'gtoggle': {
      if (!config.goodbyeEnabled && !config.goodbyeChannelId) return refresh(interaction, client, 'goodbye', '⚠️ Pilih channel perpisahan dulu sebelum mengaktifkan.');
      await patch(client, guildId, { goodbyeEnabled: !config.goodbyeEnabled });
      return refresh(interaction, client, 'goodbye');
    }
    case 'ping':
      await patch(client, guildId, { welcomePing: !config.welcomePing });
      return refresh(interaction, client, 'arrival');
    case 'gping':
      await patch(client, guildId, { goodbyePing: !config.goodbyePing });
      return refresh(interaction, client, 'goodbye');
    case 'edit': {
      const modal = new ModalBuilder().setCustomId('setup:welcome:edit').setTitle('Edit Pesan Sambutan').addComponents(
        input('title', 'Judul', TextInputStyle.Short, { value: config.welcomeTitle, placeholder: WELCOME_DEFAULT_TITLE, max: 100 }),
        input('message', 'Pesan', TextInputStyle.Paragraph, { value: config.welcomeMessage, placeholder: WELCOME_DEFAULT_MESSAGE, max: 1000 }),
        input('image', 'URL Gambar Banner (https, opsional)', TextInputStyle.Short, { value: config.welcomeImage, max: 300 }),
      );
      return interaction.showModal(modal);
    }
    case 'gedit': {
      const modal = new ModalBuilder().setCustomId('setup:welcome:gedit').setTitle('Edit Pesan Perpisahan').addComponents(
        input('title', 'Judul', TextInputStyle.Short, { value: config.goodbyeTitle, placeholder: GOODBYE_DEFAULT_TITLE, max: 100 }),
        input('message', 'Pesan', TextInputStyle.Paragraph, { value: config.leaveMessage, placeholder: GOODBYE_DEFAULT_MESSAGE, max: 1000 }),
      );
      return interaction.showModal(modal);
    }
    case 'delay': {
      const modal = new ModalBuilder().setCustomId('setup:welcome:delay').setTitle('Tunda Auto-Role').addComponents(
        input('seconds', `Detik (0–${MAX_AUTOROLE_DELAY_SECONDS})`, TextInputStyle.Short, { value: config.autoRoleDelay || 0, max: 4, required: true }),
      );
      return interaction.showModal(modal);
    }
    case 'preview':
      return previewReply(interaction, buildWelcomeEmbed({ member: interaction.member, config, inviterId: interaction.user.id }), 'sambutan');
    case 'gpreview':
      return previewReply(interaction, buildGoodbyeEmbed({ member: interaction.member, config }), 'perpisahan');
    default:
      return interaction.reply({ content: 'Aksi tidak dikenal. Buka ulang panelnya ya.', flags: MessageFlags.Ephemeral });
  }
}

/** Select menu: setup:welcome:ch:<welcome|guide|goodbye> dan setup:welcome:roles */
export async function handleWelcomeSelect(interaction, client, [kind, field]) {
  const guildId = interaction.guildId;
  const value = interaction.values?.[0] ?? null;
  if (kind === 'ch') {
    const key = { welcome: 'channelId', guide: 'guideChannelId', goodbye: 'goodbyeChannelId' }[field];
    if (!key) return;
    await patch(client, guildId, { [key]: value });
    return refresh(interaction, client, field === 'goodbye' ? 'goodbye' : 'arrival');
  }
  if (kind === 'roles') {
    const me = interaction.guild.members.me;
    const roles = interaction.values.slice(0, MAX_AUTOROLES);
    const unusable = roles.filter((id) => {
      const role = interaction.guild.roles.cache.get(id);
      return !role || role.managed || role.id === guildId || (me && role.position >= me.roles.highest.position);
    });
    if (unusable.length) {
      return refresh(interaction, client, 'arrival', `⚠️ Role ${unusable.map((id) => `<@&${id}>`).join(' ')} tidak bisa dipakai (dikelola bot/integrasi, @everyone, atau posisinya di atas role bot). Auto-role tidak diubah.`);
    }
    await patch(client, guildId, { roleIds: roles });
    return refresh(interaction, client, 'arrival');
  }
}

/** Modal: setup:welcome:<edit|gedit|delay> */
export async function handleWelcomeModal(interaction, client, [action]) {
  const guildId = interaction.guildId;
  const get = (id) => interaction.fields.getTextInputValue(id)?.trim() ?? '';
  const done = async (changes, viewName) => {
    await patch(client, guildId, changes);
    if (interaction.isFromMessage?.()) return interaction.update(await renderWelcomeSubPanel(client, interaction.guild, { view: viewName, notice: '✅ Tersimpan.' }));
    return interaction.reply({ content: '✅ Tersimpan. Tekan tombol lain di panel untuk menyegarkan tampilan.', flags: MessageFlags.Ephemeral });
  };
  const fail = (msg) => interaction.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral });

  if (action === 'edit') {
    const image = get('image');
    if (image && !HTTPS_URL.test(image)) return fail('URL gambar harus diawali `https://`.');
    return done({ welcomeTitle: get('title'), welcomeMessage: get('message'), welcomeImage: image || null }, 'arrival');
  }
  if (action === 'gedit') return done({ goodbyeTitle: get('title'), leaveMessage: get('message') }, 'goodbye');
  if (action === 'delay') {
    const n = Number(get('seconds'));
    if (!Number.isInteger(n) || n < 0 || n > MAX_AUTOROLE_DELAY_SECONDS) return fail(`Isi bilangan bulat 0–${MAX_AUTOROLE_DELAY_SECONDS}.`);
    return done({ autoRoleDelay: n }, 'arrival');
  }
}
