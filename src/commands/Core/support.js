import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SUPPORT_SERVER_URL = "https://discord.gg/QnWNz2dKCE";

export default {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Dapatkan tautan bantuan, komunitas, dan info server pacil baik"),

  async execute(interaction) {
    try {
      const supportButton = new ButtonBuilder()
        .setLabel("Masuk Discord Pacil Baik")
        .setEmoji("💬")
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL);

      const actionRow = new ActionRowBuilder().addComponents(supportButton);

      await InteractionHelper.safeReply(interaction, {
        embeds: [
          createEmbed({
            title: "🎓 Komunitas & Bantuan Pacil Baik",
            description: [
              "Halo warga Pacil! Ada kendala dengan bot atau mau ngobrol seputar kuliah & tugas Fasilkom UI?",
              "",
              "• **Lapor Bug:** Klik tombol di bawah atau mention tim pengembang di server.",
              "• **Request Fitur:** Punya ide fitur baru yang asik buat anak Pacil? Sampaikan langsung ke tim dev!",
              "• **Server:** Khusus mahasiswa Fasilkom UI (Pacil Baik).",
            ].join("\n"),
            color: "primary",
            footer: { text: "Pacil Baik • Fasilkom UI 💻" },
            timestamp: true,
          }),
        ],
        components: [actionRow],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error('Support command error:', error);
      try {
        return await InteractionHelper.safeReply(interaction, {
          embeds: [
            createEmbed({
              title: 'Kendala Sistem',
              description: 'Gagal menampilkan informasi bantuan saat ini.',
              color: 'error',
              footer: { text: 'Pacil Baik • Fasilkom UI 💻' },
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