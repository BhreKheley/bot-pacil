// Izin per command (role, channel, cooldown) yang disimpan di guildConfig.commandPolicies.

import { PermissionFlagsBits } from 'discord.js';
import { Mutex } from '../utils/mutex.js';
import { getGuildConfig, updateGuildConfig } from './config/guildConfig.js';
import { isBotOwner } from '../config/bot.js';
import {
  applyPolicyPatch, clearPolicy, cooldownExpiry, cooldownRemainingMs, evaluateAccess, findPolicy,
  formatCooldown,
} from './commandPolicyLogic.js';

const lockKey = (guildId) => `guildcfg:${guildId}`;

export const getPolicies = (guildConfig) => guildConfig?.commandPolicies ?? {};

/** Ubah peta kebijakan secara atomik per server. `mutate(policies)` mengembalikan peta baru. */
export async function updatePolicies(client, guildId, mutate) {
  return Mutex.runExclusive(lockKey(guildId), async () => {
    const config = await getGuildConfig(client, guildId);
    const next = mutate(getPolicies(config));
    await updateGuildConfig(client, guildId, { commandPolicies: next });
    return next;
  });
}

export const patchPolicy = (client, guildId, commandKey, patch) =>
  updatePolicies(client, guildId, (policies) => applyPolicyPatch(policies, commandKey, patch));

export const resetPolicy = (client, guildId, commandKey) =>
  updatePolicies(client, guildId, (policies) => clearPolicy(policies, commandKey));

function memberRoleIds(member) {
  if (!member?.roles) return [];
  return Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
}

/**
 * Terapkan kebijakan command. Mengembalikan null bila boleh, atau teks penolakan untuk pengguna.
 * Pengurus server (Manage Server / Administrator) dan pemilik bot tidak dibatasi.
 */
export function enforceCommandPolicy(interaction, guildConfig, accessKey, client, now = Date.now()) {
  if (!interaction.guildId) return null;
  const found = findPolicy(getPolicies(guildConfig), accessKey);
  if (!found) return null;

  const perms = interaction.memberPermissions;
  const isManager = isBotOwner(interaction.user.id)
    || Boolean(perms?.has(PermissionFlagsBits.ManageGuild) || perms?.has(PermissionFlagsBits.Administrator));

  const channel = interaction.channel;
  const isThread = typeof channel?.isThread === 'function' && channel.isThread();
  const verdict = evaluateAccess(found.policy, {
    roleIds: memberRoleIds(interaction.member),
    channelId: interaction.channelId,
    parentId: isThread ? channel.parentId : null,
    categoryId: isThread ? channel.parent?.parentId ?? null : channel?.parentId ?? null,
    isManager,
  });
  if (!verdict.ok) {
    return verdict.reason === 'channel'
      ? `Command \`/${accessKey}\` tidak bisa dipakai di channel ini. Coba di ${found.policy.allowedChannels.slice(0, 3).map((id) => `<#${id}>`).join(', ')}.`
      : `Command \`/${accessKey}\` hanya untuk role tertentu di server ini. Kalau merasa harusnya bisa, tanya pengurus ya.`;
  }

  if (found.policy.cooldownSeconds > 0 && !isManager) {
    const key = `policy:${interaction.guildId}:${interaction.user.id}:${found.key}`;
    const left = cooldownRemainingMs(client.cooldowns.get(key), now);
    if (left > 0) return `Sabar dulu ya, \`/${accessKey}\` bisa dipakai lagi dalam ${formatCooldown(Math.ceil(left / 1000))}.`;
    client.cooldowns.set(key, cooldownExpiry(found.policy.cooldownSeconds, now));
  }
  return null;
}
