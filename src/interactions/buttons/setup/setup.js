// Router tombol dashboard /pacilsetup. customId: setup:back | setup:act:<aksi>
// Nama lama (setupBackMain, setupAction) tetap terdaftar agar panel yang sudah terpasang di server tetap jalan.

import { renderMainDashboard } from '../../../components/panels/mainDashboard.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';
import { handleSetupAction } from './setupActions.js';

async function route(interaction, client, [kind, action]) {
  if (await denyIfNoSetupAccess(interaction)) return;
  if (kind === 'back') return interaction.update(renderMainDashboard(interaction.guild));
  if (kind === 'act') return handleSetupAction(interaction, client, action);
}

export default [
  { name: 'setup', execute: route },
  { name: 'setupBackMain', execute: (interaction, client) => route(interaction, client, ['back']) },
  { name: 'setupAction', execute: (interaction, client, [action]) => route(interaction, client, ['act', action]) },
];
