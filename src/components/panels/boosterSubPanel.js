import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export async function renderBoosterSubPanel(client, guild) {
  const boostCount = guild.premiumSubscriptionCount || 0;
  const boostTier = guild.premiumTier || 0;

  const embed = buildPacilEmbed({
    title: '🎭 Sub-Panel: Booster Perks & Custom Roles',
    description:
      'Apresiasi khusus bagi para mahasiswa dan anggota yang memberikan Server Boost untuk server Pacil Baik Fasilkom UI.\n\n' +
      'Mahasiswa dengan status Booster dapat membuat dan mengelola custom role pribadi mereka secara mandiri.',
    tone: 'gold',
    fields: [
      {
        name: '🚀 Status Server Boost',
        value: `• Level Server: **Tier ${boostTier}**\n• Total Boosts: **${boostCount} Boost**`,
        inline: true,
      },
      {
        name: '✨ Fitur Custom Role Booster',
        value:
          '• **Create Role:** Buat custom role baru\n' +
          '• **Manage Name:** Ganti nama role\n' +
          '• **Manage Color:** Atur warna (Solid Hex code / Gradien)\n' +
          '• **Manage Icon:** Pasang ikon emoji kustom pada role\n' +
          '• **Gift Role:** Berikan role ke teman terdekat\n' +
          '• **Delete Role:** Hapus custom role',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Pacil Bot',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupAction:deploy_booster_panel')
      .setLabel('Pasang Panel Publik Booster')
      .setEmoji('📌')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setupBackMain')
      .setLabel('🔙 Back to Main Menu')
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [buttonRow],
  };
}

export function renderBoosterPublicPanel() {
  const embed = buildPacilEmbed({
    title: '💎 Server Booster Lounge — Custom Role Perks',
    description:
      'Terima kasih telah men-support server **Pacil Baik Fasilkom UI** melalui Server Boost! 🚀\n\n' +
      'Sebagai bentuk apresiasi, kamu berhak mendapatkan dan mengelola **Custom Role Eksklusif** dengan warna, ikon, dan nama sesukamu.',
    tone: 'gold',
    fields: [
      {
        name: '🎨 Opsi Pengaturan',
        value:
          '• **Create Role** — Buat role baru kamu\n' +
          '• **Name & Color** — Ganti nama atau kode warna hex (contoh: `#f2a900`)\n' +
          '• **Role Icon** — Upload icon/emoji kustom\n' +
          '• **Gift Role** — Bagikan role ke teman belajar kamu\n' +
          '• **Delete Role** — Hapus role kamu',
        inline: false,
      },
      {
        name: '📌 Syarat',
        value: 'Hanya anggota yang sedang aktif melakukan Boost di server ini yang dapat menggunakan tombol di bawah.',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Booster Perks',
  });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('booster:create')
      .setLabel('Create Role')
      .setEmoji('✨')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('booster:name')
      .setLabel('Manage Name')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('booster:color')
      .setLabel('Manage Color')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('booster:icon')
      .setLabel('Manage Icon')
      .setEmoji('🖼️')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('booster:gift')
      .setLabel('Gift Role')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('booster:delete')
      .setLabel('Delete Role')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}
