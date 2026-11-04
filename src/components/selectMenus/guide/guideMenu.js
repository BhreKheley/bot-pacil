import { getGuideOverrides } from '../../../services/guideService.js';
import { renderRulesGuidePublicEmbed } from '../../../ui/panels/rulesGuideSubPanel.js';

export default {
  name: 'guideMenuSelect',
  async execute(interaction, client) {
    const selected = interaction.values[0];
    const updated = renderRulesGuidePublicEmbed(selected, await getGuideOverrides(client, interaction.guildId));
    return await interaction.update(updated);
  },
};

