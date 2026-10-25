import { createEmbed } from '../../utils/embeds.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import { createInitialHelpMenu } from '../../commands/Core/help.js';
import { buildStatusEmbed, buildStatusActionRow } from '../../commands/Core/status.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';

const BACK_BUTTON_ID = "help-back-to-main";
const PAGINATION_PREFIX = "help-page";
const BUG_REPORT_BUTTON_ID = "help-bug-report";
const STATUS_BUTTON_ID = "help-system-status";
const STATUS_REFRESH_ID = "status-refresh";

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await createInitialHelpMenu(client, interaction.guildId);
            await interaction.editReply({
                embeds,
                components,
            });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help back button interaction already acknowledged or expired.', {
                    event: 'interaction.help.button.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};

export const helpSystemStatusButton = {
    name: STATUS_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const embed = await buildStatusEmbed(client, interaction.guildId);
            const row = buildStatusActionRow();

            await interaction.editReply({
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            logger.error('Error handling help system status button:', error);
        }
    },
};

export const statusRefreshButton = {
    name: STATUS_REFRESH_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const embed = await buildStatusEmbed(client, interaction.guildId);
            const row = buildStatusActionRow();

            await interaction.editReply({
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            logger.error('Error handling status refresh button:', error);
        }
    },
};

export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        const supportButton = new ButtonBuilder()
            .setLabel('💬 Masuk Discord Pacil Baik')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/QnWNz2dKCE');

        const bugRow = new ActionRowBuilder().addComponents(supportButton);

        const bugReportEmbed = createEmbed({
            title: '🐛 Lapor Bug & Kendala Command',
            description: [
                'Menemukan command yang error atau fitur bot yang bermasalah di server **pacil baik**?',
                '',
                '**Cara Melaporkan ke Tim Dev Pacil:**',
                '• 📝 Sebutkan nama command yang bermasalah (misal: `/music play` atau `/rank`)',
                '• 📋 Ceritakan pesan error atau screenshot kendala yang muncul',
                '• 💻 Tag komti atau admin server di channel `#bot-support` / `#lapor-bug`',
                '',
                '*Laporan kamu sangat membantu agar bot Pacil Baik tetap lancar nemenin nugas anak-anak Fasilkom UI!*',
            ].join('\n'),
            color: 'error',
            footer: {
                text: 'Pacil Baik Bug Reporting • Fasilkom UI 💻',
                iconURL: client.user.displayAvatarURL(),
            },
            timestamp: true,
        });

        await interaction.reply({
            embeds: [bugReportEmbed],
            components: [bugRow],
            flags: MessageFlags.Ephemeral,
        });
    },
};

function getPaginationInfo(components) {
    for (const row of components || []) {
        for (const component of row.components || []) {
            if (component.customId === `${PAGINATION_PREFIX}_page`) {
                const label = component.label || '';
                const match = label.match(/Page\s+(\d+)\s+of\s+(\d+)/i) || label.match(/Halaman\s+(\d+)\/(\d+)/i);
                if (match) {
                    return {
                        currentPage: Number(match[1]),
                        totalPages: Number(match[2]),
                    };
                }
            }
        }
    }

    return { currentPage: 1, totalPages: 1 };
}

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { currentPage, totalPages } = getPaginationInfo(interaction.message?.components);

            let nextPage = currentPage;
            switch (interaction.customId) {
                case `${PAGINATION_PREFIX}_first`:
                    nextPage = 1;
                    break;
                case `${PAGINATION_PREFIX}_prev`:
                    nextPage = Math.max(1, currentPage - 1);
                    break;
                case `${PAGINATION_PREFIX}_next`:
                    nextPage = Math.min(totalPages, currentPage + 1);
                    break;
                case `${PAGINATION_PREFIX}_last`:
                    nextPage = totalPages;
                    break;
                default:
                    nextPage = currentPage;
                    break;
            }

            const { embeds, components } = await createAllCommandsMenu(nextPage, client, interaction.guildId);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help pagination interaction already acknowledged or expired.', {
                    event: 'interaction.help.pagination.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};