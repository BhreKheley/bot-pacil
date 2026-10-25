import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Cek latensi bot dan kecepatan Discord Gateway API"),

  async prefixExecute(interaction) {
    try {
      const startTime = Date.now();
      const pingingMessage = await interaction.reply({ content: '🏓 Menghubungi server Pacil Baik...' });

      const latency = Math.max(0, Date.now() - startTime);
      const apiLatency = Math.max(0, Math.round(interaction.client.ws.ping));
      const quality = latency < 120 ? '🟢 Sangat Cepat' : latency < 250 ? '🟡 Stabil' : '🔴 Cukup Tinggi';

      const embed = createEmbed({
        title: '🏓 Pong! Latensi Pacil Baik',
        description: `Status jaringan bot ke server Discord: **${quality}**`,
        color: latency < 200 ? 'success' : 'warning',
        footer: { text: 'Pacil Baik • Fasilkom UI 💻' },
        timestamp: true,
      }).addFields(
        { name: '⚡ Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: '🌐 Discord API Ping', value: `\`${apiLatency}ms\``, inline: true },
        { name: '💻 Status Jaringan', value: quality, inline: true },
      );

      await pingingMessage.edit({ content: null, embeds: [embed] });
    } catch (error) {
      logger.error('Ping prefix command error:', error);
      if (!interaction.replied && !interaction._replyMessage) {
        await interaction.channel.send({
          embeds: [createEmbed({ title: 'Kendala Sistem', description: 'Gagal mengecek latensi saat ini.', color: 'error' })],
        }).catch(() => {});
      }
    }
  },

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`Ping interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'ping'
      });
      return;
    }

    try {
      await InteractionHelper.safeEditReply(interaction, {
        content: "🏓 Menghubungi server Pacil Baik...",
      });

      const startTime = interaction._commandStartTime || interaction.createdTimestamp;
      const latency = Math.max(0, Date.now() - startTime);
      const apiLatency = Math.max(0, Math.round(interaction.client.ws.ping));
      const quality = latency < 120 ? '🟢 Sangat Cepat' : latency < 250 ? '🟡 Stabil' : '🔴 Cukup Tinggi';

      const embed = createEmbed({
        title: "🏓 Pong! Latensi Pacil Baik",
        description: `Koneksi bot Pacil Baik ke server berjalan **${quality}**.`,
        color: latency < 200 ? 'success' : 'warning',
        footer: { text: 'Pacil Baik • Fasilkom UI 💻' },
        timestamp: true,
      }).addFields(
        { name: "⚡ Bot Latency", value: `\`${latency}ms\``, inline: true },
        { name: "🌐 API Gateway", value: `\`${apiLatency}ms\``, inline: true },
        { name: "💻 Status Koneksi", value: quality, inline: true },
      );

      await InteractionHelper.safeEditReply(interaction, {
        content: null,
        embeds: [embed],
      });
    } catch (error) {
      logger.error('Ping command error:', error);
      try {
        return await InteractionHelper.safeReply(interaction, {
          embeds: [createEmbed({ title: 'Kendala Sistem', description: 'Gagal memeriksa latensi saat ini.', color: 'error' })],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};