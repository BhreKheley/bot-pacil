import {
  MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder,
  VideoQualityMode,
} from 'discord.js';
import {
  authorizeRoomAction, botCanManage, describeDiscordError, refreshPanel, setHidden, setLocked,
  setVideoMode, transferOwner,
} from '../../../services/voiceRoomService.js';
import { claimDecision, RTC_REGIONS, regionLabel } from '../../../services/voiceRoomLogic.js';
import { pacilId } from '../../../ui/pacil.js';
import { logger } from '../../../utils/logger.js';

const ephemeral = { flags: MessageFlags.Ephemeral };

function textModal(customId, title, label, { style = TextInputStyle.Short, value, min = 1, max = 100, required = true, placeholder } = {}) {
  const input = new TextInputBuilder().setCustomId('value').setLabel(label).setStyle(style).setMinLength(min).setMaxLength(max).setRequired(required);
  if (value !== undefined && value !== null && String(value) !== '') input.setValue(String(value).slice(0, max));
  if (placeholder) input.setPlaceholder(placeholder);
  return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(new ActionRowBuilder().addComponents(input));
}

export default {
  name: 'voiceControl',
  async execute(interaction, client, [action, channelId]) {
    const ctx = await authorizeRoomAction(interaction, client, channelId, { claim: action === 'claim' });
    if (!ctx) return;
    const { channel, room } = ctx;
    const modalId = (name) => pacilId(name, channelId);

    // Aksi berbentuk modal harus dijawab dengan showModal() langsung (tanpa defer).
    if (action === 'rename') return interaction.showModal(textModal(modalId('voiceControlRename'), 'Ganti Nama Ruang', 'Nama baru (maks. 100 karakter)', { value: channel.name, max: 100 }));
    if (action === 'limit') return interaction.showModal(textModal(modalId('voiceControlLimit'), 'Batas Pengguna', 'Batas orang (0 = tanpa batas, maks. 99)', { value: channel.userLimit || 0, max: 2, placeholder: '0' }));
    if (action === 'bitrate') {
      const maxKbps = Math.min(384, Math.floor((channel.guild.maximumBitrate || 96000) / 1000));
      return interaction.showModal(textModal(modalId('voiceControlBitrate'), 'Bitrate Suara', `Bitrate dalam kbps (8–${maxKbps})`, { value: Math.round((channel.bitrate || 64000) / 1000), max: 3 }));
    }
    if (action === 'status') return interaction.showModal(textModal(modalId('voiceControlStatus'), 'Status Ruang', 'Status ruang (kosongkan untuk menghapus)', { value: room.status ?? '', min: 0, max: 500, required: false, style: TextInputStyle.Paragraph, placeholder: 'Contoh: Belajar bareng buat UTS DDP' }));

    if (action === 'region') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(pacilId('voiceMenu', 'region', channelId))
        .setPlaceholder('Pilih region suara…')
        .addOptions(RTC_REGIONS.map((r) => ({ label: r.label, value: r.value, default: r.rtc === (channel.rtcRegion ?? null) })));
      return interaction.reply({ content: `Region sekarang: **${regionLabel(channel.rtcRegion)}**. Pilih region baru:`, components: [new ActionRowBuilder().addComponents(menu)], ...ephemeral });
    }

    // Aksi lain memanggil API Discord, jadi acknowledge dulu agar tidak kedaluwarsa (3 detik).
    await interaction.deferUpdate();
    const fail = (error) => {
      logger.warn(`Voice control ${action} gagal di ${channelId}: ${error?.message}`);
      return interaction.followUp({ content: describeDiscordError(error), ...ephemeral }).catch(() => {});
    };

    try {
      if (action === 'lock') await setLocked(client, channel, !room.locked, interaction.user.id);
      else if (action === 'hide') await setHidden(client, channel, !room.hidden, interaction.user.id);
      else if (action === 'video') await setVideoMode(client, channel, channel.videoQualityMode !== VideoQualityMode.Full, interaction.user.id);
      else if (action === 'claim') {
        const decision = claimDecision({
          record: room,
          claimerId: interaction.user.id,
          claimerInRoom: channel.members.has(interaction.user.id),
          ownerInRoom: channel.members.has(room.ownerId),
        });
        if (!decision.ok) {
          const text = {
            claimerNotInRoom: 'Kamu harus berada di ruang voice ini untuk mengklaimnya.',
            alreadyOwner: 'Kamu sudah menjadi pemilik ruang ini.',
            ownerPresent: 'Pemilik masih ada di ruang, jadi belum bisa diklaim.',
          }[decision.reason];
          return interaction.followUp({ content: text, ...ephemeral });
        }
        if (!botCanManage(channel)) return interaction.followUp({ content: describeDiscordError({ code: 50013 }), ...ephemeral });
        await transferOwner(client, channel, interaction.user.id, interaction.user.id);
        await channel.send({ content: `-# 👑 ${interaction.user} sekarang menjadi pemilik ruang ini.`, allowedMentions: { parse: [] } }).catch(() => {});
      }
    } catch (error) {
      return fail(error);
    }
    return refreshPanel(client, channel);
  },
};
