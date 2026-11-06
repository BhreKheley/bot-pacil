import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, patchGuildConfig } from './config/guildConfig.js';
import { renderVerificationSubPanel } from '../ui/panels/verificationSubPanel.js';
import { renderVerifyGuideCard } from '../utils/imageGenerator.js';
import { buildPacilEmbed } from '../ui/pacil.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';

export async function handleVerificationConfigAction(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const guildConfig = await getGuildConfig(client, guild.id);
  const verif = guildConfig.verification || {};

  // 1. Channel Select
  if (customId === 'setup:verif:channel') {
    const channelId = interaction.values?.[0] || null;
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, channelId },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: channelId ? `✅ Channel verifikasi diatur ke <#${channelId}>.` : 'ℹ️ Channel verifikasi dikosongkan.',
    });
    return interaction.update(panel);
  }

  // 2. Role Select (Verified Role)
  if (customId === 'setup:verif:role') {
    const roleId = interaction.values?.[0] || null;
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, roleId },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: roleId ? `✅ Role terverifikasi diatur ke <@&${roleId}>.` : 'ℹ️ Role terverifikasi dikosongkan.',
    });
    return interaction.update(panel);
  }

  // 3. Unverified Role Select
  if (customId === 'setup:verif:unverified_role') {
    const unverifiedRoleId = interaction.values?.[0] || null;
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, unverifiedRoleId },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: unverifiedRoleId ? `✅ Role tamu (unverified) diatur ke <@&${unverifiedRoleId}>.` : 'ℹ️ Role tamu dikosongkan.',
    });
    return interaction.update(panel);
  }

  // 4. Toggle Enabled
  if (customId === 'setup:verif:toggle') {
    const next = !Boolean(verif.enabled);
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, enabled: next },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: next ? '✅ Sistem verifikasi diaktifkan.' : '⏸️ Sistem verifikasi dinonaktifkan.',
    });
    return interaction.update(panel);
  }

  // 5. Toggle SSO Mode
  if (customId === 'setup:verif:sso_toggle') {
    const current = verif.ssoEnabled ?? true;
    const next = !current;
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, ssoEnabled: next },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: next
        ? '🔐 Mode autentikasi diatur ke **SSO UI (sso.ui.ac.id)**.'
        : '🔘 Mode autentikasi diatur ke **Manual (Klik Langsung)**.',
    });
    return interaction.update(panel);
  }

  // 6. Toggle Auto Nickname
  if (customId === 'setup:verif:nick_toggle') {
    const current = verif.autoNickname ?? true;
    const next = !current;
    await patchGuildConfig(client, guild.id, {
      verification: { ...verif, autoNickname: next },
    });
    const panel = await renderVerificationSubPanel(client, guild, {
      notice: next
        ? '✏️ Auto-format nickname diaktifkan (`Nama (CS\'XX)`).'
        : '⚪ Auto-format nickname dinonaktifkan.',
    });
    return interaction.update(panel);
  }

  // 7. Deploy Verification Panel
  if (customId === 'setup:verif:deploy') {
    const channelId = verif.channelId || interaction.channelId;
    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      const panel = await renderVerificationSubPanel(client, guild, {
        notice: '❌ Channel tujuan tidak ditemukan. Pilih channel terlebih dahulu.',
      });
      return interaction.update(panel);
    }

    try {
      const cardBuffer = await renderVerifyGuideCard({ guildName: guild.name });
      const file = new AttachmentBuilder(cardBuffer, { name: 'verify-guide.png' });

      const verifyEmbed = buildPacilEmbed({
        title: 'PORTAL VERIFIKASI MAHASISWA UI',
        icon: '🎓',
        description:
          'Selamat datang di server komunitas mahasiswa **Fakultas Ilmu Komputer Universitas Indonesia**!\n\n' +
          'Silakan lakukan verifikasi status mahasiswa kamu melalui portal resmi **SSO UI** untuk membuka akses seluruh channel, ruang tugas, dan diskusi angkatan.',
        tone: 'gold',
        image: 'attachment://verify-guide.png',
        fields: [
          {
            name: 'Keamanan Data',
            value: 'Login dilakukan langsung di `sso.ui.ac.id`. Bot tidak pernah melihat atau menyimpan password kamu.',
            inline: false,
          },
          {
            name: 'Role yang Diberikan Otomatis',
            value: '• **Warga Pacil** (Role Utama)\n• **Program Studi** (Ilmu Komputer / Sistem Informasi)\n• **Angkatan** (Tahun Masuk Mahasiswa)',
            inline: false,
          },
        ],
      });

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_user')
          .setLabel('Mulai Verifikasi SSO UI')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔐')
      );

      await channel.send({
        embeds: [verifyEmbed],
        components: [buttonRow],
        files: [file],
      });

      const panel = await renderVerificationSubPanel(client, guild, {
        notice: `🚀 Panel verifikasi berhasil dipasang di ${channel.toString()}!`,
      });
      return interaction.update(panel);
    } catch (err) {
      logger.error('Error deploying verification panel:', err);
      const panel = await renderVerificationSubPanel(client, guild, {
        notice: `❌ Gagal memasang panel verifikasi: ${err.message}`,
      });
      return interaction.update(panel);
    }
  }
}

