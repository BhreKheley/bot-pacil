import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';
import { getGuildConfig, patchGuildConfig } from '../../../services/config/guildConfig.js';
import { getConfessionConfig } from '../../../services/confessionService.js';
import { guildCirclesListKey, getCircle } from '../../../services/circleService.js';
import { renderWelcomeSubPanel } from '../../../ui/panels/welcomeSubPanel.js';
import { renderRulesGuidePublicEmbed } from '../../../ui/panels/rulesGuideSubPanel.js';
import { renderBoosterPublicPanel } from '../../../ui/panels/boosterSubPanel.js';
import { renderMusicStatusEmbed } from '../../../ui/panels/musicSubPanel.js';

export async function handleSetupAction(interaction, client, action) {
  {
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

    // 6. Toggle Welcome System
    if (action === 'toggle_welcome') {
      const guildConfig = await getGuildConfig(client, interaction.guildId);
      const welcome = guildConfig.welcome || {};
      const nextState = !welcome.enabled;

      await patchGuildConfig(client, interaction.guildId, {
        welcome: { ...welcome, enabled: nextState },
      });

      const updatedPanel = await renderWelcomeSubPanel(client, interaction.guild);
      return interaction.update(updatedPanel);
    }

    // 7. Preview Greeting
    if (action === 'test_welcome') {
      const member = interaction.member;
      const previewEmbed = buildPacilEmbed({
        title: `Selamat Datang di Pacil Baik, ${member.user.username}! 🎉`,
        description:
          `Halo <@${member.id}>, selamat datang di rumah digital mahasiswa Fakultas Ilmu Komputer Universitas Indonesia!\n\n` +
          `Silakan mampir ke channel <#${interaction.channelId}> untuk membaca panduan awal dan mulai berkenalan dengan teman-teman sesama anak Pacil!`,
        tone: 'gold',
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 512 }),
        fields: [
          { name: '👤 Username', value: member.user.tag, inline: true },
          { name: '📍 Member Ke-', value: `#${interaction.guild.memberCount}`, inline: true },
          { name: '🔗 Diundang oleh', value: 'Direct / Server Link', inline: true },
          { name: '📚 Langkah Pertama', value: 'Baca panduan di `#start-here` dan ambil role angkatanmu di `#reaction-roles`!', inline: false },
        ],
      });

      return interaction.reply({
        content: '*(Preview tampilan kartu sambutan kedatangan)*',
        embeds: [previewEmbed],
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

      await interaction.channel.send({ embeds: [rulesEmbed] });
      return interaction.reply({
        content: `✅ Embed Tata Tertib berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 9. Pasang Interactive Guide
    if (action === 'deploy_guide') {
      const guidePayload = renderRulesGuidePublicEmbed('server');
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
      const trackerEmbed = renderMusicStatusEmbed(interaction.guild);
      await interaction.channel.send({ embeds: [trackerEmbed] });
      return interaction.reply({
        content: `✅ Live Music Bot Tracker berhasil dikirim ke <#${interaction.channelId}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 12. Refresh Music Panel
    if (action === 'refresh_music_panel') {
      const trackerEmbed = renderMusicStatusEmbed(interaction.guild);
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
  }
}
