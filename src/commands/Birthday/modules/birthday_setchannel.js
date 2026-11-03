import { pacilEmbed, PACIL_COLORS } from '../../../ui/pacil.js';
import { PermissionsBitField, MessageFlags } from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../../../services/config/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const embed = pacilEmbed()
                .setColor(PACIL_COLORS.error)
                .setTitle('Permission Denied')
                .setDescription('You need **Manage Server** permissions to configure the birthday channel.');
            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');
            const guildId = interaction.guildId;
            const guildConfig = await getGuildConfig(client, guildId);

            if (channel) {
                guildConfig.birthdayChannelId = channel.id;
                await setGuildConfig(client, guildId, guildConfig);
                const embed = pacilEmbed()
                    .setColor(PACIL_COLORS.success)
                    .setTitle('Birthday Announcements Enabled')
                    .setDescription(`Birthday announcements will now be posted in ${channel}.`);
                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                guildConfig.birthdayChannelId = null;
                await setGuildConfig(client, guildId, guildConfig);
                const embed = pacilEmbed()
                    .setColor(PACIL_COLORS.warning)
                    .setTitle('Birthday Announcements Disabled')
                    .setDescription('No channel provided — birthday announcements have been disabled.');
                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (error) {
            logger.error('birthday_setchannel error:', error);
            const embed = pacilEmbed()
                .setColor(PACIL_COLORS.error)
                .setTitle('⚠️ Configuration Error')
                .setDescription('Could not save the birthday channel configuration.');
            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};