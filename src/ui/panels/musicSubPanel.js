import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';

export function getMusicBotsStatus(guild) {
  // Daftar prefix / identifikasi nama bot musik umum di komunitas Discord kampus
  const musicBotKeywords = ['jockie', 'flavi', 'lofi', 'rythm', 'fredboat', 'chip', 'groovy', 'music', 'bot'];
  
  const botMembers = guild.members.cache.filter(m => m.user.bot && m.id !== guild.client.user.id);
  const detectedMusicBots = [];

  for (const [, member] of botMembers) {
    const username = member.user.username.toLowerCase();
    const isCandidate = musicBotKeywords.some(keyword => username.includes(keyword));
    
    if (isCandidate) {
      const voiceChannel = member.voice?.channel;
      let status = 'offline';
      let channelName = '';

      if (member.presence?.status && member.presence.status !== 'offline') {
        if (voiceChannel) {
          status = 'in_use';
          channelName = voiceChannel.name;
        } else {
          status = 'available';
        }
      } else if (voiceChannel) {
        status = 'in_use';
        channelName = voiceChannel.name;
      }

      detectedMusicBots.push({
        id: member.id,
        name: member.user.username,
        status,
        channelName,
      });
    }
  }

  return detectedMusicBots;
}

export function renderMusicStatusEmbed(guild) {
  const bots = getMusicBotsStatus(guild);

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
    : '*(Tidak ada bot musik sekunder yang terdeteksi di server ini)*';

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
  const embed = renderMusicStatusEmbed(guild);

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
    components: [buttonRow],
  };
}
