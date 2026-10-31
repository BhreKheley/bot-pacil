import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Cek berapa lama bot Pacil Baik telah aktif online"),

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction);

      let totalSeconds = (interaction.client.uptime || 0) / 1000;
      const days = Math.floor(totalSeconds / 86400);
      totalSeconds %= 86400;
      const hours = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);

      const uptimeParts = [];
      if (days > 0) uptimeParts.push(`${days} Hari`);
      if (hours > 0) uptimeParts.push(`${hours} Jam`);
      if (minutes > 0) uptimeParts.push(`${minutes} Menit`);
      uptimeParts.push(`${seconds} Detik`);

      const uptimeStr = uptimeParts.join(' ');

      const embed = createEmbed({
        title: "⏱️ Uptime Sistem — Pacil Baik",
        description: [
          `Bot **Pacil Baik** aktif melayani mahasiswa Fasilkom UI tanpa henti:`,
          `\`\`\`fix\n${uptimeStr}\n\`\`\``,
          `*Sistem stabil & siap nemenin nugas di server pacil baik!*`,
        ].join('\n'),
        color: 'primary',
        footer: { text: 'Pacil Baik • Fasilkom UI' },
        timestamp: true,
      });

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
      });
    } catch (error) {
      logger.error('Uptime command error:', error);
      try {
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: 'Kendala Sistem',
              description: 'Tidak dapat menghitung waktu aktif bot saat ini.',
              color: 'error',
              footer: { text: 'Pacil Baik • Fasilkom UI' },
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};