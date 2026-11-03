// Dashboard utama /pacilsetup. Satu menu untuk semua modul; sub-panel dirender dengan interaction.update().

import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export const SETUP_MENU_ID = 'setup:menu';
export const SETUP_BACK_ID = 'setup:back';
export const setupActionId = (action) => `setup:act:${action}`;

/**
 * Daftar modul. kind 'panel' = sub-panel milik components/panels,
 * kind 'hub' = tampilan di configHub (view = nama view hub).
 */
export const SETUP_MODULES = Object.freeze([
  { value: 'welcome', kind: 'panel', emoji: '⚙️', label: 'Welcome System', description: 'Pesan kedatangan mahasiswa baru' },
  { value: 'rules', kind: 'panel', emoji: '📜', label: 'Rules & Guide', description: 'Tata tertib dan panduan interaktif server' },
  { value: 'booster', kind: 'panel', emoji: '🎭', label: 'Booster Perks', description: 'Custom role hadiah Server Booster' },
  { value: 'music', kind: 'panel', emoji: '🎶', label: 'Music Bot Status', description: 'Status bot musik: tersedia, dipakai, offline' },
  { value: 'circle', kind: 'panel', emoji: '👥', label: 'Circle Manager', description: 'Ruang privat kelompok tugas dan tongkrongan' },
  { value: 'confession', kind: 'hub', view: 'menfess', emoji: '💌', label: 'Confession Setup', description: 'Menfess anonim, review moderator, dan balasan' },
  { value: 'sticky', kind: 'hub', view: 'sticky', emoji: '📌', label: 'Sticky Message', description: 'Pesan yang selalu muncul di bawah channel' },
  { value: 'jtc', kind: 'hub', view: 'jtc', emoji: '🎙️', label: 'Join to Create', description: 'Ruang voice sementara dan panel pemiliknya' },
  { value: 'perm', kind: 'hub', view: 'perm', emoji: '🛡️', label: 'Izin Command', description: 'Role, channel, dan cooldown per command' },
  { value: 'access', kind: 'hub', view: 'access', emoji: '🚦', label: 'Aktif / Nonaktif Command', description: 'Matikan atau hidupkan command per kategori' },
  { value: 'other', kind: 'hub', view: 'other', emoji: '🧰', label: 'Fitur Lainnya', description: 'Tiket, logging, verifikasi, dan lain-lain' },
]);

export function renderMainDashboard(guild, { notice } = {}) {
  const embed = buildPacilEmbed({
    title: 'Pusat Pengaturan Pacil Bot',
    icon: '🏛️',
    description: [
      `Atur semua fitur bot untuk **${guild?.name ?? 'server ini'}** dari satu tempat.`,
      'Pilih modul di menu bawah. Panel akan berganti tanpa membuat pesan baru.',
    ].join('\n'),
    tone: 'gold',
    fields: SETUP_MODULES.map((m) => ({ name: `${m.emoji} ${m.label}`, value: m.description, inline: true })),
    thumbnail: botConfig.embeds?.logo || undefined,
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(SETUP_MENU_ID)
    .setPlaceholder('Pilih modul yang mau diatur…')
    .addOptions(SETUP_MODULES.map((m) => ({
      label: m.label, value: m.value, emoji: m.emoji, description: m.description,
    })));

  return {
    content: notice ?? '',
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}
