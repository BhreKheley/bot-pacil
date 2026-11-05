import { handleCustomRoleSelect } from '../../../services/customRoleService.js';

export default {
  name: 'crole',
  async execute(interaction, client, args) {
    return handleCustomRoleSelect(interaction, client, args[1] || args[0]);
  },
};
