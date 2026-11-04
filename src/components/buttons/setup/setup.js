// Router tombol dashboard /pacilsetup. customId: setup:back | setup:act:<aksi>
// Nama lama (setupBackMain, setupAction) tetap terdaftar agar panel yang sudah terpasang di server tetap jalan.

import { renderMainDashboard } from '../../../ui/panels/mainDashboard.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';
import { handleSetupAction } from '../../../services/setupActions.js';
import { handleModerationButton } from '../../../services/moderationConfigActions.js';
import { handleBoosterButton } from '../../../services/boosterConfigActions.js';
import { handleWelcomeButton } from '../../../services/welcomeConfigActions.js';

async function route(interaction, client, [kind, action, arg]) {
  if (await denyIfNoSetupAccess(interaction)) return;
  if (kind === 'back') return interaction.update(renderMainDashboard(interaction.guild));
  if (kind === 'moderation') return handleModerationButton(interaction, client, [action]);
  if (kind === 'booster') return handleBoosterButton(interaction, client, [action]);
  if (kind === 'welcome') return handleWelcomeButton(interaction, client, [action, arg]);
  if (kind === 'act') return handleSetupAction(interaction, client, action);
}

export default [
  { name: 'setup', execute: route },
  { name: 'setupBackMain', execute: (interaction, client) => route(interaction, client, ['back']) },
  { name: 'setupAction', execute: (interaction, client, [action]) => route(interaction, client, ['act', action]) },
];
