import { PermissionFlagsBits } from 'discord.js';
import { composeCommand } from '../../utils/composeCommand.js';
import lock from './modules/lock.js';
import unlock from './modules/unlock.js';

export default composeCommand({
  name: 'lock',
  description: 'Kunci atau buka kunci channel ini',
  category: 'moderation',
  permissions: PermissionFlagsBits.ManageChannels,
  subs: { on: lock, off: unlock },
});
