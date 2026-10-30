import { handleConfigInteraction } from '../../../services/configHubService.js';

// Hub /config (select): semua customId berawalan "pacilcfg".
export default {
  name: 'pacilcfg',
  execute: (interaction, client, args) => handleConfigInteraction(interaction, client, args),
};
