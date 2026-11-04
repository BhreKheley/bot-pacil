import { PermissionFlagsBits } from 'discord.js';
import { composeCommand } from '../../utils/composeCommand.js';
import create from './modules/gcreate.js';
import end from './modules/gend.js';
import remove from './modules/gdelete.js';
import reroll from './modules/greroll.js';

export default composeCommand({
  name: 'giveaway',
  description: 'Kelola giveaway: buat, akhiri, hapus, atau undi ulang',
  category: 'giveaway',
  permissions: PermissionFlagsBits.ManageGuild,
  subs: { create, end, delete: remove, reroll },
});
