import { Events } from 'discord.js';
import { trackInviteChange } from '../services/inviteTracker.js';

export default {
  name: Events.InviteDelete,
  async execute(invite) {
    if (invite.guild) trackInviteChange(invite.guild.id, invite, true);
  },
};
