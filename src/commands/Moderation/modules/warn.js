import { applyWarnEscalation, getModerationPolicy, notifyModerationTarget } from '../../../services/moderation/moderationPolicy.js';
import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../../utils/embeds.js';
import { logModerationAction } from '../../../utils/moderation.js';
import { logger } from '../../../utils/logger.js';
import { WarningService } from '../../../services/moderation/warningService.js';
import { ModerationService } from '../../../services/moderation/moderationService.js';
import { PacilBotError, ErrorTypes } from '../../../utils/errorHandler.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { handleModerationReasonAutocomplete } from '../../../services/moderation/moderationTemplates.js';
export default {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a user")
        .addUserOption((o) =>
            o
                .setName("target")
                .setRequired(true)
                .setDescription("User to warn"),
        )
        .addStringOption((o) =>
            o
                .setName("reason")
                .setRequired(true)
                .setDescription("Alasan peringatan (pilih template atau ketik kustom)")
                .setAutocomplete(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async autocomplete(interaction) {
        return handleModerationReasonAutocomplete(interaction);
    },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Warn interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'warn'
            });
            return;
        }

        const target = interaction.options.getUser("target");
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason");
        const moderator = interaction.user;
        const guildId = interaction.guildId;

        if (!target) {
            throw new PacilBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must specify a user to warn.',
                { subtype: 'invalid_user' },
            );
        }

        if (!reason) {
            throw new PacilBotError(
                'Missing warning reason',
                ErrorTypes.VALIDATION,
                'You must provide a reason for the warning.',
                { subtype: 'missing_required' },
            );
        }

        if (!member) {
            throw new PacilBotError(
                "Target not found",
                ErrorTypes.USER_INPUT,
                "The target user is not currently in this server."
            );
        }

        ModerationService.assertModerationHierarchy(interaction.member, member, 'warn');

        const { id, totalCount } = await WarningService.addWarning({
            guildId,
            userId: target.id,
            moderatorId: moderator.id,
            reason,
            timestamp: Date.now()
        });

        const policy = await getModerationPolicy(client, guildId);
        const dmSent = await notifyModerationTarget({
            guild: interaction.guild, user: target, action: 'warn', reason,
            detail: `Total peringatan kamu: ${totalCount}`, policy,
        });
        const escalationNote = await applyWarnEscalation({ guild: interaction.guild, member, totalCount, policy, reason });

        await logModerationAction({
            client,
            guild: interaction.guild,
            event: {
                action: "User Warned",
                target: `${target.tag} (${target.id})`,
                executor: `${moderator.tag} (${moderator.id})`,
                reason,
                metadata: {
                    userId: target.id,
                    moderatorId: moderator.id,
                    totalWarns: totalCount,
                    warningNumber: totalCount,
                    warningId: id
                }
            }
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `⚠️ **Warned** ${target.tag}`,
                    [`**Alasan:** ${reason}`, `**Total Peringatan:** ${totalCount}`, dmSent ? '📨 Member sudah diberi tahu lewat DM.' : '📭 DM ke member tidak terkirim (DM tertutup atau dinonaktifkan).', escalationNote].filter(Boolean).join('\n'),
                ),
            ],
        });
    }
};