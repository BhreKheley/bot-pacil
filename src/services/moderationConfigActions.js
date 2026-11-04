// Aksi konfigurasi Moderasi dari panel /pacilsetup: setup:moderation:<dm|esc|thresholds> + modal setup:moderation:thresholds.
import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ESCALATION_LIMITS, getModerationPolicy, saveModerationPolicy } from './moderation/moderationPolicy.js';
import { renderModerationSubPanel } from '../ui/panels/moderationSubPanel.js';

export async function handleModerationButton(interaction, client, [action]) {
  const policy = await getModerationPolicy(client, interaction.guildId);
  if (action === 'dm') {
    await saveModerationPolicy(client, interaction.guildId, { dmOnAction: !policy.dmOnAction });
    return interaction.update(await renderModerationSubPanel(client, interaction.guild));
  }
  if (action === 'esc') {
    const esc = policy.escalation;
    if (!esc.enabled && !(esc.timeoutAt > 0 || esc.kickAt > 0)) {
      return interaction.update(await renderModerationSubPanel(client, interaction.guild, { notice: '⚠️ Atur batas peringatan dulu sebelum mengaktifkan eskalasi.' }));
    }
    await saveModerationPolicy(client, interaction.guildId, { escalation: { enabled: !esc.enabled } });
    return interaction.update(await renderModerationSubPanel(client, interaction.guild));
  }
  if (action === 'thresholds') {
    const field = (id, label, value) => new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5).setValue(String(value)));
    return interaction.showModal(new ModalBuilder().setCustomId('setup:moderation:thresholds').setTitle('Batas Eskalasi Peringatan').addComponents(
      field('timeoutAt', `Timeout pada peringatan ke- (0 = mati, maks ${ESCALATION_LIMITS.maxWarns})`, policy.escalation.timeoutAt),
      field('timeoutMinutes', `Lama timeout, menit (1–${ESCALATION_LIMITS.maxTimeoutMinutes})`, policy.escalation.timeoutMinutes),
      field('kickAt', `Kick pada peringatan ke- (0 = mati, maks ${ESCALATION_LIMITS.maxWarns})`, policy.escalation.kickAt),
    ));
  }
}

export async function handleModerationModal(interaction, client, [action]) {
  if (action !== 'thresholds') return;
  const num = (id) => Number(interaction.fields.getTextInputValue(id));
  const timeoutAt = num('timeoutAt'); const kickAt = num('kickAt'); const timeoutMinutes = num('timeoutMinutes');
  const bad = (v, min, max) => !Number.isInteger(v) || v < min || v > max;
  const error = bad(timeoutAt, 0, ESCALATION_LIMITS.maxWarns) || bad(kickAt, 0, ESCALATION_LIMITS.maxWarns)
    ? `Batas peringatan harus bilangan bulat 0–${ESCALATION_LIMITS.maxWarns}.`
    : bad(timeoutMinutes, 1, ESCALATION_LIMITS.maxTimeoutMinutes) ? `Lama timeout harus 1–${ESCALATION_LIMITS.maxTimeoutMinutes} menit.`
    : kickAt > 0 && timeoutAt > 0 && kickAt <= timeoutAt ? 'Batas kick harus lebih besar daripada batas timeout.' : null;
  if (error) return interaction.reply({ content: `❌ ${error}`, flags: MessageFlags.Ephemeral });
  await saveModerationPolicy(client, interaction.guildId, { escalation: { timeoutAt, timeoutMinutes, kickAt } });
  const payload = await renderModerationSubPanel(client, interaction.guild, { notice: '✅ Batas eskalasi tersimpan.' });
  return interaction.isFromMessage?.() ? interaction.update(payload) : interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}
