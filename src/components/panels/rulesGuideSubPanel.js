import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export const GUIDE_PAGES = {
  server: {
    title: '🗺️ Panduan Server Pacil Baik (Fasilkom UI)',
    description:
      'Selamat datang di server komunitas mahasiswa Fakultas Ilmu Komputer Universitas Indonesia!\n\n' +
      '• **Tujuan Server:** Sebagai wadah komunikasi, belajar bareng, diskusi akademik, dan silaturahmi antar angkatan Fasilkom UI.\n' +
      '• **Channel Penting:**\n' +
      '  - `#start-here` / `#verifikasi` — Verifikasi status mahasiswa UI.\n' +
      '  - `#announcement` — Pengumuman resmi akademik/kepanitiaan.\n' +
      '  - `#general` — Tempat ngobrol santai antar warga Pacil.\n' +
      '  - `#tugas-diskusi` — Tanya jawab seputar materi kuliah (Alpro, DAA, PBP, Basdat, dll).',
    tone: 'navy',
  },
  roles: {
    title: '🎭 Panduan Peran & Angkatan (Roles)',
    description:
      'Di Pacil Baik, role digunakan untuk mempermudah koordinasi kelas dan angkatan:\n\n' +
      '• **Role Angkatan:** Menandakan tahun masuk (misal: 2021, 2022, 2023, 2024).\n' +
      '• **Role Program Studi:** Ilmu Komputer (Ilkom) & Sistem Informasi (SI).\n' +
      '• **Role Minat:** Web Dev, Mobile, AI/ML, Cyber Security, UI/UX, Game Dev.\n' +
      '• **Cara Ambil Role:** Kunjungi channel `#reaction-roles` atau gunakan dashboard verifikasi.',
    tone: 'gold',
  },
  voice: {
    title: '🔊 Panduan Voice Channel & Circle Room',
    description:
      'Server ini dilengkapi sistem otomatisasi ruang suara:\n\n' +
      '• **Join to Create (JTC):** Masuk ke channel `➕ Buat Voice Room` untuk membuat ruang sementara otomatis. Pemilik room dapat mengunci, mengubah bitrate, atau membatasi user.\n' +
      '• **Private Circle:** Butuh ruang privat untuk kelompok tugas semester? Gunakan `/circle request` atau tekan tombol di `#circle-hub` untuk membuat kategori privat beserta role dan text/voice channel terisolasi!',
    tone: 'navy',
  },
  ticket: {
    title: '🎫 Panduan Bantuan & Tiket (Support)',
    description:
      'Jika kamu mengalami kendala teknis, butuh bantuan moderator, atau ingin melaporkan pelanggaran:\n\n' +
      '• Buka tiket via `#bantuan-tiket`.\n' +
      '• Jelaskan masalahmu secara detail dan sopan.\n' +
      '• Moderator atau Admin server akan segera merespons tiketmu secara privat.',
    tone: 'gold',
  },
  bot: {
    title: '🤖 Panduan Fitur Pacil Bot',
    description:
      'Perintah-perintah unggulan yang dapat kamu gunakan:\n\n' +
      '• `/circle [request|add|remove|leave|delete]` — Manajemen kelompok/circle privat.\n' +
      '• `/confession send` — Kirim menfess kampus terstruktur (From, To, Message).\n' +
      '• `/play <lagu>` — Memutar musik berkualitas tinggi di voice channel.\n' +
      '• `/guide` — Membuka kembali menu panduan interaktif ini kapan saja.',
    tone: 'navy',
  },
};

export function renderRulesGuidePublicEmbed(category = 'server') {
  const page = GUIDE_PAGES[category] || GUIDE_PAGES.server;

  const embed = buildPacilEmbed({
    title: page.title,
    description: page.description,
    tone: page.tone,
    footer: 'Makara Fasilkom UI • Pacil Bot • Panduan Interaktif',
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('guideMenuSelect')
    .setPlaceholder('Pilih topik panduan yang ingin dibaca...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Navigasi Server')
        .setDescription('Channel penting & pengenalan Pacil Baik')
        .setValue('server')
        .setEmoji('🗺️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Peran & Angkatan (Roles)')
        .setDescription('Role Ilkom, SI, angkatan, & minat bidang')
        .setValue('roles')
        .setEmoji('🎭'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Voice & Circle Room')
        .setDescription('Join-to-Create & Private Circle nugas')
        .setValue('voice')
        .setEmoji('🔊'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Tiket & Moderasi')
        .setDescription('Cara lapor kendala & hubungi pengurus')
        .setValue('ticket')
        .setEmoji('🎫'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Daftar Fitur Bot')
        .setDescription('Command confession, musik, & utilitas')
        .setValue('bot')
        .setEmoji('🤖')
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

export async function renderRulesGuideSubPanel(client, guild) {
  const embed = buildPacilEmbed({
    title: '📜 Sub-Panel: Rules & Interactive Guide',
    description:
      'Kelola panduan interaktif mahasiswa dan tata tertib server Pacil Baik Fasilkom UI.\n\n' +
      'Gunakan tombol di bawah untuk memasang pesan embed peraturan resmi (Community Guidelines & Server Etiquette) atau panel panduan interaktif.',
    tone: 'gold',
    fields: [
      {
        name: '🛡️ Tata Tertib (Rules)',
        value: 'Terbagi menjadi 2 pilar:\n1. **Community Guidelines** (Inklusivitas, anti-SARA, larangan plagiarisme kode).\n2. **Server Etiquette** (Gunakan channel sesuai topik, hargai privasi, no spam/doxxing).',
        inline: false,
      },
      {
        name: '📖 Interactive Guide',
        value: 'Embed yang dapat diganti topiknya secara dinamis via StringSelectMenu (Server, Roles, Voice, Ticket, Bot).',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Pacil Bot',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupAction:deploy_rules')
      .setLabel('Pasang Embed Rules')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setupAction:deploy_guide')
      .setLabel('Pasang Interactive Guide')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Secondary),
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
