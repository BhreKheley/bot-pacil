import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export function renderMainDashboard(client, guild) {
  const embed = buildPacilEmbed({
    title: '🏛️ Makara Control Center — Pacil Bot',
    description:
      'Selamat datang di Pusat Kontrol Tersentralisasi **Pacil Bot** (Komunitas Mahasiswa Fasilkom UI).\n\n' +
      'Gunakan menu dropdown interaktif di bawah untuk beralih antar sub-panel modul sistem secara instan:',
    tone: 'gold',
    fields: [
      {
        name: '⚙️ Welcome System',
        value: 'Atur pesan kedatangan minimalis & kartu selamat datang anggota baru.',
        inline: true,
      },
      {
        name: '📜 Rules & Guide',
        value: 'Pasang panduan interaktif mahasiswa & tata tertib server.',
        inline: true,
      },
      {
        name: '🎭 Booster Perks',
        value: 'Kelola reward custom role, warna hex/gradien, & ikon untuk server booster.',
        inline: true,
      },
      {
        name: '🎶 Music Bot Status',
        value: 'Pantau status live bot musik sekunder di voice channel (Available/In Use/Offline).',
        inline: true,
      },
      {
        name: '👥 Circle Manager',
        value: 'Sistem otomatisasi kategori & voice channel privat kelompok nugas mahasiswa.',
        inline: true,
      },
      {
        name: '💌 Confession Setup',
        value: 'Sistem menfess kampus anonim & terstruktur dengan fitur balas untaian thread.',
        inline: true,
      },
    ],
    footer: `Makara Fasilkom UI • Pacil Bot • Server: ${guild?.name || 'Pacil Baik'}`,
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('pacilSetupSelect')
    .setPlaceholder('Pilih modul konfigurasi...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Welcome System')
        .setDescription('Pengaturan pesan & greeting kedatangan mahasiswa baru')
        .setValue('panel_welcome')
        .setEmoji('⚙️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Rules & Interactive Guide')
        .setDescription('Panduan interaktif server & aturan komunitas')
        .setValue('panel_rules_guide')
        .setEmoji('📜'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Booster Perks')
        .setDescription('Kustomisasi role hadiah booster (nama, hex color, icon)')
        .setValue('panel_booster')
        .setEmoji('🎭'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Music Bot Status')
        .setDescription('Monitor live status secondary music bots')
        .setValue('panel_music')
        .setEmoji('🎶'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Circle Manager')
        .setDescription('Kategori & channel privat otomatis untuk circle/nugas')
        .setValue('panel_circle')
        .setEmoji('👥'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Confession Setup')
        .setDescription('Menfess kampus terstruktur & balas anonim thread')
        .setValue('panel_confession')
        .setEmoji('💌')
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    embeds: [embed],
    components: [row],
  };
}
