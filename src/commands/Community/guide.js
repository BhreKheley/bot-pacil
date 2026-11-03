import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { renderRulesGuidePublicEmbed } from '../../ui/panels/rulesGuideSubPanel.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Buka panduan interaktif mahasiswa Fasilkom UI (Pacil Baik)')
    .setDMPermission(false),
  category: 'Community',

  async execute(interaction) {
    const guidePayload = renderRulesGuidePublicEmbed('server');
    return await interaction.reply({
      ...guidePayload,
      flags: MessageFlags.Ephemeral,
    });
  },
};

