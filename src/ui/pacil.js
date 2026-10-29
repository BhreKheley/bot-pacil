// Builder bersama untuk tampilan Pacil Baik.
// Semua panel baru memakai modul ini supaya warna, footer, dan gaya tombol seragam.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getColor } from '../config/bot.js';

/** Token visual. Warna mengacu ke botConfig.embeds.colors (satu sumber kebenaran). */
export const PACIL_TOKENS = Object.freeze({
  accent: 'makaraGold',   // aksen utama: Kuning Makara
  panel: 'pacilNavy',     // panel / informasi netral
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
});

export const PACIL_FOOTER = 'Pacil Baik • Fasilkom UI';

/**
 * Embed panel Pacil. Judul diberi satu emoji saja; isi memakai teks biasa.
 * @param {{ title: string, description?: string, icon?: string, tone?: keyof typeof PACIL_TOKENS,
 *           fields?: {name:string,value:string,inline?:boolean}[], footer?: string, thumbnail?: string }} opts
 */
export function pacilPanel({ title, description, icon, tone = 'accent', fields = [], footer, thumbnail } = {}) {
  const embed = new EmbedBuilder()
    .setTitle(icon ? `${icon}  ${title}` : title)
    .setColor(getColor(PACIL_TOKENS[tone] ?? PACIL_TOKENS.accent))
    .setFooter({ text: footer ?? PACIL_FOOTER })
    .setTimestamp();
  if (description) embed.setDescription(description.slice(0, 4000));
  if (fields.length) {
    embed.addFields(fields.filter((f) => f?.name && f?.value).slice(0, 25).map((f) => ({
      name: f.name.slice(0, 256),
      value: String(f.value).slice(0, 1024),
      inline: Boolean(f.inline),
    })));
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  return embed;
}

/** Notifikasi singkat (sukses, info, peringatan, error). Selalu ephemeral kecuali diminta lain. */
export function pacilNotice({ tone = 'info', title, body, icon }) {
  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };
  return pacilPanel({
    title: title ?? '',
    description: body,
    icon: icon ?? icons[tone] ?? 'ℹ️',
    tone,
    footer: PACIL_FOOTER,
  });
}

/** Ubah daftar tombol menjadi baris-baris ActionRow (maksimal 5 tombol per baris). */
export function pacilButtons(buttons, { style = 'secondary' } = {}) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const b of buttons.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(b.id)
        .setLabel(b.label.slice(0, 80))
        .setStyle(ButtonStyle[capitalize(b.style ?? style)] ?? ButtonStyle.Secondary);
      if (b.emoji) btn.setEmoji(b.emoji);
      if (b.disabled) btn.setDisabled(true);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

/** Pola customId seragam: "<modul>:<aksi>[:<argumen>...]". */
export function pacilId(...parts) {
  return parts.filter((p) => p !== undefined && p !== null && p !== '').join(':');
}

/** Pecah customId kembali ke bagian-bagiannya. */
export function parsePacilId(customId = '') {
  const [module, action, ...args] = String(customId).split(':');
  return { module, action, args };
}

/** Balasan ephemeral standar: pemanggil selalu tahu hasilnya. */
export function ephemeral(payload) {
  return { ...payload, flags: MessageFlags.Ephemeral };
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
