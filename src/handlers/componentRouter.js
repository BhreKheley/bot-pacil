// Router tunggal untuk komponen interaksi (tombol, menu pilihan, modal).
// Handler terdaftar per `name` (segmen pertama customId) di client.buttons / selectMenus / modals.
// customId global berbentuk "modul:aksi:arg"; ID tanpa ":" milik collector lokal dan diabaikan.

import { logger } from '../utils/logger.js';
import { handleApplicationModal } from '../commands/Community/apply.js';
import { createError, ErrorTypes, handleInteractionError } from '../utils/errorHandler.js';
import { isCollectorManagedComponent } from '../utils/collectorComponents.js';
import { runComponentGuarded } from '../utils/componentGuard.js';
import { withTraceContext } from '../utils/traceContext.js';

// Modal yang ditunggu langsung oleh command (awaitModalSubmit), bukan lewat registry.
const INLINE_MODAL_PREFIXES = ['app_review_', 'jtc_', 'config_wizard_modal:', 'log_dash_channel_modal:', 'log_dash_filter_modal:'];

const KINDS = {
  button: { registry: 'buttons', type: 'button', unavailable: 'Tombol ini sudah tidak aktif. Buka ulang panelnya ya.' },
  select: { registry: 'selectMenus', type: 'select_menu', unavailable: 'Menu ini sudah tidak aktif. Buka ulang panelnya ya.' },
  modal: { registry: 'modals', type: 'modal', unavailable: 'Formulir ini sudah tidak tersedia. Buka ulang panelnya ya.' },
};

function kindOf(interaction) {
  if (interaction.isButton()) return 'button';
  if (interaction.isAnySelectMenu()) return 'select';
  if (interaction.isModalSubmit()) return 'modal';
  return null;
}

function execute(interaction, trace, handlerName, run) {
  const context = withTraceContext({ type: KINDS[kindOf(interaction)].type, customId: interaction.customId, handler: handlerName }, trace);
  return runComponentGuarded(interaction, run).catch((error) => handleInteractionError(interaction, error, context));
}

/** Kembalikan true bila interaksi ditangani (atau sengaja diabaikan). */
export async function routeComponent(interaction, client, trace = {}) {
  const kind = kindOf(interaction);
  if (!kind) return false;
  const { registry, unavailable } = KINDS[kind];
  const customId = interaction.customId;

  // Kasus khusus lama yang tidak memakai pola modul:aksi.
  if (kind === 'button' && customId.startsWith('shared_todo_')) {
    const parts = customId.split('_');
    const handler = client.buttons.get(parts.slice(0, 3).join('_'));
    if (!handler) throw createError(`No button handler found for ${parts.slice(0, 3).join('_')}`, ErrorTypes.CONFIGURATION, unavailable, withTraceContext({ customId }, trace));
    await execute(interaction, trace, 'todo', () => handler.execute(interaction, client, [parts[3]]));
    return true;
  }
  if (kind === 'modal') {
    if (customId.startsWith('app_modal_')) {
      await execute(interaction, trace, 'application', () => handleApplicationModal(interaction));
      return true;
    }
    if (INLINE_MODAL_PREFIXES.some((prefix) => customId.startsWith(prefix))) {
      logger.debug(`Skipping modal handler lookup for inline-awaited modal: ${customId}`, { event: 'interaction.modal.inline_skipped', traceId: trace.traceId });
      return true;
    }
  }

  const [name, ...args] = customId.split(':');
  const handler = client[registry].get(name);
  if (!handler) {
    // Tanpa ":" = milik collector lokal; biarkan collector yang menjawab.
    if (!customId.includes(':') || (kind !== 'modal' && isCollectorManagedComponent(name))) return true;
    throw createError(`No ${kind} handler found for ${name}`, ErrorTypes.CONFIGURATION, unavailable, withTraceContext({ customId }, trace));
  }

  await execute(interaction, trace, 'general', () => handler.execute(interaction, client, args));
  return true;
}
