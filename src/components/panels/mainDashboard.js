import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export function renderMainDashboard(guildConfig, guild) {
  const embed = buildPacilEmbed({
    title: '🏛️ Pacil Baik Master Control Center',
    description:
      'Selamat datang di panel konfigurasi tersentralisasi **Pacil Bot** untuk server mahasiswa Fasilkom UI.\n\n' +
      'Pilih modul fitur dari menu dropdown di bawah untuk melihat status, mengonfigurasi pengaturan, atau memasang panel interaktif.',
    tone: 'gold',
    fields: [
      {
        name: '👥 Circle Manager',
        value: 'Kelola kategori & voice channel privat untuk kelompok nugas / circle mahasiswa.',
        inline: true,
      },
      {
        name: '💌 Confession Setup',
        value: 'Atur sistem menfess kampus anonim & terstruktur (From, To, Message).',
        inline: true,
      },
      {
        name: '⚙️ Welcome System',
        value: 'Atur pesan sambutan hangat dan kartu selamat datang bagi mahasiswa baru.',
        inline: true,
      },
      {
        name: '🎭 Booster Roles',
        value: 'Apresiasi & kustomisasi role eksklusif untuk Server Booster.',
        inline: true,
      },
      {
        name: '🎶 Music Status',
        value: 'Pantau status node audio Lavalink v4 dan kualitas pemutaran lagu.',
        inline: true,
      },
      {
        name: '🛡️ Keamanan',
        value: 'Panel ini hanya dapat diakses oleh Administrator server.',
        inline: true,
      },
    ],
    footer: `Pacil Baik • ${guild?.name || 'Fasilkom UI'} Setup Dashboard`,
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('pacilSetupSelect')
    .setPlaceholder('Pilih fitur yang ingin dikonfigurasi...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Circle Manager')
        .setDescription('Kategori & channel privat untuk kelompok/tongkrongan')
        .setValue('panel_circle')
        .setEmoji('👥'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Confession Setup')
        .setDescription('Sistem menfess terstruktur dan anonim')
        .setValue('panel_confession')
        .setEmoji('💌'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Welcome System')
        .setDescription('Pesan & channel sambutan mahasiswa')
        .setValue('panel_welcome')
        .setEmoji('⚙️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Booster Roles')
        .setDescription('Role eksklusif untuk server booster')
        .setValue('panel_booster')
        .setEmoji('🎭'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Music Status')
        .setDescription('Node audio & pemutar musik komunitas')
        .setValue('panel_music')
        .setEmoji('🎶')
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    embeds: [embed],
    components: [row],
  };
}
