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

export async function renderVerificationSubPanel(client, guild, { notice = null } = {}) {
  const guildConfig = await getGuildConfig(client, guild.id);
  const verif = guildConfig.verification || {};

  const isEnabled = Boolean(verif.enabled);
  const isSsoEnabled = verif.ssoEnabled ?? true;
  const isAutoNick = verif.autoNickname ?? true;

  const channelObj = verif.channelId ? guild.channels.cache.get(verif.channelId) : null;
  const roleObj = verif.roleId ? guild.roles.cache.get(verif.roleId) : null;
  const unverifiedRoleObj = verif.unverifiedRoleId ? guild.roles.cache.get(verif.unverifiedRoleId) : null;

  const embed = buildPacilEmbed({
    title: 'Verification System — Portal Mahasiswa SSO UI',
    icon: '🎓',
    description: [
      notice,
      'Konfigurasi sistem verifikasi identitas mahasiswa Universitas Indonesia menggunakan protokol CAS resmi (**sso.ui.ac.id**).',
      'Mahasiswa yang terverifikasi akan mendapatkan role prodi (CS/SI), angkatan, serta pembaruan nickname otomatis.',
    ].filter(Boolean).join('\n\n'),
    tone: 'gold',
    fields: [
      {
        name: 'Status Sistem',
        value: isEnabled ? '🟢 **Aktif**' : '⚪ **Nonaktif**',
        inline: true,
      },
      {
        name: 'Otentikasi SSO UI',
        value: isSsoEnabled ? '🔐 **SSO UI (sso.ui.ac.id)**' : '🔘 **Manual (Satu Klik)**',
        inline: true,
      },
      {
        name: 'Auto-Format Nickname',
        value: isAutoNick ? '✏️ **Aktif** (`Nama (CS\'XX)`)' : '⚪ **Nonaktif**',
        inline: true,
      },
      {
        name: 'Channel Verifikasi',
        value: channelObj ? channelObj.toString() : '*Belum diatur*',
        inline: true,
      },
      {
        name: 'Role Terverifikasi (Warga Pacil)',
        value: roleObj ? roleObj.toString() : '*Belum diatur*',
        inline: true,
      },
      {
        name: 'Role Tamu (Unverified)',
        value: unverifiedRoleObj ? unverifiedRoleObj.toString() : '*Tidak ada (opsional)*',
        inline: true,
      },
    ],
  });

  const rows = [];

  // Row 1: Channel select
  const chMenu = new ChannelSelectMenuBuilder()
    .setCustomId('setup:verif:channel')
    .setPlaceholder('Pilih channel verifikasi (mis. #verifikasi)')
    .setChannelTypes(TEXT_CHANNELS)
    .setMinValues(0)
    .setMaxValues(1);
  if (channelObj) chMenu.setDefaultChannels(channelObj.id);
  rows.push(new ActionRowBuilder().addComponents(chMenu));

  // Row 2: Role select (Verified Role)
  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId('setup:verif:role')
    .setPlaceholder('Pilih role utama terverifikasi (mis. Warga Pacil)')
    .setMinValues(0)
    .setMaxValues(1);
  if (roleObj) roleMenu.setDefaultRoles(roleObj.id);
  rows.push(new ActionRowBuilder().addComponents(roleMenu));

  // Row 3: Role select (Unverified Role to remove)
  const unverifiedMenu = new RoleSelectMenuBuilder()
    .setCustomId('setup:verif:unverified_role')
    .setPlaceholder('Pilih role unverified untuk dicabut otomatis (opsional)')
    .setMinValues(0)
    .setMaxValues(1);
  if (unverifiedRoleObj) unverifiedMenu.setDefaultRoles(unverifiedRoleObj.id);
  rows.push(new ActionRowBuilder().addComponents(unverifiedMenu));

  // Row 4: Action Toggles
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup:verif:toggle')
        .setLabel(isEnabled ? 'Nonaktifkan' : 'Aktifkan')
        .setStyle(isEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setEmoji(isEnabled ? '⏸️' : '▶️'),
      new ButtonBuilder()
        .setCustomId('setup:verif:sso_toggle')
        .setLabel(isSsoEnabled ? 'Mode: SSO UI' : 'Mode: Manual')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔐'),
      new ButtonBuilder()
        .setCustomId('setup:verif:nick_toggle')
        .setLabel(isAutoNick ? 'Nickname: Ya' : 'Nickname: Tidak')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️'),
      new ButtonBuilder()
        .setCustomId('setup:verif:deploy')
        .setLabel('Pasang Panel')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀')
    )
  );

  // Row 5: Navigation
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup:back')
        .setLabel('Menu Utama')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔙')
    )
  );

  return { embeds: [embed], components: rows };
}
