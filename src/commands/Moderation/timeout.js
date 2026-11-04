import { PermissionFlagsBits } from 'discord.js';
import { composeCommand } from '../../utils/composeCommand.js';
import timeout from './modules/timeout.js';
import untimeout from './modules/untimeout.js';

export default composeCommand({
  name: 'timeout',
  description: 'Beri atau cabut timeout member',
  category: 'moderation',
  permissions: PermissionFlagsBits.ModerateMembers,
  subs: { set: timeout, remove: untimeout },
});
