import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} from 'discord.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { findConfessionRecords, getConfessionConfig } from '../../services/confessionService.js';
import { clampReplyCooldown } from '../../services/confessionLogic.js';
import { pacilPanel } from '../../ui/pacil.js';
import { t } from '../../utils/i18n.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function configurationEmbed(config, locale) {
  const channel = (id) => id ? `<#${id}>` : '—';
  return pacilPanel({
    title: t(locale, 'configTitle'),
    icon: '💌',
    description: config.enabled ? t(locale, 'statusEnabled') : t(locale, 'statusDisabled'),
    tone: config.enabled ? 'success' : 'warning',
    fields: [
      { name: t(locale, 'destination'), value: channel(config.channelId), inline: true },
      { name: t(locale, 'review'), value: channel(config.reviewChannelId), inline: true },
      { name: t(locale, 'approval'), value: config.requireApproval ? t(locale, 'yes') : t(locale, 'no'), inline: true },
      { name: t(locale, 'cooldown'), value: t(locale, 'minutes', { count: config.cooldownMinutes }), inline: true },
      { name: t(locale, 'replies'), value: config.repliesEnabled === false ? t(locale, 'repliesOff') : t(locale, 'repliesOn'), inline: true },
      { name: t(locale, 'replyCooldown'), value: t(locale, 'seconds', { count: config.replyCooldownSeconds }), inline: true },
    ],
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Send an anonymous confession')
    .setDescriptionLocalizations({ id: 'Kirim menfess anonim' })
    .setDMPermission(false)
    .addSubcommand(sub => sub.setName('send').setDescription('Open the anonymous confession form').setDescriptionLocalizations({ id: 'Buka formulir menfess anonim' }))
    .addSubcommand(sub => sub.setName('configure').setDescription('Configure the confession feature').setDescriptionLocalizations({ id: 'Atur fitur menfess' })
      .addChannelOption(opt => opt.setName('channel').setDescription('Public destination channel').setDescriptionLocalizations({ id: 'Channel tujuan publik' }).addChannelTypes(...TEXT_CHANNELS).setRequired(true))
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable the feature').setDescriptionLocalizations({ id: 'Aktifkan fitur' }).setRequired(true))
      .addBooleanOption(opt => opt.setName('approval').setDescription('Require moderator approval').setDescriptionLocalizations({ id: 'Perlu persetujuan moderator' }).setRequired(true))
      .addChannelOption(opt => opt.setName('review_channel').setDescription('Moderator review queue').setDescriptionLocalizations({ id: 'Antrean review moderator' }).addChannelTypes(...TEXT_CHANNELS))
      .addRoleOption(opt => opt.setName('moderator_role').setDescription('Role allowed to review').setDescriptionLocalizations({ id: 'Role yang dapat mereview' }))
      .addIntegerOption(opt => opt.setName('cooldown').setDescription('Minutes between submissions (0–1440)').setDescriptionLocalizations({ id: 'Jeda kirim dalam menit (0–1440)' }).setMinValue(0).setMaxValue(1440))
      .addBooleanOption(opt => opt.setName('replies').setDescription('Allow anonymous replies in a thread').setDescriptionLocalizations({ id: 'Izinkan balasan anonim di thread' }))
      .addIntegerOption(opt => opt.setName('reply_cooldown').setDescription('Seconds between replies (0–3600)').setDescriptionLocalizations({ id: 'Jeda balas dalam detik (0–3600)' }).setMinValue(0).setMaxValue(3600)))
    .addSubcommand(sub => sub.setName('lookup').setDescription('Find the sender of a confession or reply (staff only)').setDescriptionLocalizations({ id: 'Telusuri pengirim menfess atau balasan (khusus pengurus)' })
      .addStringOption(opt => opt.setName('id').setDescription('Confession or reply ID (shown in the footer)').setDescriptionLocalizations({ id: 'ID menfess atau balasan (ada di footer)' }).setRequired(true)))
    .addSubcommand(sub => sub.setName('status').setDescription('View confession settings').setDescriptionLocalizations({ id: 'Lihat pengaturan menfess' }))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable confessions without deleting settings').setDescriptionLocalizations({ id: 'Nonaktifkan menfess tanpa menghapus pengaturan' }))
    .setDefaultMemberPermissions(null),
  category: 'Community',
  abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

  async execute(interaction, _config, client) {
    const subcommand = interaction.options.getSubcommand();
    const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (['configure', 'status', 'disable', 'lookup'].includes(subcommand) && !isManager) {
      return interaction.reply({ content: t(interaction, 'noPermission'), flags: MessageFlags.Ephemeral });
    }
    const config = getConfessionConfig(await getGuildConfig(client, interaction.guildId));
    if (subcommand === 'send') {
      if (!config.enabled || !config.channelId) return interaction.reply({ content: t(interaction, config.enabled ? 'notConfigured' : 'disabled'), flags: MessageFlags.Ephemeral });
      const modal = new ModalBuilder().setCustomId(`confession_modal:${interaction.guildId}`).setTitle(t(interaction, 'confessionTitle'));
      const input = new TextInputBuilder().setCustomId('content').setLabel(t(interaction, 'confessionLabel')).setPlaceholder(t(interaction, 'confessionPlaceholder')).setStyle(TextInputStyle.Paragraph).setMinLength(1).setMaxLength(1800).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }
    if (subcommand === 'lookup') return lookup(interaction, client);
    if (subcommand === 'status') return interaction.reply({ embeds: [configurationEmbed(config, interaction)], flags: MessageFlags.Ephemeral });
    if (subcommand === 'disable') {
      const updated = await patchGuildConfig(client, interaction.guildId, { confessions: { ...config, enabled: false } });
      return interaction.reply({ content: t(interaction, 'disabled'), embeds: [configurationEmbed(getConfessionConfig(updated), interaction)], flags: MessageFlags.Ephemeral });
    }
    const enabled = interaction.options.getBoolean('enabled');
    const requireApproval = interaction.options.getBoolean('approval');
    const reviewChannel = interaction.options.getChannel('review_channel');
    if (requireApproval && !reviewChannel) return interaction.reply({ content: t(interaction, 'missingReview'), flags: MessageFlags.Ephemeral });
    const channel = interaction.options.getChannel('channel');
    const moderatorRole = interaction.options.getRole('moderator_role');
    const cooldown = interaction.options.getInteger('cooldown');
    const next = { ...config, enabled, channelId: channel.id, requireApproval, reviewChannelId: reviewChannel?.id ?? null, moderatorRoleId: moderatorRole?.id ?? null, cooldownMinutes: cooldown ?? config.cooldownMinutes,
      repliesEnabled: interaction.options.getBoolean('replies') ?? config.repliesEnabled,
      replyCooldownSeconds: clampReplyCooldown(interaction.options.getInteger('reply_cooldown'), config.replyCooldownSeconds) };
    const updated = await patchGuildConfig(client, interaction.guildId, { confessions: next });
    return interaction.reply({ content: t(interaction, 'configured'), embeds: [configurationEmbed(getConfessionConfig(updated), interaction)], flags: MessageFlags.Ephemeral });
  },
};

/** Telusuri menfess/balasan dari ID pendek di footer atau ID lengkap dari antrean review. */
async function lookup(interaction, client) {
  const results = await findConfessionRecords(client, interaction.guildId, interaction.options.getString('id'));
  if (!results.length) return interaction.reply({ content: t(interaction, 'lookupNotFound'), flags: MessageFlags.Ephemeral });
  return interaction.reply({
    embeds: results.map(({ kind, record }) => pacilPanel({
      title: t(interaction, 'lookupTitle'), icon: '🔎', tone: 'warning',
      description: String(record.content).slice(0, 1000),
      fields: [
        { name: kind === 'reply' ? 'Balasan' : 'Menfess', value: `\`${record.id}\``, inline: true },
        { name: 'Pengirim / Sender', value: `<@${record.authorId}>\n\`${record.authorId}\``, inline: true },
        ...(kind === 'reply' ? [{ name: 'Label', value: record.label, inline: true }] : []),
      ],
      footer: 'Hanya untuk pengurus server.',
    })),
    allowedMentions: { parse: [] },
    flags: MessageFlags.Ephemeral,
  });
}
