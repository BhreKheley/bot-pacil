import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { getBoosterConfig } from '../../services/boosterService.js';
import { buildCustomRolePanel } from '../../services/customRoleService.js';

export async function renderBoosterSubPanel(client, guild, { notice = null } = {}) {
  const config = await getBoosterConfig(client, guild.id);
  const on = (v) => (v ? '✅ Aktif' : '⛔ Nonaktif');
  const boostCount = guild.premiumSubscriptionCount || 0;
  const boostTier = guild.premiumTier || 0;

  const embed = buildPacilEmbed({
    title: '🎭 Sub-Panel: Booster Perks & Custom Roles',
    description:
      'Apresiasi khusus bagi para mahasiswa dan anggota yang memberikan Server Boost untuk server Pacil Baik Fasilkom UI.\n\n' +
      'Mahasiswa dengan status Booster dapat membuat dan mengelola custom role pribadi mereka secara mandiri.' + (notice ? `\n\n${notice}` : ''),
    tone: 'gold',
    fields: [
      {
        name: '🚀 Status Server Boost',
        value: `• Level Server: **Tier ${boostTier}**\n• Total Boosts: **${boostCount} Boost**`,
        inline: true,
      },
      {
        name: '⚙️ Konfigurasi',
        value:
          `• Fitur custom role: ${on(config.enabled)}\n` +
          `• Hapus role saat berhenti boost: ${on(config.autoCleanup)}\n` +
          `• Gift Role: ${on(config.allowGift)}\n` +
          `• Icon Role: ${on(config.allowIcon)}\n` +
          `• Panjang nama maks.: **${config.nameMaxLength}** karakter`,
        inline: false,
      },
      {
        name: '✨ Fitur Custom Role Booster & Circle',
        value:
          '• **Create Role:** Buat custom / circle role\n' +
          '• **Gift Role:** Berikan custom role ke member\n' +
          '• **Manage Gift Role:** Kelola member penerima role\n' +
          '• **Manage Role Name:** Kelola nama custom role\n' +
          '• **Manage Role Color:** Solid, Gradient, atau Holographic\n' +
          '• **Manage Role Icon:** Kelola icon custom role\n' +
          '• **Delete Role:** Hapus custom role',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Pacil Bot',
  });

  const toggle = (key, label, emoji) =>
    new ButtonBuilder().setCustomId(`setup:booster:${key}`).setLabel(label).setEmoji(emoji).setStyle(config[key] === false ? ButtonStyle.Secondary : ButtonStyle.Success);
  const configRow = new ActionRowBuilder().addComponents(
    toggle('enabled', 'Fitur', '🎭'),
    toggle('autoCleanup', 'Auto-Hapus', '🧹'),
    toggle('allowGift', 'Gift', '🎁'),
    toggle('allowIcon', 'Icon', '🖼️'),
    new ButtonBuilder().setCustomId('setup:booster:namelen').setLabel('Batas Nama').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
  );
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup:act:deploy_booster_panel')
      .setLabel('Pasang Panel Publik Booster')
      .setEmoji('📌')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup:back')
      .setLabel('Menu Utama')
      .setEmoji('🔙')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [configRow, buttonRow],
  };
}

export function renderBoosterPublicPanel() {
  return buildCustomRolePanel();
}
