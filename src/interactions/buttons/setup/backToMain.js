import { renderMainDashboard } from '../../../components/panels/mainDashboard.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';

export default {
  name: 'setupBackMain',
  async execute(interaction, client) {
    const guildConfig = await getGuildConfig(client, interaction.guildId);
    const panel = renderMainDashboard(guildConfig, interaction.guild);

    return await interaction.update(panel);
  },
};
