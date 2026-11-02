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
import { renderConfessionSubPanel } from '../../../components/panels/confessionSubPanel.js';
import { renderWelcomeSubPanel } from '../../../components/panels/welcomeSubPanel.js';

export default {
  name: 'setupAction',
  async execute(interaction, client, [action]) {
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
        footer: 'Pacil Baik • Fasilkom UI Circle Automation',
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
            name: '🛡️ Keamanan & Etika',
            value:
              'Harap gunakan bahasa yang sopan. Pesan berisi pelecehan, doxxing, atau ujaran kebencian akan ditindak oleh moderator.',
            inline: false,
          },
        ],
        footer: 'Pacil Baik • Fasilkom UI Community Menfess',
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

    // 4. Toggle Review Moderator Menfess
    if (action === 'toggle_confess_approval') {
      const guildConfig = await getGuildConfig(client, interaction.guildId);
      const config = getConfessionConfig(guildConfig);
      const nextApproval = !config.requireApproval;

      await patchGuildConfig(client, interaction.guildId, {
        confessions: { ...config, requireApproval: nextApproval },
      });

      const updatedPanel = await renderConfessionSubPanel(client, interaction.guild);
      return interaction.update(updatedPanel);
    }

    // 5. Toggle Balasan Menfess
    if (action === 'toggle_confess_replies') {
      const guildConfig = await getGuildConfig(client, interaction.guildId);
      const config = getConfessionConfig(guildConfig);
      const nextReplies = config.repliesEnabled === false;

      await patchGuildConfig(client, interaction.guildId, {
        confessions: { ...config, repliesEnabled: nextReplies },
      });

      const updatedPanel = await renderConfessionSubPanel(client, interaction.guild);
      return interaction.update(updatedPanel);
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
  },
};
