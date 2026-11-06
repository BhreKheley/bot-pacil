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

export async function renderTicketSubPanel(client, guild, { notice = null } = {}) {
  const guildConfig = await getGuildConfig(client, guild.id);
  const staffRoleObj = guildConfig.ticketStaffRoleId ? guild.roles.cache.get(guildConfig.ticketStaffRoleId) : null;
  const dmOnClose = guildConfig.ticketDmOnClose ?? true;

  const embed = buildPacilEmbed({
    title: 'Ticket System — Pusat Bantuan & Layanan Mahasiswa',
    icon: '🎫',
    description: [
      notice,
      'Pasang panel tiket mandiri per channel (#bantuan, #report, #suggestion) sesuai arsitektur server Pacil.',
      'Setiap tiket yang dibuka akan memiliki izin akses privat antara mahasiswa dan tim Staff/Asdos.',
    ].filter(Boolean).join('\n\n'),
    tone: 'gold',
    fields: [
      {
        name: 'Role Staff Tiket',
        value: staffRoleObj ? staffRoleObj.toString() : '*Belum diatur (Hanya Admin)*',
        inline: true,
      },
      {
        name: 'Kirim Notifikasi DM saat Ditutup',
        value: dmOnClose ? '🔔 **Ya (Kirim DM)**' : '🔕 **Tidak**',
        inline: true,
      },
      {
        name: 'Panel Kategori yang Tersedia',
        value: '• **Bantuan (#bantuan):** Pertanyaan server & materi kuliah\n• **Report (#report):** Laporan pelanggaran & ketertiban\n• **Suggestion (#suggestion):** Ide fitur & saran komunitas',
        inline: false,
      },
    ],
  });

  const rows = [];

  // Row 1: Role Staff select
  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId('setup:ticket:staff_role')
    .setPlaceholder('Pilih role staff yang menangani tiket (mis. Moderator / Asdos)')
    .setMinValues(0)
    .setMaxValues(1);
  if (staffRoleObj) roleMenu.setDefaultRoles(staffRoleObj.id);
  rows.push(new ActionRowBuilder().addComponents(roleMenu));

  // Row 2: Target channel for quick deployment
  const chMenu = new ChannelSelectMenuBuilder()
    .setCustomId('setup:ticket:target_channel')
    .setPlaceholder('Pilih channel target untuk pasang panel')
    .setChannelTypes(TEXT_CHANNELS)
    .setMinValues(0)
    .setMaxValues(1);
  rows.push(new ActionRowBuilder().addComponents(chMenu));

  // Row 3: Deployment Buttons for the 3 Categories (Screenshots 3, 4, 5)
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup:ticket:deploy:bantuan')
        .setLabel('Pasang Panel Bantuan')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💬'),
      new ButtonBuilder()
        .setCustomId('setup:ticket:deploy:report')
        .setLabel('Pasang Panel Report')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚨'),
      new ButtonBuilder()
        .setCustomId('setup:ticket:deploy:suggestion')
        .setLabel('Pasang Panel Saran')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💡')
    )
  );

  // Row 4: DM Toggle
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup:ticket:toggle_dm')
        .setLabel(dmOnClose ? 'DM on Close: Aktif' : 'DM on Close: Nonaktif')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔔'),
      new ButtonBuilder()
        .setCustomId('setup:back')
        .setLabel('Menu Utama')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔙')
    )
  );

  return { embeds: [embed], components: rows };
}
