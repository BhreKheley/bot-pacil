import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildStatusEmbed, buildStatusActionRow } from './status.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Lihat statistik lengkap dan performa sistem bot Pacil Baik"),

  async execute(interaction, guildConfig, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const embed = await buildStatusEmbed(client || interaction.client, interaction.guildId);
      const row = buildStatusActionRow();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      logger.error('Stats command error:', error);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          createEmbed({
            title: 'Kendala Sistem',
            description: 'Gagal mengambil data statistik performa sistem.',
            color: 'error',
            footer: { text: 'Pacil Baik • Fasilkom UI' },
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};