// Modal dashboard /pacilsetup. customId: setup:welcome:<aksi>
import { handleWelcomeModal } from '../../../services/welcomeConfigActions.js';
import { handleBoosterModal } from '../../../services/boosterConfigActions.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';

export default {
  name: 'setup',
  async execute(interaction, client, [kind, ...rest]) {
    if (await denyIfNoSetupAccess(interaction)) return;
    if (kind === 'booster') return handleBoosterModal(interaction, client, rest);
    if (kind === 'welcome') return handleWelcomeModal(interaction, client, rest);
  },
};
