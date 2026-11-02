import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { guildCirclesListKey } from '../../services/circleService.js';

export async function renderCircleSubPanel(client, guild) {
  const circlesList = (await client.db.get(guildCirclesListKey(guild.id), [])) || [];
  const categoriesCount = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildCategory
  ).size;

  const embed = buildPacilEmbed({
    title: '👥 Sub-Panel: Circle Manager',
    description:
      'Sistem otomatisasi ruang privat untuk kelompok tugas, kepanitiaan, atau tongkrongan mahasiswa Fasilkom UI.\n\n' +
      'Setiap pemohon circle mendapatkan **Role khusus**, **Kategori Privat**, **Text Channel**, dan **Voice Channel** yang terisolasi dari mahasiswa lainnya.',
    tone: 'gold',
    fields: [
      {
        name: '📊 Status & Kuota Server',
        value: `• Kategori Aktif: **${categoriesCount} / 50**\n• Total Circle Tercatat: **${circlesList.length} circle**`,
        inline: true,
      },
      {
        name: '🔒 Hak Akses (Permissions)',
        value: '• `@everyone`: ViewChannel = Denied\n• Circle Role: View & Connect = Allowed\n• Owner: Dapat mengundang anggota via `/circle add`',
        inline: true,
      },
      {
        name: '🚀 Aksi Cepat',
        value: 'Gunakan tombol **Pasang Panel Publik** di bawah untuk memasang tombol "Request Circle Room" ke channel publik (misal `#buat-circle`).',
        inline: false,
      },
    ],
    footer: 'Pacil Baik • Circle Automation Configuration',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupAction:deploy_circle_panel')
      .setLabel('Pasang Panel Publik')
      .setEmoji('📌')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setupAction:list_circles')
      .setLabel('Daftar Circle Aktif')
      .setEmoji('📋')
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
