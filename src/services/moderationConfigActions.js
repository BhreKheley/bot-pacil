// Aksi konfigurasi Moderasi dari panel /pacilsetup: setup:moderation:<dm|esc|thresholds> + modal setup:moderation:thresholds.
import { MessageFlags, TextInputStyle } from 'discord.js';
import { ESCALATION_LIMITS, getModerationPolicy, saveModerationPolicy } from './moderation/moderationPolicy.js';
import { renderModerationSubPanel } from '../ui/panels/moderationSubPanel.js';
import { safeModal, safeTextInputRow } from '../utils/modalHelper.js';

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
    const modal = safeModal({
      customId: 'setup:moderation:thresholds',
      title: 'Batas Eskalasi Peringatan',
      rows: [
        safeTextInputRow({
          id: 'timeoutAt',
          label: `Timeout pd warn ke- (0=mati, maks ${ESCALATION_LIMITS.maxWarns})`,
          style: TextInputStyle.Short,
          required: true,
          max: 5,
          value: policy.escalation.timeoutAt,
        }),
        safeTextInputRow({
          id: 'timeoutMinutes',
          label: `Lama timeout, mnt (1-${ESCALATION_LIMITS.maxTimeoutMinutes})`,
          style: TextInputStyle.Short,
          required: true,
          max: 5,
          value: policy.escalation.timeoutMinutes,
        }),
        safeTextInputRow({
          id: 'kickAt',
          label: `Kick pd warn ke- (0=mati, maks ${ESCALATION_LIMITS.maxWarns})`,
          style: TextInputStyle.Short,
          required: true,
          max: 5,
          value: policy.escalation.kickAt,
        }),
      ],
    });
    return interaction.showModal(modal);
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
