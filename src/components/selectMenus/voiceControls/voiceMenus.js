import { ActionRowBuilder, MessageFlags, UserSelectMenuBuilder } from 'discord.js';
import {
  allowUser, authorizeRoomAction, blockUser, botCanManage, describeDiscordError, kickUser, refreshPanel,
  resetUser, transferOwner,
} from '../../../services/voiceRoomService.js';
import { RTC_REGIONS, regionLabel, userActionDecision } from '../../../services/voiceRoomLogic.js';
import { pacilId } from '../../../ui/pacil.js';
import { logger } from '../../../utils/logger.js';

const ephemeral = { flags: MessageFlags.Ephemeral };

const ACTION_TEXT = {
  allow: { prompt: 'Pilih pengguna yang ingin **diizinkan** masuk (walau ruang terkunci atau tersembunyi):', multi: true },
  block: { prompt: 'Pilih pengguna yang ingin **diblokir** dari ruang ini:', multi: true },
  reset: { prompt: 'Pilih pengguna yang izin atau blokirnya ingin **dicabut**:', multi: true },
  kick: { prompt: 'Pilih pengguna yang ingin **dikeluarkan** dari ruang sekarang:', multi: true },
  transfer: { prompt: 'Pilih satu pengguna di ruang ini yang akan menjadi **pemilik baru**:', multi: false },
};

const REASON_TEXT = {
  noTarget: 'Pengguna tidak ditemukan.',
  targetIsBot: 'Bot tidak bisa dipilih.',
  targetIsSelf: 'Kamu tidak bisa memilih dirimu sendiri untuk aksi ini.',
  targetIsOwner: 'Pemilik ruang tidak bisa dipilih untuk aksi ini.',
  targetNotInRoom: 'Pengguna itu tidak sedang berada di ruang ini.',
  listFull: 'Daftar sudah penuh (maksimal 20). Cabut beberapa dulu.',
};

/** Menu string: langkah pertama "Kelola pengguna" dan pilihan region. */
const voiceMenu = {
  name: 'voiceMenu',
  async execute(interaction, client, [kind, channelId]) {
    const ctx = await authorizeRoomAction(interaction, client, channelId);
    if (!ctx) return;
    const { channel } = ctx;
    const value = interaction.values[0];

    if (kind === 'region') {
      const region = RTC_REGIONS.find((r) => r.value === value);
      if (!region) return interaction.update({ content: 'Region tidak dikenal.', components: [] });
      try {
        await channel.setRTCRegion(region.rtc, `Voice room: region ${region.label} oleh ${interaction.user.id}`);
      } catch (error) {
        logger.warn(`Region voice ${channelId} gagal: ${error.message}`);
        return interaction.update({ content: describeDiscordError(error), components: [] });
      }
      await interaction.update({ content: `🌐 Region diatur ke **${regionLabel(region.rtc)}**.`, components: [] });
      return refreshPanel(client, channel);
    }

    if (kind === 'user') {
      const spec = ACTION_TEXT[value];
      if (!spec) return interaction.deferUpdate();
      const picker = new UserSelectMenuBuilder()
        .setCustomId(pacilId('voiceUser', value, channelId))
        .setPlaceholder('Pilih pengguna…')
        .setMinValues(1)
        .setMaxValues(spec.multi ? 5 : 1);
      await interaction.reply({ content: spec.prompt, components: [new ActionRowBuilder().addComponents(picker)], ...ephemeral });
      // Render ulang panel supaya pilihan di menu utama kembali ke placeholder.
      return refreshPanel(client, channel);
    }
    return interaction.deferUpdate();
  },
};

/** Menu pengguna: langkah kedua, menjalankan aksi pada pengguna terpilih. */
const voiceUser = {
  name: 'voiceUser',
  async execute(interaction, client, [action, channelId]) {
    const ctx = await authorizeRoomAction(interaction, client, channelId);
    if (!ctx) return;
    const { channel, room } = ctx;
    if (!ACTION_TEXT[action]) return interaction.deferUpdate();
    if (['allow', 'block', 'kick', 'transfer'].includes(action) && !botCanManage(channel)) {
      return interaction.update({ content: describeDiscordError({ code: 50013 }), components: [] });
    }

    await interaction.deferUpdate();
    const results = [];
    for (const id of interaction.values) {
      const target = interaction.users.get(id);
      const decision = userActionDecision(action, {
        record: room,
        actorId: interaction.user.id,
        target: target ? { id, bot: target.bot } : null,
        targetInRoom: channel.members.has(id),
      });
      if (!decision.ok) { results.push(`❌ <@${id}>: ${REASON_TEXT[decision.reason] ?? 'tidak bisa diproses.'}`); continue; }
      try {
        let outcome = { ok: true };
        if (action === 'allow') outcome = await allowUser(client, channel, id, interaction.user.id);
        else if (action === 'block') outcome = await blockUser(client, channel, id, interaction.user.id);
        else if (action === 'reset') outcome = await resetUser(client, channel, id, interaction.user.id);
        else if (action === 'kick') outcome = await kickUser(channel, id, interaction.user.id);
        else if (action === 'transfer') outcome = await transferOwner(client, channel, id, interaction.user.id);
        results.push(outcome.error ? `❌ <@${id}>: ${REASON_TEXT[outcome.error] ?? 'gagal.'}` : `✅ <@${id}>`);
      } catch (error) {
        logger.warn(`Voice user action ${action} gagal untuk ${id}: ${error.message}`);
        results.push(`❌ <@${id}>: ${describeDiscordError(error)}`);
      }
    }
    await interaction.editReply({ content: results.join('\n'), components: [], allowedMentions: { parse: [] } });
    return refreshPanel(client, channel);
  },
};

export default [voiceMenu, voiceUser];
