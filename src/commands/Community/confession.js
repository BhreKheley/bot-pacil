import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} from 'discord.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { getConfessionConfig } from '../../services/confessionService.js';
import { createEmbed } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function configurationEmbed(config, locale) {
  const channel = (id) => id ? `<#${id}>` : '—';
  return createEmbed({
    title: `💌 ${t(locale, 'configTitle')}`,
    description: config.enabled ? t(locale, 'statusEnabled') : t(locale, 'statusDisabled'),
    color: config.enabled ? 'success' : 'warning',
    fields: [
      { name: t(locale, 'destination'), value: channel(config.channelId), inline: true },
      { name: t(locale, 'review'), value: channel(config.reviewChannelId), inline: true },
      { name: t(locale, 'approval'), value: config.requireApproval ? t(locale, 'yes') : t(locale, 'no'), inline: true },
      { name: t(locale, 'cooldown'), value: t(locale, 'minutes', { count: config.cooldownMinutes }), inline: true },
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
      .addIntegerOption(opt => opt.setName('cooldown').setDescription('Minutes between submissions (0–1440)').setDescriptionLocalizations({ id: 'Jeda kirim dalam menit (0–1440)' }).setMinValue(0).setMaxValue(1440)))
    .addSubcommand(sub => sub.setName('status').setDescription('View confession settings').setDescriptionLocalizations({ id: 'Lihat pengaturan menfess' }))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable confessions without deleting settings').setDescriptionLocalizations({ id: 'Nonaktifkan menfess tanpa menghapus pengaturan' }))
    .setDefaultMemberPermissions(null),
  category: 'Community',
  abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

  async execute(interaction, _config, client) {
    const subcommand = interaction.options.getSubcommand();
    const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (['configure', 'status', 'disable'].includes(subcommand) && !isManager) {
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
    const next = { ...config, enabled, channelId: channel.id, requireApproval, reviewChannelId: reviewChannel?.id ?? null, moderatorRoleId: moderatorRole?.id ?? null, cooldownMinutes: cooldown ?? config.cooldownMinutes };
    const updated = await patchGuildConfig(client, interaction.guildId, { confessions: next });
    return interaction.reply({ content: t(interaction, 'configured'), embeds: [configurationEmbed(getConfessionConfig(updated), interaction)], flags: MessageFlags.Ephemeral });
  },
};
