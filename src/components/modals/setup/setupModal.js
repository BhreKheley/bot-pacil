// Modal dashboard /pacilsetup. customId: setup:welcome:<aksi>
import { handleWelcomeModal } from '../../../services/welcomeConfigActions.js';
import { denyIfNoSetupAccess } from '../../../utils/setupGuard.js';

export default {
  name: 'setup',
  async execute(interaction, client, [kind, ...rest]) {
    if (await denyIfNoSetupAccess(interaction)) return;
    if (kind === 'welcome') return handleWelcomeModal(interaction, client, rest);
  },
};
