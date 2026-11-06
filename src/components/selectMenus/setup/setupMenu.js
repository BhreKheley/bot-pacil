// Menu modul dashboard /pacilsetup (customId: setup:menu). Merender sub-panel dengan interaction.update().

import { renderWelcomeSubPanel } from '../../../ui/panels/welcomeSubPanel.js';
import { renderVerificationSubPanel } from '../../../ui/panels/verificationSubPanel.js';
import { renderTicketSubPanel } from '../../../ui/panels/ticketSubPanel.js';
import { renderBirthdaySubPanel } from '../../../ui/panels/birthdaySubPanel.js';
import { renderBoosterSubPanel } from '../../../ui/panels/boosterSubPanel.js';
import { renderMusicSubPanel } from '../../../ui/panels/musicSubPanel.js';
import { renderModerationSubPanel } from '../../../ui/panels/moderationSubPanel.js';
import { renderCircleSubPanel } from '../../../ui/panels/circleSubPanel.js';
import { renderRulesGuideSubPanel } from '../../../ui/panels/rulesGuideSubPanel.js';
import { renderMainDashboard, SETUP_MODULES } from '../../../ui/panels/mainDashboard.js';
import { renderConfigView } from '../../../services/configHubService.js';
import { handleWelcomeSelect } from '../../../services/welcomeConfigActions.js';
import { handleBirthdaySelect } from '../../../services/birthdayConfigActions.js';
import { handleVerificationConfigAction } from '../../../services/verificationConfigActions.js';
import { handleTicketConfigAction } from '../../../services/ticketConfigActions.js';
import { setTrackedBotIds } from '../../../services/musicTrackerService.js';
import { handleGuideSelect } from '../../../services/guideConfigActions.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';

const PANELS = {
  welcome: renderWelcomeSubPanel,
  verification: renderVerificationSubPanel,
  ticket: renderTicketSubPanel,
  birthday: renderBirthdaySubPanel,
  rules: renderRulesGuideSubPanel,
  booster: renderBoosterSubPanel,
  music: renderMusicSubPanel,
  circle: renderCircleSubPanel,
  moderation: renderModerationSubPanel,
};

async function render(client, guild, value) {
  const module = SETUP_MODULES.find((m) => m.value === value);
  if (!module) return renderMainDashboard(guild);
  if (module.kind === 'hub') return renderConfigView(client, guild, module.view);
  return PANELS[module.value](client, guild);
}

async function execute(interaction, client, [kind, ...rest] = []) {
  if (await denyIfNoSetupAccess(interaction)) return;
  if (kind === 'welcome') return handleWelcomeSelect(interaction, client, rest);
  if (kind === 'verif') return handleVerificationConfigAction(interaction, client);
  if (kind === 'ticket') return handleTicketConfigAction(interaction, client);
  if (kind === 'birthday') return handleBirthdaySelect(interaction, client, rest);
  if (kind === 'guide') return handleGuideSelect(interaction, client);
  if (kind === 'music') {
    const bots = interaction.values.filter((id) => interaction.users?.get(id)?.bot);
    await setTrackedBotIds(client, interaction.guildId, bots);
    return interaction.update(await renderMusicSubPanel(client, interaction.guild));
  }
  return interaction.update(await render(client, interaction.guild, interaction.values[0]));
}

// Nama lama (pacilSetupSelect) dipertahankan untuk panel yang sudah terpasang.
export default [
  { name: 'setup', execute },
  { name: 'pacilSetupSelect', execute },
];
