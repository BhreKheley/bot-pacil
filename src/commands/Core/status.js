import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  version as djsVersion,
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getSystemStatusSummary } from '../../services/commandStatusService.js';
import { logger } from '../../utils/logger.js';

export async function buildStatusEmbed(client, guildId = null) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  const wsStatus = wsPing < 100 ? '🟢 Lancar' : wsPing < 250 ? '🟡 Wajar' : '🔴 Tinggi';

  // Format uptime
  let totalSeconds = (client.uptime || 0) / 1000;
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const uptimeString = `${days > 0 ? `${days}h ` : ''}${hours}j ${minutes}m ${seconds}d`;

  // Memory usage
  const heapUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const heapTotal = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1);

  // Database status
  const dbStatus = client.db?.getStatus?.() || { connectionType: 'unknown', isDegraded: false };
  const dbLabel = dbStatus.isDegraded
    ? '⚠️ Mode In-Memory (PostgreSQL offline)'
    : dbStatus.connectionType === 'postgres'
    ? '🟢 PostgreSQL (Terkoneksi)'
    : '🟢 Database Siap';

  // Music status (Riffy / Lavalink)
  let musicStatus = '⚪ Nonaktif';
  if (client.config?.features?.music) {
    if (client.riffy) {
      const nodeCount = client.riffy.nodes?.size || 0;
      const onlineNodes = [...(client.riffy.nodes?.values() || [])].filter((n) => n.connected).length;
      musicStatus = onlineNodes > 0
        ? `🟢 Lavalink Online (${onlineNodes}/${nodeCount} node)`
        : '🔴 Lavalink Offline (Sedang maintenance)';
    } else {
      musicStatus = '🟡 Inisialisasi';
    }
  }

  // Command status summary
  const statusSummary = await getSystemStatusSummary(client, guildId);

  const healthHeader = statusSummary.overallHealth === 'healthy'
    ? '🟢 **Semua Command & Layanan Berjalan Normal**'
    : statusSummary.overallHealth === 'degraded'
    ? '⚠️ **Beberapa Command Terdeteksi Kendala**'
    : '🛠️ **Ada Command Sedang Dalam Pemeliharaan**';

  const embed = createEmbed({
    title: `🎓 Status Sistem & Command — Pacil Baik`,
    description: [
      `Informasi kesehatan bot, performa server, dan ketersediaan command untuk server **pacil baik** (Fasilkom UI).`,
      '',
      `### 📡 Ringkasan Ketersediaan Command`,
      `> ${healthHeader}`,
      `> 🟢 **${statusSummary.openCount}** Open · 🔴 **${statusSummary.closedCount}** Closed · ⚠️ **${statusSummary.degradedCount}** Kendala · 📋 **${statusSummary.totalCommands}** Total`,
    ].join('\n'),
    color: statusSummary.overallHealth === 'healthy' ? 'primary' : 'warning',
    fields: [
      {
        name: '⚡ Performa & Koneksi',
        value: [
          `• **WebSocket Ping:** \`${wsPing}ms\` (${wsStatus})`,
          `• **Uptime Bot:** \`${uptimeString}\``,
          `• **Node.js:** \`${process.version}\` | **Discord.js:** \`v${djsVersion}\``,
          `• **Memory RAM:** \`${heapUsed} MB / ${heapTotal} MB\``,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🗄️ Layanan Backend',
        value: [
          `• **Database:** ${dbLabel}`,
          `• **Music Engine:** ${musicStatus}`,
        ].join('\n'),
        inline: false,
      },
    ],
    footer: { text: 'Pacil Baik • Fasilkom UI' },
    timestamp: true,
  });

  // If there are closed or degraded commands, list them explicitly so users know why!
  if (statusSummary.closedList.length > 0 || statusSummary.degradedList.length > 0) {
    const closedEntries = [
      ...statusSummary.closedList.map(
        (c) => `• 🔴 \`/${c.name}\` — ${c.reason || 'Ditutup sementara oleh admin'}`
      ),
      ...statusSummary.degradedList.map(
        (c) => `• ⚠️ \`/${c.name}\` — ${c.reason || 'Terdeteksi kendala eksekusi'}`
      ),
    ].slice(0, 15);

    embed.addFields({
      name: `🛠️ Command yang Sedang Ada Kendala / Ditutup (${statusSummary.closedCount + statusSummary.degradedCount})`,
      value: closedEntries.join('\n') + (statusSummary.closedList.length + statusSummary.degradedList.length > 15 ? '\n*...dan beberapa command lainnya.*' : ''),
      inline: false,
    });
  } else {
    embed.addFields({
      name: '✅ Kondisi Command',
      value: 'Seluruh command terverifikasi **100% Aktif (Open)** dan siap digunakan oleh anak-anak Pacil!',
      inline: false,
    });
  }

  return embed;
}

export function buildStatusActionRow() {
  const refreshButton = new ButtonBuilder()
    .setCustomId('status-refresh')
    .setLabel('Perbarui Status')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary);

  const helpButton = new ButtonBuilder()
    .setCustomId('help-back-to-main')
    .setLabel('Buka /help')
    .setEmoji('📖')
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents([refreshButton, helpButton]);
}

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Cek status kesehatan bot Pacil Baik, performa server, dan command yang open/closed'),

  async execute(interaction, guildConfig, client) {
    await InteractionHelper.safeDefer(interaction);

    const embed = await buildStatusEmbed(client, interaction.guildId);
    const row = buildStatusActionRow();

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [embed],
      components: [row],
    });
  },
};
