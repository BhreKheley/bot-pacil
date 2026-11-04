import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getGuideOverrides } from '../../services/guideService.js';
import { renderRulesGuidePublicEmbed } from '../../ui/panels/rulesGuideSubPanel.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Buka panduan interaktif mahasiswa Fasilkom UI (Pacil Baik)')
    .setDMPermission(false),
  category: 'Community',

  async execute(interaction, config, client) {
    const guidePayload = renderRulesGuidePublicEmbed('server', await getGuideOverrides(client, interaction.guildId));
    return await interaction.reply({
      ...guidePayload,
      flags: MessageFlags.Ephemeral,
    });
  },
};

