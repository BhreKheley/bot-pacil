import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  UserSelectMenuBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { MAX_TRACKED_BOTS, getTrackedBotIds } from '../../services/musicTrackerService.js';

const MUSIC_BOT_KEYWORDS = ['jockie', 'flavi', 'lofi', 'rythm', 'fredboat', 'chip', 'groovy', 'music'];

/**
 * Daftar bot musik: prioritas ID eksplisit (opsi `musicBotIds` atau env MUSIC_BOT_IDS, dipisah koma),
 * cadangan: tebakan dari nama. Bot sedang di voice = In Use; presence 'offline' eksplisit = Offline;
 * selain itu Available (presence hanya tersedia bila intent GuildPresences aktif).
 */
export function getMusicBotsStatus(guild, musicBotIds = []) {
  const ids = new Set([...(musicBotIds ?? []), ...(process.env.MUSIC_BOT_IDS ?? '').split(',')].map((v) => String(v).trim()).filter(Boolean));
  const botMembers = guild.members.cache.filter((m) => m.user.bot && m.id !== guild.client.user.id);
  const detectedMusicBots = [];

  for (const [, member] of botMembers) {
    const username = member.user.username.toLowerCase();
    const isCandidate = ids.size > 0 ? ids.has(member.id) : MUSIC_BOT_KEYWORDS.some((k) => username.includes(k));
    if (!isCandidate) continue;

    const voiceChannel = member.voice?.channel;
    let status = 'available';
    if (voiceChannel) status = 'in_use';
    else if (member.presence?.status === 'offline') status = 'offline';

    detectedMusicBots.push({ id: member.id, name: member.user.username, status, channelName: voiceChannel?.name ?? '' });
  }
  return detectedMusicBots;
}

export function renderMusicStatusEmbed(guild, botIds = []) {
  const bots = getMusicBotsStatus(guild, botIds);

  const statusLines = bots.length > 0
    ? bots.map(b => {
        if (b.status === 'in_use') {
          return `🔴 **${b.name}** — *In Use* (di channel 🔊 **${b.channelName}**)`;
        } else if (b.status === 'available') {
          return `🟢 **${b.name}** — *Available* (Siap digunakan)`;
        } else {
          return `⚪ **${b.name}** — *Offline*`;
        }
      }).join('\n')
    : '*Belum ada bot musik yang dipantau. Admin: pilih bot lewat `/pacilsetup` → Music Bot Status.*';

  const embed = buildPacilEmbed({
    title: '🎶 Live Music Bot Tracker — Pacil Baik',
    description:
      'Status ketersediaan bot musik sekunder di voice channel server Pacil Baik Fasilkom UI.\n\n' +
      'Gunakan status di bawah untuk melihat bot musik mana yang sedang kosong atau sedang bernyanyi:',
    tone: 'gold',
    fields: [
      {
        name: '🤖 Status Bot Musik Terdeteksi',
        value: statusLines,
        inline: false,
      },
      {
        name: '📌 Keterangan Indikator',
        value: '🟢 **Available** = Siap dipanggil ke voice channel\n🔴 **In Use** = Sedang memutar lagu untuk mahasiswa\n⚪ **Offline** = Sedang mati / gangguan',
        inline: false,
      },
      {
        name: '🎧 Fitur Musik Internal Pacil Bot',
        value: 'Kamu juga bisa memutar musik berdefinisi tinggi langsung via Pacil Bot dengan command `/play <lagu>`!',
        inline: false,
      },
    ],
    footer: 'Makara Fasilkom UI • Music Status Dashboard',
  });

  return embed;
}

export async function renderMusicSubPanel(client, guild) {
  const botIds = await getTrackedBotIds(client, guild.id);
  if (botIds.length) await guild.members.fetch({ user: botIds }).catch(() => {});
  const embed = renderMusicStatusEmbed(guild, botIds);
  const picker = new UserSelectMenuBuilder()
    .setCustomId('setup:music:bots')
    .setPlaceholder('Pilih bot musik yang dipantau (maks. 10)')
    .setMinValues(0)
    .setMaxValues(MAX_TRACKED_BOTS);
  if (botIds.length) picker.setDefaultUsers(botIds.slice(0, MAX_TRACKED_BOTS));
  const pickerRow = new ActionRowBuilder().addComponents(picker);


  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup:act:deploy_music_tracker')
      .setLabel('Pasang Tracker Publik')
      .setEmoji('📌')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setup:act:refresh_music_panel')
      .setLabel('Refresh Status')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup:back')
      .setLabel('🔙 Back to Main Menu')
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [pickerRow, buttonRow],
  };
}
