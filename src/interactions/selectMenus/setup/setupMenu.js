import { renderWelcomeSubPanel } from '../../../components/panels/welcomeSubPanel.js';
import { renderBoosterSubPanel } from '../../../components/panels/boosterSubPanel.js';
import { renderMusicSubPanel } from '../../../components/panels/musicSubPanel.js';
import { renderCircleSubPanel } from '../../../components/panels/circleSubPanel.js';
import { renderConfessionSubPanel } from '../../../components/panels/confessionSubPanel.js';
import { renderRulesGuideSubPanel } from '../../../components/panels/rulesGuideSubPanel.js';
import { renderMainDashboard } from '../../../components/panels/mainDashboard.js';

export default {
  name: 'pacilSetupSelect',
  async execute(interaction, client) {
    const selected = interaction.values[0];

    let panelPayload = null;

    switch (selected) {
      case 'panel_welcome':
        panelPayload = await renderWelcomeSubPanel(client, interaction.guild);
        break;
      case 'panel_booster':
        panelPayload = await renderBoosterSubPanel(client, interaction.guild);
        break;
      case 'panel_music':
        panelPayload = await renderMusicSubPanel(client, interaction.guild);
        break;
      case 'panel_circle':
        panelPayload = await renderCircleSubPanel(client, interaction.guild);
        break;
      case 'panel_confession':
        panelPayload = await renderConfessionSubPanel(client, interaction.guild);
        break;
      case 'panel_rules_guide':
        panelPayload = await renderRulesGuideSubPanel(client, interaction.guild);
        break;
      default:
        panelPayload = renderMainDashboard(client, interaction.guild);
        break;
    }

    return await interaction.update(panelPayload);
  },
};
