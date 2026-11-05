import { AttachmentBuilder, MessageFlags } from 'discord.js';
import { patchGuildConfig, getGuildConfig } from './config/guildConfig.js';
import { renderBirthdaySubPanel } from '../ui/panels/birthdaySubPanel.js';
import { renderBirthdayCard } from '../utils/imageGenerator.js';
import { buildPacilEmbed } from '../ui/pacil.js';

export async function handleBirthdaySelect(interaction, client, [action]) {
  const guildId = interaction.guildId;
  const value = interaction.values?.[0] || null;

  if (action === 'channel') {
    await patchGuildConfig(client, guildId, { birthdayChannelId: value });
    const payload = await renderBirthdaySubPanel(client, interaction.guild, {
      notice: value ? `✅ Channel pengumuman diatur ke <#${value}>.` : '✅ Channel pengumuman dinonaktifkan.',
    });
    return interaction.update(payload);
  }

  if (action === 'role') {
    await patchGuildConfig(client, guildId, { birthdayRoleId: value });
    const payload = await renderBirthdaySubPanel(client, interaction.guild, {
      notice: value ? `✅ Role ulang tahun diatur ke <@&${value}>.` : '✅ Role ulang tahun dinonaktifkan.',
    });
    return interaction.update(payload);
  }
}

export async function handleBirthdayButton(interaction, client, [action]) {
  if (action === 'test') {
    let files = [];
    try {
      const cardBuffer = await renderBirthdayCard({
        member: interaction.member,
        guild: interaction.guild,
        dateString: 'Contoh: 17 Agustus',
        wish: 'Selamat ulang tahun dari keluarga besar Fasilkom UI! Semoga sukses studi dan berkarya!',
      });
      if (cardBuffer) {
        files.push(new AttachmentBuilder(cardBuffer, { name: 'birthday-card.png' }));
      }
    } catch {}

    const embed = buildPacilEmbed({
      title: '🎉 [PREVIEW] SELAMAT ULANG TAHUN WARGA PACIL! 🎂',
      description: `Ini adalah contoh tampilan pengumuman ulang tahun untuk ${interaction.user.toString()}! 🎈\n\nSemoga panjang umur, sehat selalu, lancar nugas dan praktikum di Fasilkom UI!`,
      tone: 'gold',
      image: files.length ? 'attachment://birthday-card.png' : undefined,
      footer: 'Preview Kartu Ulang Tahun • Pacil Baik',
    });

    return interaction.reply({
      embeds: [embed],
      files,
      flags: MessageFlags.Ephemeral,
    });
  }
}
