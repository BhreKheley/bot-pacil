import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export const MODAL_LIMITS = {
  TITLE_MAX: 45,
  LABEL_MAX: 45,
  PLACEHOLDER_MAX: 100,
  CUSTOM_ID_MAX: 100,
  VALUE_MAX: 4000,
};

// Global defensive hardening for Discord.js ModalBuilder and TextInputBuilder
// Guarantees no interaction in any command/panel will fail with RangeError [Invalid String Length]
if (TextInputBuilder?.prototype && !TextInputBuilder.prototype._patchedForSafety) {
  const origSetLabel = TextInputBuilder.prototype.setLabel;
  TextInputBuilder.prototype.setLabel = function (label) {
    return origSetLabel.call(this, String(label || '').slice(0, MODAL_LIMITS.LABEL_MAX));
  };

  const origSetPlaceholder = TextInputBuilder.prototype.setPlaceholder;
  TextInputBuilder.prototype.setPlaceholder = function (placeholder) {
    if (placeholder === null || placeholder === undefined) return this;
    return origSetPlaceholder.call(this, String(placeholder).slice(0, MODAL_LIMITS.PLACEHOLDER_MAX));
  };

  const origSetValue = TextInputBuilder.prototype.setValue;
  TextInputBuilder.prototype.setValue = function (value) {
    if (value === null || value === undefined) return this;
    const max = this.data?.max_length || MODAL_LIMITS.VALUE_MAX;
    return origSetValue.call(this, String(value).slice(0, max));
  };

  const origSetCustomId = TextInputBuilder.prototype.setCustomId;
  TextInputBuilder.prototype.setCustomId = function (id) {
    return origSetCustomId.call(this, String(id || '').slice(0, MODAL_LIMITS.CUSTOM_ID_MAX));
  };

  TextInputBuilder.prototype._patchedForSafety = true;
}

if (ModalBuilder?.prototype && !ModalBuilder.prototype._patchedForSafety) {
  const origSetTitle = ModalBuilder.prototype.setTitle;
  ModalBuilder.prototype.setTitle = function (title) {
    return origSetTitle.call(this, String(title || '').slice(0, MODAL_LIMITS.TITLE_MAX));
  };

  const origSetCustomId = ModalBuilder.prototype.setCustomId;
  ModalBuilder.prototype.setCustomId = function (id) {
    return origSetCustomId.call(this, String(id || '').slice(0, MODAL_LIMITS.CUSTOM_ID_MAX));
  };

  ModalBuilder.prototype._patchedForSafety = true;
}

/**
 * Creates a safely truncated TextInputBuilder component row.
 * Guarantees that Discord limits (label <= 45, placeholder <= 100, customId <= 100) are never exceeded.
 */
export function safeTextInputRow({
  id,
  label,
  style = TextInputStyle.Short,
  value,
  placeholder,
  max,
  min,
  required = false,
}) {
  const safeId = String(id || '').slice(0, MODAL_LIMITS.CUSTOM_ID_MAX);
  const safeLabel = String(label || '').slice(0, MODAL_LIMITS.LABEL_MAX);
  const safeStyle = style ?? TextInputStyle.Short;

  const input = new TextInputBuilder()
    .setCustomId(safeId)
    .setLabel(safeLabel)
    .setStyle(safeStyle)
    .setRequired(Boolean(required));

  if (value !== undefined && value !== null && String(value).length > 0) {
    const safeMax = max ? Math.min(max, MODAL_LIMITS.VALUE_MAX) : MODAL_LIMITS.VALUE_MAX;
    input.setValue(String(value).slice(0, safeMax));
  }

  if (placeholder) {
    input.setPlaceholder(String(placeholder).slice(0, MODAL_LIMITS.PLACEHOLDER_MAX));
  }

  if (typeof max === 'number' && max > 0) {
    input.setMaxLength(Math.min(max, MODAL_LIMITS.VALUE_MAX));
  }

  if (typeof min === 'number' && min >= 0) {
    input.setMinLength(min);
  }

  return new ActionRowBuilder().addComponents(input);
}

/**
 * Creates a safely truncated ModalBuilder.
 */
export function safeModal({ customId, title, rows = [] }) {
  const safeId = String(customId || '').slice(0, MODAL_LIMITS.CUSTOM_ID_MAX);
  const safeTitle = String(title || '').slice(0, MODAL_LIMITS.TITLE_MAX);

  const modal = new ModalBuilder().setCustomId(safeId).setTitle(safeTitle);
  if (Array.isArray(rows) && rows.length > 0) {
    modal.addComponents(rows.slice(0, 5));
  }
  return modal;
}
