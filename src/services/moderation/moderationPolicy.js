// Kebijakan moderasi per server (dapat diubah di /pacilsetup → Moderasi):
// DM ke member saat dikenai tindakan, dan eskalasi otomatis dari jumlah peringatan.

import { buildPacilEmbed } from '../../ui/pacil.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';

export const MODERATION_DEFAULTS = Object.freeze({
  dmOnAction: true,
  escalation: Object.freeze({ enabled: false, timeoutAt: 3, timeoutMinutes: 60, kickAt: 0 }),
});
export const ESCALATION_LIMITS = Object.freeze({ maxWarns: 20, maxTimeoutMinutes: 40320 }); // 28 hari (batas Discord)

const key = (guildId) => `guild:${guildId}:moderation_policy`;

export async function getModerationPolicy(client, guildId) {
  const saved = (await client.db.get(key(guildId), {})) ?? {};
  return {
    ...MODERATION_DEFAULTS,
    ...saved,
    escalation: { ...MODERATION_DEFAULTS.escalation, ...(saved.escalation ?? {}) },
  };
}

export async function saveModerationPolicy(client, guildId, changes) {
  const current = await getModerationPolicy(client, guildId);
  const next = { ...current, ...changes, escalation: { ...current.escalation, ...(changes.escalation ?? {}) } };
  await client.db.set(key(guildId), next);
  return next;
}

const ACTION_LABEL = { warn: 'Peringatan', timeout: 'Timeout', kick: 'Dikeluarkan (Kick)', ban: 'Dibanned' };

/** DM ke member yang dikenai tindakan. Gagal DM (DM tertutup) tidak boleh menggagalkan tindakan. */
export async function notifyModerationTarget({ guild, user, action, reason, detail, policy }) {
  try {
    const p = policy ?? await getModerationPolicy(guild.client, guild.id);
    if (!p.dmOnAction || !user || user.bot) return false;
    const embed = buildPacilEmbed({
      title: `${ACTION_LABEL[action] ?? 'Tindakan Moderasi'} di ${guild.name}`,
      description: 'Pesan otomatis dari moderator server.',
      tone: action === 'warn' ? 'warning' : 'error',
      fields: [
        { name: 'Alasan', value: reason || 'Tidak disebutkan', inline: false },
        ...(detail ? [{ name: 'Detail', value: detail, inline: false }] : []),
      ],
    });
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Eskalasi otomatis setelah peringatan baru. Mengembalikan catatan teks (atau null) untuk ditampilkan ke moderator.
 * Urutan: kick (jika kickAt tercapai) lebih berat daripada timeout.
 */
export async function applyWarnEscalation({ guild, member, totalCount, policy, reason }) {
  const esc = policy.escalation;
  if (!esc?.enabled || !member) return null;
  const botTag = guild.client.user?.tag ?? 'Pacil Bot';
  try {
    if (esc.kickAt > 0 && totalCount >= esc.kickAt) {
      if (!member.kickable) return `⚠️ Eskalasi: batas kick (${esc.kickAt}) tercapai, tetapi bot tidak bisa mengeluarkan member ini.`;
      await notifyModerationTarget({ guild, user: member.user, action: 'kick', reason: `Mencapai ${totalCount} peringatan`, policy });
      await member.kick(`Eskalasi otomatis: ${totalCount} peringatan`);
      await logModerationAction({ client: guild.client, guild, event: {
        action: 'Member Kicked', target: `${member.user.tag} (${member.id})`, executor: `${botTag} (otomatis)`,
        reason: `Eskalasi otomatis: ${totalCount} peringatan. Terakhir: ${reason}`, metadata: { userId: member.id, auto: true },
      } });
      return `🤖 Eskalasi otomatis: member **dikeluarkan** karena mencapai ${totalCount} peringatan.`;
    }
    if (esc.timeoutAt > 0 && totalCount >= esc.timeoutAt) {
      if (!member.moderatable) return `⚠️ Eskalasi: batas timeout (${esc.timeoutAt}) tercapai, tetapi bot tidak bisa men-timeout member ini.`;
      await notifyModerationTarget({ guild, user: member.user, action: 'timeout', reason: `Mencapai ${totalCount} peringatan`, detail: `Durasi: ${esc.timeoutMinutes} menit`, policy });
      await member.timeout(esc.timeoutMinutes * 60_000, `Eskalasi otomatis: ${totalCount} peringatan`);
      await logModerationAction({ client: guild.client, guild, event: {
        action: 'Member Timed Out', target: `${member.user.tag} (${member.id})`, executor: `${botTag} (otomatis)`,
        reason: `Eskalasi otomatis: ${totalCount} peringatan. Terakhir: ${reason}`, duration: `${esc.timeoutMinutes} menit`, metadata: { userId: member.id, auto: true },
      } });
      return `🤖 Eskalasi otomatis: member di-**timeout ${esc.timeoutMinutes} menit** karena mencapai ${totalCount} peringatan.`;
    }
  } catch (error) {
    logger.warn('Eskalasi peringatan gagal:', error);
    return '⚠️ Eskalasi otomatis gagal dijalankan (lihat log bot).';
  }
  return null;
}
