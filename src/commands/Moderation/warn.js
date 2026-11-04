import { PermissionFlagsBits } from 'discord.js';
import { composeCommand } from '../../utils/composeCommand.js';
import warn from './modules/warn.js';
import warnings from './modules/warnings.js';

export default composeCommand({
  name: 'warn',
  description: 'Beri peringatan atau lihat riwayat peringatan member',
  category: 'moderation',
  permissions: PermissionFlagsBits.ModerateMembers,
  subs: { add: warn, list: warnings },
});
