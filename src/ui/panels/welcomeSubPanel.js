import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { getWelcomeConfig } from '../../utils/database.js';
import { MAX_AUTOROLES, TEMPLATE_TOKENS, summarizeWelcome, welcomeProblems } from '../../services/welcomeService.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const button = (id, label, emoji, style = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(id).setLabel(label).setEmoji(emoji).setStyle(style);

const channelSelect = (id, placeholder, current) => {
  const menu = new ChannelSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).setChannelTypes(TEXT_CHANNELS).setMinValues(0).setMaxValues(1);
  if (current) menu.setDefaultChannels(current);
  return new ActionRowBuilder().addComponents(menu);
};

/**
 * Panel Welcome System. view: 'arrival' (sambutan + auto-role) | 'goodbye' (perpisahan).
 * Semua pengaturan membaca/menulis getWelcomeConfig — sumber yang sama dengan event member join/leave.
 */
export async function renderWelcomeSubPanel(client, guild, { view = 'arrival', notice = null } = {}) {
  const config = await getWelcomeConfig(client, guild.id);
  const summary = summarizeWelcome(config);
  const arrival = view === 'arrival';
  const problems = welcomeProblems(guild, config, view);

  const embed = buildPacilEmbed({
    title: arrival ? '👋 Welcome System — Sambutan' : '👋 Welcome System — Perpisahan',
    description: [
      notice,
      arrival
        ? 'Kartu sambutan untuk member baru: avatar, nomor urut, pengundang, dan arahan ke channel panduan.'
        : 'Pesan singkat saat member keluar dari server.',
      problems.length ? `⚠️ ${problems.join(' ')}` : null,
    ].filter(Boolean).join('\n\n'),
    tone: 'gold',
    fields: [
      ...(arrival ? summary.arrival : summary.goodbye),
      { name: 'Variabel Pesan', value: `\`${TEMPLATE_TOKENS}\``, inline: false },
    ],
  });

  const rows = [];
  if (arrival) {
    rows.push(channelSelect('setup:welcome:ch:welcome', 'Pilih channel sambutan', config.channelId));
    rows.push(channelSelect('setup:welcome:ch:guide', 'Pilih channel panduan (mis. #start-here)', config.guideChannelId));
    const roles = new RoleSelectMenuBuilder().setCustomId('setup:welcome:roles').setPlaceholder('Pilih auto-role untuk member baru (opsional)')
      .setMinValues(0).setMaxValues(MAX_AUTOROLES);
    if (config.roleIds?.length) roles.setDefaultRoles(config.roleIds.slice(0, MAX_AUTOROLES));
    rows.push(new ActionRowBuilder().addComponents(roles));
    rows.push(new ActionRowBuilder().addComponents(
      button('setup:welcome:toggle', config.enabled ? 'Nonaktifkan' : 'Aktifkan', config.enabled ? '⏸️' : '▶️', config.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
      button('setup:welcome:edit', 'Edit Pesan', '✏️'),
      button('setup:welcome:ping', config.welcomePing ? 'Mention: Ya' : 'Mention: Tidak', '🔔'),
      button('setup:welcome:delay', 'Tunda Auto-Role', '⏱️'),
      button('setup:welcome:preview', 'Preview', '👁️'),
    ));
    rows.push(new ActionRowBuilder().addComponents(
      button('setup:welcome:view:goodbye', 'Perpisahan', '👋'),
      button('setup:back', 'Menu Utama', '🔙', ButtonStyle.Primary),
    ));
  } else {
    rows.push(channelSelect('setup:welcome:ch:goodbye', 'Pilih channel perpisahan', config.goodbyeChannelId));
    rows.push(new ActionRowBuilder().addComponents(
      button('setup:welcome:gtoggle', config.goodbyeEnabled ? 'Nonaktifkan' : 'Aktifkan', config.goodbyeEnabled ? '⏸️' : '▶️', config.goodbyeEnabled ? ButtonStyle.Secondary : ButtonStyle.Success),
      button('setup:welcome:gedit', 'Edit Pesan', '✏️'),
      button('setup:welcome:gping', config.goodbyePing ? 'Mention: Ya' : 'Mention: Tidak', '🔔'),
      button('setup:welcome:gpreview', 'Preview', '👁️'),
    ));
    rows.push(new ActionRowBuilder().addComponents(
      button('setup:welcome:view:arrival', 'Sambutan', '👋'),
      button('setup:back', 'Menu Utama', '🔙', ButtonStyle.Primary),
    ));
  }
  return { embeds: [embed], components: rows };
}
