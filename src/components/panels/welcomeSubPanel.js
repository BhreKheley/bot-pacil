import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

export async function renderWelcomeSubPanel(client, guild) {
  const guildConfig = await getGuildConfig(client, guild.id);
  const welcome = guildConfig.welcome || {};

  const embed = buildPacilEmbed({
    title: '⚙️ Sub-Panel: Welcome System',
    description:
      'Konfigurasi salam penyambutan hangat bagi mahasiswa baru yang baru bergabung ke server Pacil Baik Fasilkom UI.',
    tone: 'gold',
    fields: [
      {
        name: '📢 Status Sambutan',
        value: welcome.enabled ? '🟢 **Aktif**' : '🔴 **Nonaktif**',
        inline: true,
      },
      {
        name: '🎯 Channel Tujuan',
        value: welcome.channelId ? `<#${welcome.channelId}>` : '*Belum diatur*',
        inline: true,
      },
      {
        name: '🎨 Kartu Gambar',
        value: welcome.cardEnabled !== false ? '🟢 **Aktif**' : '🔴 **Nonaktif**',
        inline: true,
      },
      {
        name: '💡 Tips',
        value: 'Gunakan `/greet setup` untuk mengubah template pesan dan gambar secara mendalam.',
        inline: false,
      },
    ],
    footer: 'Pacil Baik • Welcome Automation',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupAction:toggle_welcome')
      .setLabel(welcome.enabled ? 'Nonaktifkan Welcome' : 'Aktifkan Welcome')
      .setEmoji('⚙️')
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
