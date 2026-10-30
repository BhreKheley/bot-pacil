// Catatan: patchPolicy/resetPolicy sudah mengunci per server di dalamnya; jangan dibungkus Mutex
// dengan kunci yang sama (Mutex tidak reentrant dan akan menggantung).
// Hub /config: ambil data, render view, dan jalankan aksi komponennya.
// Tampilan murni ada di src/ui/configHub.js; logika izin murni di commandPolicyLogic.js.

import { MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Mutex } from '../utils/mutex.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, patchGuildConfig } from './config/guildConfig.js';
import { getConfessionConfig } from './confessionService.js';
import { clampReplyCooldown } from './confessionLogic.js';
import { listStickies } from './stickyService.js';
import { STICKY_LIMITS } from './stickyLogic.js';
import { getJoinToCreateConfig } from '../utils/database.js';
import { buildCommandRegistry, isProtectedCommand } from './commandAccessService.js';
import { getPolicies, patchPolicy, resetPolicy } from './commandPolicyService.js';
import { formatCooldown, normalizeCommandKey, parseCooldownInput } from './commandPolicyLogic.js';
import {
  accessView, cid, homeView, jtcView, menfessView, otherView, permCategoryView, permCommandsView,
  policyView, stickyView,
} from '../ui/configHub.js';

const ephemeral = { flags: MessageFlags.Ephemeral };
export const configLockKey = (guildId) => `guildcfg:${guildId}`;

const truthyCount = (record) => Object.values(record ?? {}).filter(Boolean).length;

/** Cari command (termasuk subcommand) di registry. */
function findCommand(registry, commandKey) {
  const key = normalizeCommandKey(commandKey);
  for (const category of registry.values()) {
    const command = category.commands.find((c) => c.name.toLowerCase() === key);
    if (command) return { category, command };
  }
  return null;
}

/** Render satu view hub. `opts`: { categoryKey, page, commandKey, notice } */
export async function renderConfigView(client, guild, view, opts = {}) {
  const { notice } = opts;
  if (view === 'menfess') {
    return menfessView({ config: getConfessionConfig(await getGuildConfig(client, guild.id)), notice });
  }
  if (view === 'sticky') {
    return stickyView({ stickies: await listStickies(client, guild.id), limit: STICKY_LIMITS.maxPerGuild, notice });
  }
  if (view === 'jtc') {
    const jtc = await getJoinToCreateConfig(client, guild.id);
    return jtcView({ triggers: jtc.triggerChannels ?? [], activeRooms: Object.keys(jtc.temporaryChannels ?? {}).length, notice });
  }
  if (view === 'access') {
    const config = await getGuildConfig(client, guild.id);
    return accessView({ disabledCommands: truthyCount(config.disabledCommands), disabledCategories: truthyCount(config.disabledCategories), notice });
  }
  if (view === 'other') return otherView({ notice });

  if (view === 'perm' || view === 'permcmds' || view === 'policy') {
    const config = await getGuildConfig(client, guild.id);
    const policies = getPolicies(config);
    const registry = buildCommandRegistry(client);

    if (view === 'perm') {
      const categories = [...registry.values()]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((c) => ({
          key: c.key, displayName: c.displayName, icon: c.icon, count: c.commands.length,
          restricted: c.commands.filter((cmd) => policies[cmd.name.toLowerCase()]).length,
        }));
      return permCategoryView({ categories, notice });
    }
    if (view === 'permcmds') {
      const category = registry.get(opts.categoryKey);
      if (!category) return permCategoryView({ categories: [], notice: notice ?? 'Kategori tidak ditemukan.' });
      return permCommandsView({ category, page: opts.page ?? 0, restrictedKeys: Object.keys(policies), notice });
    }
    const found = findCommand(registry, opts.commandKey);
    if (!found) return renderConfigView(client, guild, 'perm', { notice: 'Command tidak ditemukan.' });
    return policyView({
      commandKey: found.command.name,
      description: found.command.description,
      categoryKey: found.category.key,
      policy: policies[found.command.name.toLowerCase()],
      isProtected: isProtectedCommand(found.command.name.split(' ')[0]),
      notice,
    });
  }
  return homeView({ guildName: guild.name, notice });
}

/** Bot butuh izin ini untuk memposting menfess; kembalikan nama izin yang kurang. */
function missingPostPermissions(guild, channel, { needsThreads = false } = {}) {
  const me = guild.members.me;
  const perms = me && channel?.permissionsFor?.(me);
  if (!perms) return [];
  const needed = [
    [PermissionFlagsBits.ViewChannel, 'Lihat Channel'],
    [PermissionFlagsBits.SendMessages, 'Kirim Pesan'],
    [PermissionFlagsBits.EmbedLinks, 'Sematkan Tautan'],
  ];
  if (needsThreads) needed.push([PermissionFlagsBits.CreatePublicThreads, 'Buat Thread Publik'], [PermissionFlagsBits.SendMessagesInThreads, 'Kirim Pesan di Thread']);
  return needed.filter(([flag]) => !perms.has(flag)).map(([, name]) => name);
}

const saveConfession = (client, guildId, current, patch) =>
  Mutex.runExclusive(configLockKey(guildId), () => patchGuildConfig(client, guildId, { confessions: { ...current, ...patch } }));

function cooldownModal(customId, title, inputs) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  for (const input of inputs) {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(input.id).setLabel(input.label).setStyle(TextInputStyle.Short)
        .setRequired(true).setMinLength(1).setMaxLength(input.max ?? 6).setValue(String(input.value ?? '')),
    ));
  }
  return modal;
}

const VIEWS = new Set(['home', 'menfess', 'sticky', 'jtc', 'perm', 'access', 'other']);

/** Titik masuk semua komponen hub (tombol, menu, modal). `args` = customId tanpa awalan "pacilcfg". */
export async function handleConfigInteraction(interaction, client, args) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || !interaction.guild) {
    return interaction.reply({ content: 'Kamu perlu izin **Manage Server** untuk memakai pengaturan ini.', ...ephemeral });
  }
  const guild = interaction.guild;
  const [action, ...rest] = args;
  const show = async (view, opts) => interaction.update(await renderConfigView(client, guild, view, opts));

  try {
    if (action === 'go') {
      const view = interaction.isStringSelectMenu() ? interaction.values[0] : rest[0];
      return show(VIEWS.has(view) ? view : 'home');
    }

    // ----- Menfess -----
    if (action === 'mf') {
      const config = getConfessionConfig(await getGuildConfig(client, guild.id));
      const what = rest[0];
      if (what === 'cooldown') {
        return interaction.showModal(cooldownModal(cid('mfcdm'), 'Jeda Menfess', [
          { id: 'minutes', label: 'Jeda kirim menfess (menit, 0–1440)', value: config.cooldownMinutes, max: 4 },
          { id: 'seconds', label: 'Jeda balasan (detik, 0–3600)', value: config.replyCooldownSeconds, max: 4 },
        ]));
      }
      if (what === 'enabled') {
        if (!config.enabled && !config.channelId) return show('menfess', { notice: '⚠️ Pilih channel publik dulu sebelum mengaktifkan menfess.' });
        await saveConfession(client, guild.id, config, { enabled: !config.enabled });
      } else if (what === 'approval') {
        if (!config.requireApproval && !config.reviewChannelId) return show('menfess', { notice: '⚠️ Pilih channel review dulu sebelum mewajibkan persetujuan moderator.' });
        await saveConfession(client, guild.id, config, { requireApproval: !config.requireApproval });
      } else if (what === 'replies') {
        await saveConfession(client, guild.id, config, { repliesEnabled: !config.repliesEnabled });
      }
      return show('menfess');
    }

    if (action === 'mfcdm') {
      const config = getConfessionConfig(await getGuildConfig(client, guild.id));
      const minutes = Number(interaction.fields.getTextInputValue('minutes').trim());
      const seconds = Number(interaction.fields.getTextInputValue('seconds').trim());
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440 || !Number.isFinite(seconds)) {
        return show('menfess', { notice: '⚠️ Jeda tidak valid. Menit harus 0–1440 dan detik berupa angka.' });
      }
      await saveConfession(client, guild.id, config, { cooldownMinutes: minutes, replyCooldownSeconds: clampReplyCooldown(seconds) });
      return show('menfess', { notice: '✅ Jeda menfess diperbarui.' });
    }

    if (action === 'mfch') {
      const field = rest[0];
      if (!['channelId', 'reviewChannelId'].includes(field)) return interaction.deferUpdate();
      const config = getConfessionConfig(await getGuildConfig(client, guild.id));
      const id = interaction.values[0] ?? null;
      if (id) {
        const missing = missingPostPermissions(guild, interaction.channels.get(id), { needsThreads: field === 'channelId' });
        if (missing.length) return show('menfess', { notice: `⚠️ Bot belum punya izin di <#${id}>: ${missing.join(', ')}. Perbaiki izinnya lalu pilih lagi.` });
      }
      const patch = { [field]: id };
      let notice = '';
      if (!id && field === 'channelId' && config.enabled) { patch.enabled = false; notice = 'ℹ️ Channel publik dikosongkan, jadi menfess dinonaktifkan.'; }
      if (!id && field === 'reviewChannelId' && config.requireApproval) { patch.requireApproval = false; notice = 'ℹ️ Channel review dikosongkan, jadi persetujuan moderator dimatikan.'; }
      await saveConfession(client, guild.id, config, patch);
      return show('menfess', { notice });
    }

    if (action === 'mfrole') {
      const config = getConfessionConfig(await getGuildConfig(client, guild.id));
      await saveConfession(client, guild.id, config, { moderatorRoleId: interaction.values[0] ?? null });
      return show('menfess');
    }

    // ----- Izin command -----
    if (action === 'permcat') return show('permcmds', { categoryKey: interaction.values[0], page: 0 });
    if (action === 'permpg') return show('permcmds', { categoryKey: rest[0], page: Number(rest[1]) || 0 });
    if (action === 'permcmd') return show('policy', { commandKey: interaction.values[0] });
    if (action === 'permback') return rest[0] ? show('permcmds', { categoryKey: rest[0], page: 0 }) : show('perm');

    if (['prole', 'pchan', 'pcd', 'pcdm', 'preset'].includes(action)) {
      const commandKey = rest.join(':');
      const found = findCommand(buildCommandRegistry(client), commandKey);
      if (!found) return show('perm', { notice: '⚠️ Command tidak ditemukan.' });
      const key = found.command.name;
      if (isProtectedCommand(key.split(' ')[0])) return show('policy', { commandKey: key, notice: '⚠️ Command ini dilindungi dan tidak bisa dibatasi.' });

      const policies = getPolicies(await getGuildConfig(client, guild.id));
      const current = policies[key.toLowerCase()] ?? {};

      if (action === 'prole') {
        await patchPolicy(client, guild.id, key, { allowedRoles: interaction.values.filter((id) => id !== guild.id) });
        return show('policy', { commandKey: key });
      }
      if (action === 'pchan') {
        await patchPolicy(client, guild.id, key, { allowedChannels: interaction.values });
        return show('policy', { commandKey: key });
      }
      if (action === 'pcd') {
        return interaction.showModal(cooldownModal(cid('pcdm', key), 'Cooldown Command', [
          { id: 'value', label: 'Jeda per orang (detik, atau 1m30s, 2h; 0 = mati)', value: current.cooldownSeconds ?? 0, max: 10 },
        ]));
      }
      if (action === 'pcdm') {
        const seconds = parseCooldownInput(interaction.fields.getTextInputValue('value'));
        if (seconds === null) return show('policy', { commandKey: key, notice: '⚠️ Format cooldown tidak valid. Contoh: `30`, `1m30s`, atau `2h` (maksimal 24 jam).' });
        await patchPolicy(client, guild.id, key, { cooldownSeconds: seconds });
        return show('policy', { commandKey: key, notice: `✅ Cooldown diatur: ${formatCooldown(seconds)}.` });
      }
      await resetPolicy(client, guild.id, key);
      return show('policy', { commandKey: key, notice: '🧹 Semua batasan command ini dihapus.' });
    }

    return interaction.deferUpdate();
  } catch (error) {
    logger.error(`Aksi /config "${action}" gagal:`, error);
    const text = 'Waduh, pengaturan tidak bisa disimpan. Coba lagi sebentar, atau cek izin bot.';
    if (interaction.deferred || interaction.replied) return interaction.followUp({ content: text, ...ephemeral }).catch(() => {});
    return interaction.reply({ content: text, ...ephemeral }).catch(() => {});
  }
}
