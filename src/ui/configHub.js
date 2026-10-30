// Tampilan hub /config. Semua fungsi menerima data biasa (tanpa akses database)
// dan mengembalikan payload pesan { content, embeds, components } yang siap dikirim/diedit.

import {
  ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, StringSelectMenuBuilder,
} from 'discord.js';
import { pacilButtons, pacilId, pacilPanel } from './pacil.js';
import { POLICY_LIMITS, formatCooldown, normalizePolicy } from '../services/commandPolicyLogic.js';

export const CFG = 'pacilcfg';
export const cid = (...parts) => pacilId(CFG, ...parts);

export const POST_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const POLICY_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildForum, ChannelType.GuildCategory];
const PAGE_SIZE = 25;

const channelText = (id) => (id ? `<#${id}>` : '—');
const onOff = (value) => (value ? '🟢 Aktif' : '🔴 Nonaktif');
const yesNo = (value) => (value ? 'Ya' : 'Tidak');
const mentionIds = (ids, format, cap = 8) => {
  if (!ids?.length) return '—';
  const shown = ids.slice(0, cap).map(format).join(' ');
  return ids.length > cap ? `${shown} +${ids.length - cap}` : shown;
};

const payload = (notice, embed, components) => ({ content: notice ?? '', embeds: [embed], components });
const row = (...components) => new ActionRowBuilder().addComponents(...components);
const backButton = (to = 'home') => ({ id: cid('go', to), label: 'Kembali', emoji: '↩️', style: 'secondary' });

export const HOME_SECTIONS = [
  { value: 'menfess', label: 'Menfess', emoji: '💌', description: 'Channel, persetujuan, balasan, dan jeda kirim' },
  { value: 'sticky', label: 'Sticky Message', emoji: '📌', description: 'Pesan yang selalu muncul di bawah channel' },
  { value: 'jtc', label: 'Join to Create', emoji: '🎙️', description: 'Ruang voice sementara dan panel pemiliknya' },
  { value: 'perm', label: 'Izin Command', emoji: '🛡️', description: 'Role, channel, dan cooldown per command' },
  { value: 'access', label: 'Aktif / Nonaktif Command', emoji: '🚦', description: 'Matikan atau hidupkan command per kategori' },
  { value: 'other', label: 'Fitur Lainnya', emoji: '🧰', description: 'Tiket, logging, welcome, verifikasi, dan lain-lain' },
];

export function homeView({ guildName, notice } = {}) {
  const embed = pacilPanel({
    title: 'Pusat Pengaturan Pacil Bot',
    icon: '⚙️',
    tone: 'panel',
    description: [
      `Atur semua fitur bot untuk **${guildName ?? 'server ini'}** dari satu tempat.`,
      'Pilih bagian yang mau diatur di menu bawah. Perubahan langsung tersimpan.',
    ].join('\n'),
    fields: HOME_SECTIONS.map((s) => ({ name: `${s.emoji} ${s.label}`, value: s.description, inline: true })),
    footer: 'Pacil Baik • Hanya yang punya izin Manage Server bisa membuka ini',
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(cid('go'))
    .setPlaceholder('Pilih bagian yang mau diatur…')
    .addOptions(HOME_SECTIONS.map((s) => ({ label: s.label, value: s.value, emoji: s.emoji, description: s.description })));
  return payload(notice, embed, [row(menu)]);
}

export function menfessView({ config, notice }) {
  const embed = pacilPanel({
    title: 'Pengaturan Menfess',
    icon: '💌',
    tone: config.enabled ? 'success' : 'warning',
    description: 'Menfess anonim dengan antrean moderator dan balasan lewat thread. Identitas pengirim hanya terlihat di channel review.',
    fields: [
      { name: 'Status', value: onOff(config.enabled), inline: true },
      { name: 'Channel publik', value: channelText(config.channelId), inline: true },
      { name: 'Channel review', value: channelText(config.reviewChannelId), inline: true },
      { name: 'Role moderator', value: config.moderatorRoleId ? `<@&${config.moderatorRoleId}>` : '—', inline: true },
      { name: 'Persetujuan moderator', value: yesNo(config.requireApproval), inline: true },
      { name: 'Jeda kirim', value: `${config.cooldownMinutes} menit`, inline: true },
      { name: 'Balasan di thread', value: `${onOff(config.repliesEnabled)}\nJeda: ${config.replyCooldownSeconds} detik`, inline: true },
    ],
  });

  const toggles = pacilButtons([
    { id: cid('mf', 'enabled'), label: config.enabled ? 'Matikan' : 'Aktifkan', emoji: config.enabled ? '⏸️' : '▶️', style: config.enabled ? 'secondary' : 'success' },
    { id: cid('mf', 'approval'), label: config.requireApproval ? 'Tanpa Persetujuan' : 'Wajib Persetujuan', emoji: '🛂', style: 'secondary' },
    { id: cid('mf', 'replies'), label: config.repliesEnabled ? 'Matikan Balasan' : 'Aktifkan Balasan', emoji: '💬', style: 'secondary' },
    { id: cid('mf', 'cooldown'), label: 'Atur Jeda', emoji: '⏱️', style: 'primary' },
    backButton(),
  ]);

  const publicSelect = new ChannelSelectMenuBuilder()
    .setCustomId(cid('mfch', 'channelId'))
    .setPlaceholder('Channel publik tempat menfess diposting')
    .setChannelTypes(POST_CHANNEL_TYPES)
    .setMinValues(0).setMaxValues(1);
  const reviewSelect = new ChannelSelectMenuBuilder()
    .setCustomId(cid('mfch', 'reviewChannelId'))
    .setPlaceholder('Channel review khusus moderator')
    .setChannelTypes(POST_CHANNEL_TYPES)
    .setMinValues(0).setMaxValues(1);
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(cid('mfrole'))
    .setPlaceholder('Role moderator yang boleh meninjau')
    .setMinValues(0).setMaxValues(1);
  if (config.channelId) publicSelect.setDefaultChannels(config.channelId);
  if (config.reviewChannelId) reviewSelect.setDefaultChannels(config.reviewChannelId);
  if (config.moderatorRoleId) roleSelect.setDefaultRoles(config.moderatorRoleId);

  return payload(notice, embed, [...toggles, row(publicSelect), row(reviewSelect), row(roleSelect)]);
}

export function stickyView({ stickies, limit, notice }) {
  const lines = stickies.slice(0, 15).map((s) => `• <#${s.channelId}> — **${String(s.title || 'Tanpa judul').slice(0, 60)}**`);
  const embed = pacilPanel({
    title: 'Sticky Message',
    icon: '📌',
    tone: 'panel',
    description: stickies.length
      ? lines.join('\n') + (stickies.length > 15 ? `\n…dan ${stickies.length - 15} lainnya` : '')
      : 'Belum ada sticky message di server ini.',
    fields: [
      { name: 'Terpakai', value: `${stickies.length} dari ${limit}`, inline: true },
      { name: 'Cara mengatur', value: '`/sticky set` untuk membuat atau mengubah\n`/sticky remove` untuk menghapus\n`/sticky list` untuk melihat isinya', inline: false },
    ],
  });
  return payload(notice, embed, pacilButtons([backButton()]));
}

export function jtcView({ triggers, activeRooms, notice }) {
  const embed = pacilPanel({
    title: 'Join to Create',
    icon: '🎙️',
    tone: 'panel',
    description: triggers.length
      ? 'Masuk ke channel pemicu, lalu bot membuatkan ruang voice sementara lengkap dengan panel kontrol untuk pemiliknya.'
      : 'Belum ada channel pemicu. Jalankan `/jointocreate setup` untuk membuatnya.',
    fields: [
      { name: 'Channel pemicu', value: mentionIds(triggers, channelText), inline: true },
      { name: 'Ruang aktif', value: String(activeRooms), inline: true },
      { name: 'Pengaturan lanjutan', value: '`/jointocreate dashboard` untuk nama, batas, bitrate, region, dan mode video bawaan.', inline: false },
    ],
  });
  return payload(notice, embed, pacilButtons([backButton()]));
}

export function accessView({ disabledCommands, disabledCategories, notice }) {
  const embed = pacilPanel({
    title: 'Aktif / Nonaktif Command',
    icon: '🚦',
    tone: 'panel',
    description: 'Matikan command atau satu kategori penuh untuk server ini. Command `/config`, `/commands`, dan `/configwizard` selalu aktif supaya kamu tidak terkunci.',
    fields: [
      { name: 'Command nonaktif', value: String(disabledCommands), inline: true },
      { name: 'Kategori nonaktif', value: String(disabledCategories), inline: true },
      { name: 'Buka dashboard', value: 'Jalankan `/commands` untuk mengatur per kategori atau per command.', inline: false },
    ],
  });
  return payload(notice, embed, pacilButtons([backButton()]));
}

export const OTHER_DASHBOARDS = [
  ['🎫 Tiket', '/ticket dashboard'],
  ['📝 Logging', '/logging dashboard'],
  ['👋 Welcome & Goodbye', '/greet dashboard'],
  ['✅ Verifikasi', '/verification dashboard'],
  ['📊 Leveling', '/level dashboard'],
  ['💰 Ekonomi', '/economy dashboard'],
  ['🎭 Reaction Role', '/reactroles dashboard'],
  ['📋 Aplikasi', '/app-admin dashboard'],
];

export function otherView({ notice } = {}) {
  const embed = pacilPanel({
    title: 'Fitur Lainnya',
    icon: '🧰',
    tone: 'panel',
    description: 'Fitur-fitur ini punya dashboard sendiri. Jalankan command-nya untuk mengaturnya, lalu atur izin pemakaian tiap command lewat **Izin Command**.',
    fields: OTHER_DASHBOARDS.map(([name, command]) => ({ name, value: `\`${command}\``, inline: true })),
  });
  return payload(notice, embed, pacilButtons([backButton()]));
}

export function permCategoryView({ categories, notice }) {
  const embed = pacilPanel({
    title: 'Izin Command',
    icon: '🛡️',
    tone: 'panel',
    description: [
      'Batasi siapa, di mana, dan seberapa sering sebuah command bisa dipakai.',
      '',
      '• **Role**: hanya role terpilih yang boleh.',
      '• **Channel**: hanya di channel atau kategori terpilih.',
      '• **Cooldown**: jeda antar pemakaian per orang.',
      '',
      'Pengurus dengan izin Manage Server tidak pernah terkena batas ini. Pilih kategori dulu.',
    ].join('\n'),
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(cid('permcat'))
    .setPlaceholder('Pilih kategori command…')
    .addOptions(categories.slice(0, 25).map((c) => ({
      label: c.displayName.slice(0, 100), value: c.key, emoji: c.icon, description: `${c.count} command${c.restricted ? ` • ${c.restricted} dibatasi` : ''}`,
    })));
  return payload(notice, embed, [row(menu), ...pacilButtons([backButton()])]);
}

export function permCommandsView({ category, page = 0, restrictedKeys = [], notice }) {
  const pages = Math.max(1, Math.ceil(category.commands.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 0), pages - 1);
  const slice = category.commands.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const restricted = new Set(restrictedKeys);
  const embed = pacilPanel({
    title: `Izin Command • ${category.displayName}`,
    icon: category.icon,
    tone: 'panel',
    description: `Pilih command yang mau diatur. Tanda 🔒 berarti sudah punya batasan.${pages > 1 ? `\nHalaman ${current + 1} dari ${pages}.` : ''}`,
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(cid('permcmd', category.key, String(current)))
    .setPlaceholder('Pilih command…')
    .addOptions(slice.map((c) => ({
      label: `${restricted.has(c.name.toLowerCase()) ? '🔒 ' : ''}/${c.name}`.slice(0, 100),
      value: c.name.slice(0, 100),
      description: String(c.description || '').slice(0, 100) || undefined,
    })));
  const nav = [backButton('perm')];
  if (pages > 1) {
    nav.push(
      { id: cid('permpg', category.key, String(current - 1)), label: 'Sebelumnya', emoji: '◀️', style: 'secondary', disabled: current === 0 },
      { id: cid('permpg', category.key, String(current + 1)), label: 'Berikutnya', emoji: '▶️', style: 'secondary', disabled: current >= pages - 1 },
    );
  }
  return payload(notice, embed, [row(menu), ...pacilButtons(nav)]);
}

export function policyView({ commandKey, description, categoryKey, policy, isProtected, notice }) {
  const p = normalizePolicy(policy);
  const embed = pacilPanel({
    title: `/${commandKey}`,
    icon: '🛡️',
    tone: isProtected ? 'warning' : 'accent',
    description: isProtected
      ? 'Command ini dilindungi supaya admin tidak terkunci, jadi tidak bisa dibatasi.'
      : (description || 'Atur siapa yang boleh memakai command ini.'),
    fields: [
      { name: 'Role yang boleh', value: p.allowedRoles.length ? mentionIds(p.allowedRoles, (id) => `<@&${id}>`) : 'Semua role', inline: false },
      { name: 'Channel yang diizinkan', value: p.allowedChannels.length ? mentionIds(p.allowedChannels, channelText) : 'Semua channel', inline: false },
      { name: 'Cooldown', value: formatCooldown(p.cooldownSeconds), inline: true },
    ],
  });
  const back = { id: cid('permback', categoryKey ?? ''), label: 'Kembali', emoji: '↩️', style: 'secondary' };
  if (isProtected) return payload(notice, embed, pacilButtons([back]));

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(cid('prole', commandKey))
    .setPlaceholder('Role yang boleh (kosong = semua)')
    .setMinValues(0).setMaxValues(POLICY_LIMITS.maxRoles);
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(cid('pchan', commandKey))
    .setPlaceholder('Channel atau kategori yang diizinkan (kosong = semua)')
    .setChannelTypes(POLICY_CHANNEL_TYPES)
    .setMinValues(0).setMaxValues(POLICY_LIMITS.maxChannels);
  if (p.allowedRoles.length) roleSelect.setDefaultRoles(...p.allowedRoles);
  if (p.allowedChannels.length) channelSelect.setDefaultChannels(...p.allowedChannels);

  const buttons = pacilButtons([
    { id: cid('pcd', commandKey), label: 'Atur Cooldown', emoji: '⏱️', style: 'primary' },
    { id: cid('preset', commandKey), label: 'Hapus Batasan', emoji: '🧹', style: 'danger' },
    back,
  ]);
  return payload(notice, embed, [row(roleSelect), row(channelSelect), ...buttons]);
}
