import { renderRulesGuidePublicEmbed } from '../../../ui/panels/rulesGuideSubPanel.js';

export default {
  name: 'guideMenuSelect',
  async execute(interaction) {
    const selected = interaction.values[0];
    const updated = renderRulesGuidePublicEmbed(selected);
    return await interaction.update(updated);
  },
};

