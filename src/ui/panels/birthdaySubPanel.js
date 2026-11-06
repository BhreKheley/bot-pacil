import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

export async function renderBirthdaySubPanel(client, guild, { notice = null } = {}) {
  const config = await getGuildConfig(client, guild.id);
  const channelId = config.birthdayChannelId || null;
  const roleId = config.birthdayRoleId || null;

  const embed = buildPacilEmbed({
    title: '🎂 Sub-Panel: Sistem Ulang Tahun Warga Pacil',
    description: [
      notice,
      'Rayakan hari ulang tahun mahasiswa dan anggota komunitas Fasilkom UI secara otomatis!',
      'Bot akan memeriksa ulang tahun setiap hari, memberikan role sementara, dan mengirim kartu ucapan visual berlatar Makara Fasilkom UI.',
    ].filter(Boolean).join('\n\n'),
    tone: 'gold',
    fields: [
      {
        name: '📢 Channel Pengumuman',
        value: channelId ? `<#${channelId}>` : '⚠️ Belum diatur (pengumuman mati)',
        inline: true,
      },
      {
        name: '👑 Role Ulang Tahun',
        value: roleId ? `<@&${roleId}>` : '— Tidak ada (hanya ucapan teks & kartu)',
        inline: true,
      },
      {
        name: '🕒 Jadwal Pengumuman',
        value: 'Setiap hari pukul 06.00 WIB (00.00 UTC)',
        inline: true,
      },
      {
        name: '🖼️ Kartu Visual',
        value: '✅ Banner visual `renderBirthdayCard` otomatis terpasang saat pengumuman.',
        inline: false,
      },
    ],
    footer: 'Pacil Baik • Fasilkom UI Birthday Desk',
  });

  const channelMenu = new ChannelSelectMenuBuilder()
    .setCustomId('setup:birthday:channel')
    .setPlaceholder('Pilih channel pengumuman ulang tahun...')
    .setChannelTypes(TEXT_CHANNELS)
    .setMinValues(0)
    .setMaxValues(1);
  if (channelId && guild?.channels?.cache?.has(channelId)) {
    channelMenu.setDefaultChannels(channelId);
  }

  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId('setup:birthday:role')
    .setPlaceholder('Pilih role ulang tahun (opsional)...')
    .setMinValues(0)
    .setMaxValues(1);
  if (roleId && guild?.roles?.cache?.has(roleId)) {
    roleMenu.setDefaultRoles(roleId);
  }

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup:birthday:test')
      .setLabel('Test Kartu Ucapan')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setup:back')
      .setLabel('Menu Utama')
      .setEmoji('🔙')
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(channelMenu),
      new ActionRowBuilder().addComponents(roleMenu),
      buttonRow,
    ],
  };
}

