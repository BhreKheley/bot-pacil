// Builder bersama untuk tampilan Pacil Baik.
// SATU-SATUNYA tempat embed dibuat: warna, footer, dan format teks diambil dari
// botConfig.embeds (sumber kebenaran tunggal), sehingga semua fitur tampil seragam.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getColor, botConfig } from '../config/bot.js';

/** Nama tone → kunci warna di botConfig.embeds.colors. */
export const PACIL_TOKENS = Object.freeze({
  navy: 'pacilNavy',
  panel: 'pacilNavy',     // panel / informasi netral
  gold: 'makaraGold',
  accent: 'makaraGold',   // aksen utama: Kuning Makara
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
});

/** Warna siap pakai (angka) untuk kode yang butuh nilai langsung, mis. role Discord. */
export const PACIL_COLORS = Object.freeze({
  navy: getColor('pacilNavy'),
  gold: getColor('makaraGold'),
  success: getColor('success'),
  error: getColor('error'),
  warning: getColor('warning'),
  info: getColor('info'),
});

export const PACIL_FOOTER = botConfig.embeds?.footer?.text ?? 'Pacil Baik • Fasilkom UI';

const clip = (value, max) => String(value).slice(0, max);

/** Footer seragam: selalu diawali merek Pacil, petunjuk kontekstual ditambahkan setelahnya. */
export const pacilFooter = (hint) => (hint ? clip(`${PACIL_FOOTER} • ${hint}`, 2048) : PACIL_FOOTER);

function cleanText(text = '') {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]\n/g, '\n')
    .replace(/\n[ \t]/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveColor(color, tone) {
  try {
    const value = getColor(color ?? PACIL_TOKENS[tone] ?? PACIL_TOKENS.navy);
    return typeof value === 'number' ? value : PACIL_COLORS.navy;
  } catch {
    return PACIL_COLORS.navy;
  }
}

/**
 * Fungsi pusat pembuat embed. Semua embed bot WAJIB lewat sini.
 * @param {{
 *   title?: string, description?: string, icon?: string,
 *   tone?: keyof typeof PACIL_TOKENS, color?: string | number,
 *   fields?: {name:string,value:string,inline?:boolean}[],
 *   footer?: string | {text:string,iconURL?:string}, thumbnail?: string, image?: string,
 *   author?: string | {name:string,iconURL?:string,url?:string}, timestamp?: boolean | Date, url?: string
 * }} opts
 */
export function buildPacilEmbed({
  title, description, icon, tone = 'navy', color, fields = [], footer, thumbnail, image,
  author, timestamp = true, url,
} = {}) {
  const embed = new EmbedBuilder().setColor(resolveColor(color, tone));

  if (title || icon) embed.setTitle(clip(icon ? `${icon}  ${title ?? ''}`.trim() : title, 256));
  if (description) embed.setDescription(clip(cleanText(description), 4096));

  const validFields = (Array.isArray(fields) ? fields : []).filter((f) => f?.name && f?.value);
  if (validFields.length) {
    embed.addFields(validFields.slice(0, 25).map((f) => ({
      name: clip(cleanText(f.name), 256),
      value: clip(cleanText(String(f.value)), 1024),
      inline: Boolean(f.inline),
    })));
  }

  const authorValue = author ?? (botConfig.embeds?.author?.name
    ? { name: botConfig.embeds.author.name, iconURL: botConfig.embeds.author.icon ?? undefined, url: botConfig.embeds.author.url ?? undefined }
    : null);
  if (typeof authorValue === 'string' && authorValue) embed.setAuthor({ name: clip(authorValue, 256) });
  else if (authorValue?.name) embed.setAuthor(authorValue);

  if (footer && typeof footer === 'object' && footer.text) embed.setFooter(footer);
  else embed.setFooter({ text: clip(typeof footer === 'string' && footer ? footer : PACIL_FOOTER, 2048) });

  const thumb = thumbnail ?? botConfig.embeds?.thumbnail;
  if (thumb) embed.setThumbnail(typeof thumb === 'object' ? thumb.url : thumb);
  if (image) embed.setImage(typeof image === 'object' ? image.url : image);
  if (url) { try { embed.setURL(url); } catch { /* URL tidak valid: abaikan */ } }

  if (timestamp instanceof Date) embed.setTimestamp(timestamp);
  else if (timestamp) embed.setTimestamp();

  return embed;
}

/** Embed dasar Pacil (warna + footer + timestamp) untuk dirangkai lewat method EmbedBuilder. */
export function pacilEmbed(opts = {}) {
  return buildPacilEmbed(opts);
}

/** Embed panel Pacil (judul diberi satu emoji). Alias dari buildPacilEmbed dengan tone aksen. */
export function pacilPanel({ tone = 'accent', ...rest } = {}) {
  return buildPacilEmbed({ tone, ...rest });
}

/** Notifikasi singkat (sukses, info, peringatan, error). */
export function pacilNotice({ tone = 'info', title, body, icon }) {
  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };
  return buildPacilEmbed({ title: title ?? '', description: body, icon: icon ?? icons[tone] ?? 'ℹ️', tone });
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
