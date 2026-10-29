import {
  MessageFlags, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} from 'discord.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { confessionKey, getConfessionConfig, publishConfession } from '../../../services/confessionService.js';
import { canReplyTo, MAX_REPLY_LENGTH } from '../../../services/confessionLogic.js';
import { t } from '../../../utils/i18n.js';

async function review(interaction, client, [id], action) {
  const config = getConfessionConfig(await getGuildConfig(client, interaction.guildId));
  const hasRole = config.moderatorRoleId && interaction.member?.roles?.cache?.has(config.moderatorRoleId);
  if (!hasRole && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: t(interaction, 'noPermission'), flags: MessageFlags.Ephemeral });
  }
  const key = confessionKey(interaction.guildId, id);
  const confession = await client.db.get(key, null);
  if (!confession || confession.status !== 'pending') {
    return interaction.reply({ content: t(interaction, 'alreadyHandled'), flags: MessageFlags.Ephemeral });
  }
  if (action === 'approve') {
    const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel?.isTextBased()) return interaction.reply({ content: t(interaction, 'missingChannel'), flags: MessageFlags.Ephemeral });
    await publishConfession(channel, confession, config, interaction);
    confession.status = 'published';
  } else confession.status = 'rejected';
  confession.reviewedBy = interaction.user.id; confession.reviewedAt = Date.now();
  await client.db.set(key, confession);
  await interaction.update({ components: [], embeds: interaction.message.embeds });
  return interaction.followUp({ content: t(interaction, action === 'approve' ? 'approved' : 'rejected'), flags: MessageFlags.Ephemeral });
}

/** Tombol "Balas" di menfess terbit: validasi ringan lalu buka modal balasan anonim. */
async function openReplyModal(interaction, client, [id]) {
  if (!interaction.guildId) return;
  const config = getConfessionConfig(await getGuildConfig(client, interaction.guildId));
  const confession = await client.db.get(confessionKey(interaction.guildId, id), null);
  const check = canReplyTo(confession, config);
  if (!check.ok) {
    const key = check.reason === 'repliesDisabled' ? 'replyDisabled' : check.reason === 'disabled' ? 'disabled' : 'replyNotAvailable';
    return interaction.reply({ content: t(interaction, key), flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder().setCustomId(`confessReplyModal:${id}`).setTitle(t(interaction, 'replyTitle'));
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('content')
      .setLabel(t(interaction, 'replyLabel'))
      .setPlaceholder(t(interaction, 'replyPlaceholder'))
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(1)
      .setMaxLength(MAX_REPLY_LENGTH)
      .setRequired(true),
  ));
  return interaction.showModal(modal);
}

export default [
  { name: 'confessApprove', execute: (interaction, client, args) => review(interaction, client, args, 'approve') },
  { name: 'confessReject', execute: (interaction, client, args) => review(interaction, client, args, 'reject') },
  { name: 'confessReply', execute: openReplyModal },
];
