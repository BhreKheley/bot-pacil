import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { verifyUser } from '../../services/verificationService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verifikasi status mahasiswa UI untuk membuka akses penuh server'),

  async execute(interaction, config, client) {
    const guild = interaction.guild;
    const userId = interaction.user.id;

    const guildConfig = await getGuildConfig(client, guild.id);
    const ssoEnabled = guildConfig.verification?.ssoEnabled ?? true;

    // 1. Check if user is already verified
    const verifiedRoleId = guildConfig.verification?.roleId;
    if (verifiedRoleId && interaction.member?.roles?.cache?.has(verifiedRoleId)) {
      const alreadyEmbed = buildPacilEmbed({
        title: 'Akun Sudah Terverifikasi',
        icon: '✅',
        description: 'Kamu sudah memiliki role terverifikasi dan memiliki akses penuh ke seluruh channel komunitas.',
        tone: 'success',
      });
      return InteractionHelper.safeReply(interaction, {
        embeds: [alreadyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. SSO UI Verification Flow (Default & Recommended for Fasilkom UI)
    if (ssoEnabled) {
      const port = process.env.PORT || 3000;
      const host = process.env.PUBLIC_URL || `http://localhost:${port}`;
      const loginUrl = `${host}/auth/sso/login?guildId=${guild.id}&userId=${userId}`;

      const ssoEmbed = buildPacilEmbed({
        title: 'Verifikasi Mahasiswa — SSO UI',
        icon: '🎓',
        description:
          'Untuk memastikan ketertiban komunitas, server ini mewajibkan mahasiswa melakukan otentikasi resmi via **SSO UI**.\n\n' +
          '• **Aman & Resmi:** Kamu login langsung di `sso.ui.ac.id`. Bot tidak dapat melihat password kamu.\n' +
          '• **Otomatisasi Role:** Bot akan membaca NPM, Program Studi (CS/SI), dan Angkatan untuk memberikan role yang sesuai secara otomatis.',
        tone: 'gold',
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Masuk via SSO UI')
          .setStyle(ButtonStyle.Link)
          .setURL(loginUrl)
          .setEmoji('🔐'),
        new ButtonBuilder()
          .setCustomId('verify_user')
          .setLabel('Verifikasi Manual (Tamu)')
          .setStyle(ButtonStyle.Secondary)
      );

      return InteractionHelper.safeReply(interaction, {
        embeds: [ssoEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 3. Fallback standard verification
    const result = await verifyUser(client, guild.id, userId, {
      source: 'command_self',
      moderatorId: null,
    });

    if (result.status === 'already_verified') {
      const info = buildPacilEmbed({
        title: 'Sudah Terverifikasi',
        icon: 'ℹ️',
        description: 'Kamu sudah terverifikasi sebelumnya.',
        tone: 'info',
      });
      return InteractionHelper.safeReply(interaction, {
        embeds: [info],
        flags: MessageFlags.Ephemeral,
      });
    }

    const success = buildPacilEmbed({
      title: 'Verifikasi Berhasil',
      icon: '✅',
      description: `Selamat datang! Kamu telah mendapatkan role **${result.roleName}** dan dapat mengakses seluruh channel server.`,
      tone: 'success',
    });

    return InteractionHelper.safeReply(interaction, {
      embeds: [success],
      flags: MessageFlags.Ephemeral,
    });
  },
};
