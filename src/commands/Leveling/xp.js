import { PermissionFlagsBits } from 'discord.js';
import { composeCommand } from '../../utils/composeCommand.js';
import add from './modules/leveladd.js';
import set from './modules/levelset.js';
import remove from './modules/levelremove.js';

const xpCmd = composeCommand({
  name: 'xp',
  description: 'Atur level member: tambah, set, atau kurangi',
  category: 'leveling',
  permissions: PermissionFlagsBits.ManageGuild,
  subs: { add, set, remove },
});

export default {
  ...xpCmd,
  register: false,
};
