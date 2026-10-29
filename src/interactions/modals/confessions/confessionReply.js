import { MessageFlags } from 'discord.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import {
  confessionKey, confessionReplyKey, confessionReplyCooldownKey, getConfessionConfig,
  newConfessionId, registerShortId, replyEmbed,
} from '../../../services/confessionService.js';
import {
  canReplyTo, normalizeReplyContent, replyCooldownRemainingMs, resolveReplyLabel, shortId,
} from '../../../services/confessionLogic.js';
import { Mutex } from '../../../utils/mutex.js';
import { logger } from '../../../utils/logger.js';
import { t } from '../../../utils/i18n.js';

/** Ambil thread menfess; buat dari pesan terbit jika belum ada. */
async function ensureThread(interaction, client, confession, config) {
  if (confession.threadId) {
    const existing = await client.channels.fetch(confession.threadId).catch(() => null);
    if (existing?.isThread?.()) {
      if (existing.archived) await existing.setArchived(false).catch(() => {});
      return existing;
    }
  }
  const channelId = confession.publishedChannelId || config.channelId;
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  const message = channel?.messages ? await channel.messages.fetch(confession.publishedMessageId).catch(() => null) : null;
  if (!message) return null;
  const thread = message.thread ?? await message.startThread({
    name: `Balasan menfess #${shortId(confession.id)}`,
    autoArchiveDuration: 1440,
  });
  confession.threadId = thread.id;
  return thread;
}

export default {
  name: 'confessReplyModal',
  async execute(interaction, client, [id]) {
    if (!interaction.guildId) return;
    const ephemeral = { flags: MessageFlags.Ephemeral };
    const guildId = interaction.guildId;

    const config = getConfessionConfig(await getGuildConfig(client, guildId));
    const content = normalizeReplyContent(interaction.fields.getTextInputValue('content'));
    if (!content) return interaction.reply({ content: t(interaction, 'invalidContent'), ...ephemeral });

    const cooldownKey = confessionReplyCooldownKey(guildId, interaction.user.id);
    const remaining = replyCooldownRemainingMs(await client.db.get(cooldownKey, 0), config.replyCooldownSeconds);
    if (remaining > 0) {
      return interaction.reply({ content: t(interaction, 'replyTooFast', { seconds: Math.ceil(remaining / 1000) }), ...ephemeral });
    }

    await interaction.deferReply(ephemeral);

    try {
      // Satu kunci per menfess: mencegah dua thread ganda dan nomor "Anonim N" yang bentrok.
      const outcome = await Mutex.runExclusive(`confession-reply:${guildId}:${id}`, async () => {
        const key = confessionKey(guildId, id);
        const confession = await client.db.get(key, null);
        const check = canReplyTo(confession, config);
        if (!check.ok) return { error: check.reason === 'repliesDisabled' ? 'replyDisabled' : check.reason === 'disabled' ? 'disabled' : 'replyNotAvailable' };

        const thread = await ensureThread(interaction, client, confession, config);
        if (!thread) return { error: 'replyNotAvailable' };

        const { label, participants } = resolveReplyLabel(confession, interaction.user.id);
        const reply = { id: newConfessionId(), confessionId: id, guildId, authorId: interaction.user.id, label, content, createdAt: Date.now() };

        const posted = await thread.send({ embeds: [replyEmbed(reply, interaction)], allowedMentions: { parse: [] } });
        reply.messageId = posted.id;
        reply.threadId = thread.id;

        confession.participants = participants;
        confession.replyCount = (confession.replyCount || 0) + 1;
        await client.db.set(confessionReplyKey(guildId, reply.id), reply);
        await registerShortId(client, guildId, 'reply', reply.id);
        await client.db.set(key, confession);
        return { ok: true };
      });

      if (outcome.error) return interaction.editReply({ content: t(interaction, outcome.error) });
      await client.db.set(cooldownKey, Date.now());
      return interaction.editReply({ content: t(interaction, 'replySent') });
    } catch (error) {
      logger.error('Gagal mengirim balasan menfess:', error);
      return interaction.editReply({ content: t(interaction, 'replyThreadFailed') });
    }
  },
};
