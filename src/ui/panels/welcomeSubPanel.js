import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

export async function renderWelcomeSubPanel(client, guild) {
  const guildConfig = await getGuildConfig(client, guild.id);
  const welcome = guildConfig.welcome || {};

  const embed = buildPacilEmbed({
    title: '⚙️ Sub-Panel: Welcome System (Arrival)',
    description:
      'Pengaturan kedatangan mahasiswa baru di server Pacil Baik Fasilkom UI.\n' +
      'Desain arrival dibuat minimalis namun berdampak, dilengkapi avatar resolusi tinggi dan info tracker pengundang.',
    tone: 'gold',
    fields: [
      {
        name: '📢 Status Sambutan',
        value: welcome.enabled ? '🟢 **Aktif (Enabled)**' : '🔴 **Nonaktif (Disabled)**',
        inline: true,
      },
      {
        name: '🎯 Channel Tujuan',
        value: welcome.channelId ? `<#${welcome.channelId}>` : '*Belum dikonfigurasi*',
        inline: true,
      },
      {
        name: '🎨 Format Tampilan',
        value: '• High-res avatar thumbnail\n• Pelacak "Diundang oleh"\n• Nomor urut "Member Ke-"\n• Panduan ke `#start-here`',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Pacil Bot',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup:act:toggle_welcome')
      .setLabel(welcome.enabled ? 'Nonaktifkan Welcome' : 'Aktifkan Welcome')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup:act:test_welcome')
      .setLabel('Preview Greeting')
      .setEmoji('👁️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup:back')
      .setLabel('🔙 Back to Main Menu')
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [buttonRow],
  };
}
