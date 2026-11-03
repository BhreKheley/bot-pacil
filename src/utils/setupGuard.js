// Penjaga akses dashboard /pacilsetup: hanya Administrator (atau pemilik bot).

import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { isBotOwner } from '../config/bot.js';

export const SETUP_DENIED_MESSAGE = 'Dashboard ini hanya untuk **Administrator** server.';

export function hasSetupAccess(interaction) {
  if (!interaction?.guild) return false;
  return Boolean(
    isBotOwner(interaction.user?.id)
    || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator),
  );
}

/** Balas penolakan ephemeral. Kembalikan true bila akses DITOLAK (pemanggil harus berhenti). */
export async function denyIfNoSetupAccess(interaction) {
  if (hasSetupAccess(interaction)) return false;
  const payload = { content: `❌ ${SETUP_DENIED_MESSAGE}`, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
  else await interaction.reply(payload).catch(() => null);
  return true;
}
