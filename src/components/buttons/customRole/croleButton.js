import { handleCustomRoleButton } from '../../../services/customRoleService.js';

export default {
  name: 'crole',
  async execute(interaction, client, args) {
    return handleCustomRoleButton(interaction, client, args[0]);
  },
};
