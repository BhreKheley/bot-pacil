// Penjaga interaksi komponen (tombol, menu, modal).
// 1) Watchdog ACK: Discord menutup interaksi yang tidak dijawab dalam 3 detik. Bila handler belum
//    merespons setelah ACK_AFTER_MS, interaksi di-defer otomatis supaya pengguna tidak melihat
//    "interaksi gagal". `update()` dialihkan ke `editReply()` karena sudah di-defer.
// 2) Batas waktu handler: handler yang menggantung tidak dibiarkan diam; pengguna diberi tahu
//    dan kejadian dicatat di log.

import { MessageFlags } from 'discord.js';
import { logger } from './logger.js';

export const COMPONENT_ACK_AFTER_MS = 2500;
export const COMPONENT_TIMEOUT_MS = 60_000;
export const COMPONENT_TIMEOUT_MESSAGE = '⌛ Prosesnya terlalu lama dan dihentikan. Coba lagi, atau buka ulang panelnya.';

const alreadyAnswered = (interaction) => Boolean(interaction.deferred || interaction.replied);

/** ACK otomatis. Mengembalikan true bila berhasil men-defer. */
export async function autoAcknowledge(interaction) {
  if (alreadyAnswered(interaction)) return false;
  try {
    const fromMessage = typeof interaction.isFromMessage === 'function' && interaction.isFromMessage();
    const isModal = typeof interaction.isModalSubmit === 'function' && interaction.isModalSubmit();
    if (isModal && !fromMessage) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    else await interaction.deferUpdate();
    interaction.update = (payload) => interaction.editReply(payload);
    interaction.__autoAcknowledged = true;
    return true;
  } catch (error) {
    logger.debug(`ACK otomatis gagal untuk ${interaction.customId}: ${error?.message || error}`);
    return false;
  }
}

/** Beri tahu pengguna bahwa proses habis waktu. Tidak pernah melempar error. */
export async function notifyComponentTimeout(interaction, message = COMPONENT_TIMEOUT_MESSAGE) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  try {
    if (alreadyAnswered(interaction)) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch (error) {
    logger.debug(`Pesan timeout komponen gagal terkirim: ${error?.message || error}`);
  }
}

/**
 * Jalankan handler dengan watchdog ACK dan batas waktu.
 * Error dari handler dilempar ulang agar ditangani handleInteractionError.
 */
export async function runComponentGuarded(interaction, work, {
  ackAfterMs = COMPONENT_ACK_AFTER_MS,
  timeoutMs = COMPONENT_TIMEOUT_MS,
  label = interaction?.customId ?? 'komponen',
} = {}) {
  let ackTimer = null;
  let hardTimer = null;
  let timedOut = false;

  ackTimer = setTimeout(() => { void autoAcknowledge(interaction); }, ackAfterMs);

  const timeout = new Promise((resolve) => {
    hardTimer = setTimeout(() => { timedOut = true; resolve('timeout'); }, timeoutMs);
  });

  try {
    const outcome = await Promise.race([Promise.resolve().then(work).then(() => 'done'), timeout]);
    if (outcome === 'timeout' && timedOut) {
      logger.warn(`Handler komponen melewati batas ${timeoutMs}ms: ${label}`, {
        event: 'interaction.component.timeout', customId: interaction?.customId, guildId: interaction?.guildId, userId: interaction?.user?.id,
      });
      await notifyComponentTimeout(interaction);
    }
    return outcome;
  } finally {
    clearTimeout(ackTimer);
    clearTimeout(hardTimer);
  }
}
