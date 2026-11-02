import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export async function renderMusicSubPanel(client, guild) {
  const riffy = client.riffy;
  const nodes = riffy?.nodeMap ? Array.from(riffy.nodeMap.values()) : [];
  const onlineNodes = nodes.filter((n) => n.connected);

  const embed = buildPacilEmbed({
    title: '🎶 Sub-Panel: Music Status',
    description:
      'Status infrastruktur audio Lavalink v4 untuk mendengarkan lagu santai, lofi coding, atau playlist nongkrong anak Pacil.',
    tone: 'gold',
    fields: [
      {
        name: '📡 Lavalink Nodes',
        value: `• Node Aktif: **${onlineNodes.length} / ${nodes.length || 1}**\n• Status: ${onlineNodes.length > 0 ? '🟢 Terhubung' : '🟡 Standby / Fallback'}`,
        inline: true,
      },
      {
        name: '🎧 Fitur Musik',
        value: '• `/play <lagu>` untuk memutar lagu\n• Autoplay relevan saat antrean selesai\n• Filter audio & volume kontrol',
        inline: true,
      },
    ],
    footer: 'Pacil Baik • High Quality Audio Engine',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
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

