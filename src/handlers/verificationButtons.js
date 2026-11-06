import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { buildPacilEmbed } from '../ui/pacil.js';
import { verifyUser } from '../services/verificationService.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { getGuildConfig } from '../services/config/guildConfig.js';

export async function handleVerificationButton(interaction, client) {
  try {
    await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

    if (!interaction.guild) {
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Tombol ini hanya dapat digunakan di dalam server.' });
    }

    const guild = interaction.guild;
    const userId = interaction.user.id;

    const guildConfig = await getGuildConfig(client, guild.id);
    const ssoEnabled = guildConfig.verification?.ssoEnabled ?? true;

    // 1. Check if user is already verified
    const verifiedRoleId = guildConfig.verification?.roleId;
    if (verifiedRoleId && interaction.member?.roles?.cache?.has(verifiedRoleId)) {
      const alreadyEmbed = buildPacilEmbed({
        title: 'Sudah Terverifikasi',
        icon: '✅',
        description: 'Akun kamu sudah terverifikasi dan telah memiliki akses ke seluruh channel server.',
        tone: 'success',
      });
      return await InteractionHelper.safeEditReply(interaction, { embeds: [alreadyEmbed] });
    }

    // 2. SSO UI Link Button
    if (ssoEnabled) {
      const port = process.env.PORT || 3000;
      const host = process.env.PUBLIC_URL || `http://localhost:${port}`;
      const loginUrl = `${host}/auth/sso/login?guildId=${guild.id}&userId=${userId}`;

      const ssoEmbed = buildPacilEmbed({
        title: 'Verifikasi Identitas Mahasiswa UI',
        icon: '🎓',
        description:
          'Silakan tekan tombol di bawah untuk melakukan login ke portal resmi **SSO UI** (`sso.ui.ac.id`).\n\n' +
          '• **Keamanan Data:** Kamu masuk langsung di server resmi UI. Bot tidak dapat melihat password kamu.\n' +
          '• **Hasil Otomatis:** Program studi (CS/SI) dan angkatan akan otomatis terbaca untuk pemberian role.',
        tone: 'gold',
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Masuk via SSO UI')
          .setStyle(ButtonStyle.Link)
          .setURL(loginUrl)
          .setEmoji('🔐'),
        new ButtonBuilder()
          .setCustomId('verify_user_manual')
          .setLabel('Verifikasi Manual (Tamu)')
          .setStyle(ButtonStyle.Secondary)
      );

      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [ssoEmbed],
        components: [row],
      });
    }

    // 3. Fallback direct verification
    const result = await verifyUser(client, guild.id, userId, {
      source: 'button_click',
      moderatorId: null,
    });

    if (result.status === 'already_verified') {
      const info = buildPacilEmbed({
        title: 'Sudah Terverifikasi',
        icon: 'ℹ️',
        description: 'Kamu sudah terverifikasi sebelumnya.',
        tone: 'info',
      });
      return await InteractionHelper.safeEditReply(interaction, { embeds: [info] });
    }

    const success = buildPacilEmbed({
      title: 'Verifikasi Berhasil',
      icon: '✅',
      description: `Selamat datang! Kamu telah mendapatkan role **${result.roleName}** dan dapat mengakses seluruh channel server.`,
      tone: 'success',
    });

    return await InteractionHelper.safeEditReply(interaction, { embeds: [success] });
  } catch (error) {
    logger.error('Error in verification button handler', {
      error: error.message,
      guildId: interaction.guild?.id,
      userId: interaction.user.id,
    });

    await handleInteractionError(
      interaction,
      error,
      { command: 'verify_button', action: 'verification' }
    );
  }
}

export default {
  customId: 'verify_user',
  execute: handleVerificationButton,
};
