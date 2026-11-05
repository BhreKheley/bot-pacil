import { handleCustomRoleModal } from '../../../services/customRoleService.js';

export default {
  name: 'crole',
  async execute(interaction, client, args) {
    return handleCustomRoleModal(interaction, client, args[1] || args[0]);
  },
};
