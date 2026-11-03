// Menu modul dashboard /pacilsetup (customId: setup:menu). Merender sub-panel dengan interaction.update().

import { renderWelcomeSubPanel } from '../../../components/panels/welcomeSubPanel.js';
import { renderBoosterSubPanel } from '../../../components/panels/boosterSubPanel.js';
import { renderMusicSubPanel } from '../../../components/panels/musicSubPanel.js';
import { renderCircleSubPanel } from '../../../components/panels/circleSubPanel.js';
import { renderRulesGuideSubPanel } from '../../../components/panels/rulesGuideSubPanel.js';
import { renderMainDashboard, SETUP_MODULES } from '../../../components/panels/mainDashboard.js';
import { renderConfigView } from '../../../services/configHubService.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';

const PANELS = {
  welcome: renderWelcomeSubPanel,
  rules: renderRulesGuideSubPanel,
  booster: renderBoosterSubPanel,
  music: renderMusicSubPanel,
  circle: renderCircleSubPanel,
};

async function render(client, guild, value) {
  const module = SETUP_MODULES.find((m) => m.value === value);
  if (!module) return renderMainDashboard(guild);
  if (module.kind === 'hub') return renderConfigView(client, guild, module.view);
  return PANELS[module.value](client, guild);
}

async function execute(interaction, client) {
  if (await denyIfNoSetupAccess(interaction)) return;
  return interaction.update(await render(client, interaction.guild, interaction.values[0]));
}

// Nama lama (pacilSetupSelect) dipertahankan untuk panel yang sudah terpasang.
export default [
  { name: 'setup', execute },
  { name: 'pacilSetupSelect', execute },
];
