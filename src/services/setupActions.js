import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../ui/pacil.js';
import { getGuildConfig, patchGuildConfig } from '../services/config/guildConfig.js';
import { getConfessionConfig } from '../services/confessionService.js';
import { guildCirclesListKey, getCircle } from '../services/circleService.js';
import { getGuideOverrides } from '../services/guideService.js';
import { renderRulesGuidePublicEmbed } from '../ui/panels/rulesGuideSubPanel.js';
import { renderBoosterPublicPanel } from '../ui/panels/boosterSubPanel.js';
import { getTrackedBotIds } from '../services/musicTrackerService.js';
import { renderMusicStatusEmbed } from '../ui/panels/musicSubPanel.js';
import { buildStaffListEmbed } from '../commands/Community/staff.js';
import { buildCategoryTicketPanel } from './ticket/ticketCategoryPanels.js';
import { buildCustomRolePanel } from './customRoleService.js';
import { getCachedGuideCard, renderRulesGuideCard } from '../utils/imageGenerator.js';

export async function handleSetupAction(interaction, client, action) {
  {
    if (action === 'circle_approval_on' || action === 'circle_approval_off') {
      const on = action === 'circle_approval_on';
      await patchGuildConfig(client, interaction.guildId, {
        circle: { requireApproval: on, reviewChannelId: on ? interaction.channelId : null },
      });
      return interaction.reply({
        content: on
          ? `✅ Permintaan Circle kini butuh persetujuan; antrean dikirim ke <#${interaction.channelId}>.`
          : '✅ Persetujuan Circle dimatikan; circle langsung dibuat.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 1. Pasang Panel Publik Circle
    if (action === 'deploy_circle_panel') {
      const panelEmbed = buildPacilEmbed({
        title: '👥 Pacil Baik Circle Hub',
        description:
          'Butuh ruang privat buat nugas kelompok, belajar bareng ujian, atau sekadar tongkrongan circle kamu?\n\n' +
          'Tekan tombol di bawah untuk meminta pembuatan **Private Circle** otomatis! Kamu akan mendapatkan Role khusus, Kategori privat, Text Channel, dan Voice Channel yang hanya bisa diakses oleh kelompokmu.',
        tone: 'gold',
        fields: [
          {
            name: '✨ Fitur Circle',
            value:
              '• Kategori & Channel 100% Privat\n• Text & Voice Channel eksklusif\n• Bebas undang teman pakai `/circle add @user`',
            inline: false,
          },
          {
            name: '📌 Catatan',
            value: 'Setiap mahasiswa hanya dapat memiliki 1 Circle aktif sebagai owner.',
            inline: false,
          },
        ],
      });

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('circleRequest')
          .setLabel('Request Circle Room')
          .setEmoji('👥')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({
        embeds: [panelEmbed],
        components: [buttonRow],
      });

      return interaction.reply({
        content: `✅ Panel Circle Hub berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. Daftar Circle Aktif
    if (action === 'list_circles') {
      const circlesList = (await client.db.get(guildCirclesListKey(interaction.guildId), [])) || [];
      if (circlesList.length === 0) {
        return interaction.reply({
          content: 'Belum ada Private Circle aktif yang tercatat di server ini.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const fields = [];
      for (const circleId of circlesList.slice(0, 15)) {
        const c = await getCircle(client, interaction.guildId, circleId);
        if (c) {
          fields.push({
            name: `🔒 ${c.name}`,
            value: `• Owner: <@${c.ownerId}>\n• Role: <@&${c.roleId}>\n• Anggota: ${c.members?.length || 1} orang`,
            inline: true,
          });
        }
      }

      const listEmbed = buildPacilEmbed({
        title: '📋 Daftar Private Circle Aktif',
        description: `Menampilkan ${fields.length} circle dari total ${circlesList.length} circle:`,
        tone: 'navy',
        fields,
      });

      return interaction.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
    }

    // 3. Pasang Panel Publik Menfess
    if (action === 'deploy_confess_panel') {
      const panelEmbed = buildPacilEmbed({
        title: '💌 Pacil Baik Menfess Corner',
        description:
          'Punya keluh kesah, salam, apresiasi, atau curhatan seputar kampus Fasilkom UI? Kirimkan menfess kamu secara terstruktur dan aman (100% anonim dari publik) melalui tombol di bawah!',
        tone: 'gold',
        fields: [
          {
            name: '📝 Format Menfess',
            value:
              '• **From:** Nama samaran / inisial / anonim\n• **To:** Target (Angkatan/Kelas/Individu)\n• **Message:** Isi pesan atau curhatan kamu',
            inline: false,
          },
          {
            name: '💬 Balasan Anonim',
            value: 'Setiap menfess yang terbit dapat dibalas oleh mahasiswa lain melalui untaian thread anonim!',
            inline: false,
          },
          {
            name: '🛡️ Keamanan & Etika',
            value:
              'Harap gunakan bahasa yang sopan. Pesan berisi pelecehan, doxxing, atau ujaran kebencian akan ditindak oleh moderator.',
            inline: false,
          },
        ],
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confessOpen')
          .setLabel('Kirim Menfess')
          .setEmoji('💌')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
      return interaction.reply({
        content: `✅ Panel Menfess berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 8. Pasang Embed Rules
    if (action === 'deploy_rules') {
      const rulesEmbed = buildPacilEmbed({
        title: '📜 Tata Tertib & Peraturan Komunitas Pacil Baik',
        description:
          'Demi kenyamanan dan lingkungan belajar yang suportif bagi seluruh mahasiswa Fasilkom UI, seluruh anggota wajib mematuhi aturan berikut:',
        tone: 'gold',
        fields: [
          {
            name: '1️⃣ Community Guidelines (Etika Akademik & Inklusivitas)',
            value:
              '• **Saling Menghargai:** Jaga sopan santun antar mahasiswa lintas angkatan dan program studi.\n' +
              '• **Inklusif & Bebas Diskriminasi:** Dilarang keras melakukan perundungan (cyberbullying), ujaran kebencian, pelecehan, atau provokasi SARA.\n' +
              '• **Integritas Akademik:** Dilarang membagikan jawaban ujian resmi atau meminta kode tugas akhir secara terang-terangan yang melanggar kode etik Fasilkom UI.',
            inline: false,
          },
          {
            name: '2️⃣ Server Etiquette (Ketertiban Diskusi)',
            value:
              '• **Gunakan Channel yang Relevan:** Diskusi tugas di `#tugas-diskusi`, santai di `#general`, dan menfess di `#confess-pacil`.\n' +
              '• **Privasi Terjaga:** Dilarang membocorkan data pribadi (*doxxing*) siapa pun tanpa izin.\n' +
              '• **Bebas Spam:** Dilarang spam mention, invite link liar, atau flood pesan/media.',
            inline: false,
          },
        ],
        footer: 'Makara Fasilkom UI • Dewan Kehormatan Mahasiswa Pacil',
      });

      let files = [];
      try {
        const cardBuffer = await getCachedGuideCard('rules-guide-card', renderRulesGuideCard, { guildName: interaction.guild?.name });
        if (cardBuffer) {
          files.push(new AttachmentBuilder(cardBuffer, { name: 'rules-guide.png' }));
          rulesEmbed.setImage('attachment://rules-guide.png');
        }
      } catch {}

      await interaction.channel.send({ embeds: [rulesEmbed], files });
      return interaction.reply({
        content: `✅ Embed Tata Tertib berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 9. Pasang Interactive Guide
    if (action === 'deploy_guide') {
      const guidePayload = renderRulesGuidePublicEmbed('server', await getGuideOverrides(client, interaction.guildId));
      await interaction.channel.send(guidePayload);
      return interaction.reply({
        content: `✅ Interactive Guide berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 10. Pasang Panel Publik Booster
    if (action === 'deploy_booster_panel') {
      const boosterPayload = renderBoosterPublicPanel();
      await interaction.channel.send(boosterPayload);
      return interaction.reply({
        content: `✅ Panel Booster Lounge berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 11. Pasang Tracker Live Music
    if (action === 'deploy_music_tracker') {
      const trackerEmbed = renderMusicStatusEmbed(interaction.guild, await getTrackedBotIds(client, interaction.guildId));
      await interaction.channel.send({ embeds: [trackerEmbed] });
      return interaction.reply({
        content: `✅ Live Music Bot Tracker berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 12. Refresh Music Panel
    if (action === 'refresh_music_panel') {
      const trackerEmbed = renderMusicStatusEmbed(interaction.guild, await getTrackedBotIds(client, interaction.guildId));
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

      return interaction.update({
        embeds: [trackerEmbed],
        components: [buttonRow],
      });
    }

    // 13. Pasang Panel Tiket
    if (action === 'deploy_ticket_panel') {
      const panelEmbed = buildPacilEmbed({
        title: '🎫 Pusat Bantuan & Tiket Mahasiswa',
        description:
          'Ada kendala terkait server, bot, akademik, atau butuh bantuan moderator?\n\n' +
          'Tekan tombol di bawah untuk membuat tiket bantuan privat bersama tim staf Pacil Baik.',
        tone: 'gold',
        fields: [
          {
            name: '📌 Ketentuan Tiket',
            value: '• Jelaskan pertanyaan atau kendala kamu dengan sopan dan rinci.\n• Tiket hanya dapat diakses oleh kamu dan tim staf yang bertugas.',
            inline: false,
          },
        ],
      });

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Buka Tiket Bantuan')
          .setEmoji('📩')
          .setStyle(ButtonStyle.Primary)
      );

      const sent = await interaction.channel.send({ embeds: [panelEmbed], components: [buttonRow] });
      await patchGuildConfig(client, interaction.guildId, {
        ticketPanelChannelId: interaction.channelId,
        ticketPanelMessageId: sent.id,
      });

      return interaction.reply({
        content: `✅ Panel Tiket Bantuan berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 14. Pasang Panel Verifikasi
    if (action === 'deploy_verify_panel') {
      const config = await getGuildConfig(client, interaction.guildId);
      const roleMention = config.verification?.roleId ? `<@&${config.verification.roleId}>` : 'Role Mahasiswa';
      const panelEmbed = buildPacilEmbed({
        title: '✅ Verifikasi Mahasiswa Fasilkom UI',
        description:
          'Selamat datang di server komunitas **Pacil Baik**!\n\n' +
          'Untuk mendapatkan akses penuh ke seluruh channel akademik, ruang tugas, dan interaksi mahasiswa, silakan verifikasi dirimu dengan menekan tombol di bawah.',
        tone: 'gold',
        fields: [
          {
            name: '🎓 Benefit Verifikasi',
            value: `• Membuka channel diskusi dan ruang tugas\n• Mendapatkan peran ${roleMention}\n• Menghindari batasan akun baru`,
            inline: false,
          },
        ],
      });

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_user')
          .setLabel('Verifikasi Sekarang')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      const sent = await interaction.channel.send({ embeds: [panelEmbed], components: [buttonRow] });
      await patchGuildConfig(client, interaction.guildId, {
        verification: {
          ...(config.verification || {}),
          enabled: true,
          channelId: interaction.channelId,
          messageId: sent.id,
        },
      });

      return interaction.reply({
        content: `✅ Panel Verifikasi berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 15. Pasang Panel Staff
    if (action === 'deploy_staff_panel') {
      const embed = await buildStaffListEmbed(interaction.guild);
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({
        content: `✅ Panel Daftar Staff berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 16. Pasang Panel Kategori Tiket
    if (action.startsWith('deploy_ticket_cat_')) {
      const catKey = action.replace('deploy_ticket_cat_', '');
      const panel = buildCategoryTicketPanel(catKey);
      await interaction.channel.send(panel);
      return interaction.reply({
        content: `✅ Panel Tiket **${catKey.toUpperCase()}** berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 17. Pasang Panel Custom Role
    if (action === 'deploy_customrole_panel') {
      const panel = buildCustomRolePanel();
      await interaction.channel.send(panel);
      return interaction.reply({
        content: `✅ Panel Custom Role berhasil dipasang di <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
