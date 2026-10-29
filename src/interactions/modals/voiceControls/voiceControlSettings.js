import { MessageFlags } from 'discord.js';
import { authorizeRoomAction, describeDiscordError, refreshPanel, setStatus } from '../../../services/voiceRoomService.js';
import { parseBitrateKbps, parseUserLimit, sanitizeRoomStatus } from '../../../services/voiceRoomLogic.js';
import { logger } from '../../../utils/logger.js';

const ephemeral = { flags: MessageFlags.Ephemeral };

/** Bungkus pola yang sama: otorisasi → validasi → aksi → segarkan panel. */
function settingsModal(name, apply) {
  return {
    name,
    async execute(interaction, client, [channelId]) {
      const ctx = await authorizeRoomAction(interaction, client, channelId);
      if (!ctx) return;
      const raw = interaction.fields.getTextInputValue('value');
      await interaction.deferReply(ephemeral);
      try {
        const message = await apply({ interaction, client, channel: ctx.channel, raw });
        if (message.error) return interaction.editReply({ content: message.error });
        await refreshPanel(client, ctx.channel);
        return interaction.editReply({ content: message.ok });
      } catch (error) {
        logger.warn(`${name} gagal di ${channelId}: ${error.message}`);
        return interaction.editReply({ content: describeDiscordError(error) });
      }
    },
  };
}

export default [
  settingsModal('voiceControlLimit', async ({ channel, raw }) => {
    const parsed = parseUserLimit(raw);
    if (!parsed.ok) return { error: 'Batas harus berupa angka 0 sampai 99 (0 = tanpa batas).' };
    await channel.setUserLimit(parsed.value, 'Voice room: batas pengguna diubah');
    return { ok: parsed.value === 0 ? '👥 Batas pengguna dihapus (tanpa batas).' : `👥 Batas pengguna diatur ke **${parsed.value}** orang.` };
  }),
  settingsModal('voiceControlBitrate', async ({ channel, raw }) => {
    const parsed = parseBitrateKbps(raw, channel.guild.maximumBitrate);
    if (!parsed.ok) {
      return { error: parsed.error === 'bitrateTooHigh'
        ? `Bitrate maksimal untuk server ini adalah **${parsed.maxKbps} kbps** (naik level boost untuk batas lebih tinggi).`
        : 'Bitrate harus berupa angka dalam kbps, minimal 8.' };
    }
    await channel.setBitrate(parsed.value, 'Voice room: bitrate diubah');
    return { ok: `🎚️ Bitrate diatur ke **${parsed.kbps} kbps**.` };
  }),
  settingsModal('voiceControlStatus', async ({ interaction, client, channel, raw }) => {
    const text = sanitizeRoomStatus(raw);
    await setStatus(client, channel, text, interaction.user.id);
    return { ok: text ? `📝 Status ruang diatur: **${text}**` : '📝 Status ruang dihapus.' };
  }),
];
