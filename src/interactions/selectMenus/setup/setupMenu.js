import { renderCircleSubPanel } from '../../../components/panels/circleSubPanel.js';
import { renderConfessionSubPanel } from '../../../components/panels/confessionSubPanel.js';
import { renderWelcomeSubPanel } from '../../../components/panels/welcomeSubPanel.js';
import { renderBoosterSubPanel } from '../../../components/panels/boosterSubPanel.js';
import { renderMusicSubPanel } from '../../../components/panels/musicSubPanel.js';
import { renderMainDashboard } from '../../../components/panels/mainDashboard.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';

export default {
  name: 'pacilSetupSelect',
  async execute(interaction, client) {
    const selected = interaction.values[0];

    let panelPayload = null;

    switch (selected) {
      case 'panel_circle':
        panelPayload = await renderCircleSubPanel(client, interaction.guild);
        break;
      case 'panel_confession':
        panelPayload = await renderConfessionSubPanel(client, interaction.guild);
        break;
      case 'panel_welcome':
        panelPayload = await renderWelcomeSubPanel(client, interaction.guild);
        break;
      case 'panel_booster':
        panelPayload = await renderBoosterSubPanel(client, interaction.guild);
        break;
      case 'panel_music':
        panelPayload = await renderMusicSubPanel(client, interaction.guild);
        break;
      default: {
        const guildConfig = await getGuildConfig(client, interaction.guildId);
        panelPayload = renderMainDashboard(guildConfig, interaction.guild);
        break;
      }
    }

    return await interaction.update(panelPayload);
  },
};

