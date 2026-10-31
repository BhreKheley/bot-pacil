import { createEmbed } from '../../utils/embeds.js';
import { createButton, getPaginationRow } from '../../utils/components.js';
import { getCommandStatus, CommandStatus } from '../../services/commandStatusService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";
const CATEGORY_SELECT_ID = "help-category-select";
const FOOTER_TEXT = "Pacil Baik • Fasilkom UI";
const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Music: "🎵",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    "Reaction Roles": "🎭",
    Community: "👥",
    Birthday: "🎂",
    "Join To Create": "🔌",
    Verification: "✅",
    Config: "⚙️",
};

function formatCategoryName(rawCategory) {
    return rawCategory
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);
    if (!commandData?.name) {
        return [];
    }

    const baseName = commandData.name;
    const baseDescription = commandData.description || "Tidak ada deskripsi";
    const options = commandData.options || [];

    const entries = [];

    for (const option of options) {
        if (!option) continue;

        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({
                baseName,
                displayName: `${baseName} ${option.name}`,
                description: option.description || baseDescription,
                category,
            });
            continue;
        }

        if (option.type === SUBCOMMAND_GROUP_TYPE) {
            const nestedOptions = option.options || [];
            for (const nested of nestedOptions) {
                if (nested?.type !== SUBCOMMAND_TYPE) continue;

                entries.push({
                    baseName,
                    displayName: `${baseName} ${option.name} ${nested.name}`,
                    description: nested.description || option.description || baseDescription,
                    category,
                });
            }
        }
    }

    if (entries.length === 0) {
        entries.push({
            baseName,
            displayName: baseName,
            description: baseDescription,
            category,
        });
    }

    return entries;
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) {
        return null;
    }

    const jsonData = typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
    if (!jsonData?.name) {
        return null;
    }

    return {
        ...jsonData,
        options: Array.isArray(jsonData.options)
            ? jsonData.options.map((option) =>
                  typeof option?.toJSON === 'function' ? option.toJSON() : option,
              )
            : [],
    };
}

export async function createCategoryCommandsMenu(category, client, guildId = null) {
    const categoryName = formatCategoryName(category);
    const icon = CATEGORY_ICONS[categoryName] || "🔍";

    const categoryCommands = [];

    try {
        const categoryPath = path.join(__dirname, "../../commands", category);
        const commandFiles = (await fs.readdir(categoryPath))
            .filter((file) => file.endsWith(".js"))
            .sort();

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default;
            const commandData = normalizeCommandData(command);

            if (commandData) {
                if (
                    commandData.name === "help" ||
                    commandData.name === "commandlist"
                )
                    continue;

                categoryCommands.push(...buildHelpEntries(command, categoryName));
            }
        }
    } catch (error) {
        logger.error(
            `Error reading commands from category ${category}:`,
            error,
        );
    }

    categoryCommands.sort((a, b) => a.displayName.localeCompare(b.displayName));

    let registeredCommands = new Collection();
    try {
        if (client?.application?.commands?.fetch) {
            const commands = await client.application.commands.fetch();
            for (const cmd of commands.values()) {
                registeredCommands.set(cmd.name, cmd);
            }
        }
    } catch (error) {
        logger.error('Error fetching registered commands:', error);
    }

    // Resolve status for each command
    const commandsWithStatus = await Promise.all(
        categoryCommands.map(async (cmd) => {
            const status = await getCommandStatus(client, cmd.displayName, guildId, categoryName);
            return {
                ...cmd,
                status,
            };
        })
    );

    const openCount = commandsWithStatus.filter((c) => c.status.status === CommandStatus.OPEN).length;
    const closedCount = commandsWithStatus.filter((c) => c.status.status === CommandStatus.CLOSED || c.status.status === CommandStatus.MAINTENANCE).length;
    const degradedCount = commandsWithStatus.filter((c) => c.status.status === CommandStatus.DEGRADED).length;

    const embed = createEmbed({
        title: `${icon} Divisi ${categoryName} — Pacil Baik`,
        description: [
            `Daftar seluruh command divisi **${categoryName}** beserta status ketersediaannya di server pacil baik:`,
            `> 🟢 **${openCount}** Open/Aktif · 🔴 **${closedCount}** Closed/Ditutup · ⚠️ **${degradedCount}** Ada Kendala`,
            '',
            `*Klik mention command di bawah untuk langsung menggunakan atau membaca deskripsinya.*`,
        ].join('\n'),
        color: closedCount > 0 ? (openCount === 0 ? 'error' : 'warning') : 'primary',
    });

    if (commandsWithStatus.length > 0) {
        const commandMentions = commandsWithStatus
            .map((cmd) => {
                const registeredCmd = registeredCommands.get(cmd.baseName);
                const mention = registeredCmd && registeredCmd.id
                    ? `</${cmd.displayName}:${registeredCmd.id}>`
                    : `\`/${cmd.displayName}\``;

                const status = cmd.status;
                if (status.status === CommandStatus.CLOSED || status.status === CommandStatus.MAINTENANCE) {
                    const tag = status.status === CommandStatus.MAINTENANCE ? '[MAINTENANCE]' : '[CLOSED]';
                    return `🔴 ${mention} · **${tag}** *${status.reason || 'Sedang ditutup'}* — ${cmd.description}`;
                }

                if (status.status === CommandStatus.DEGRADED) {
                    return `⚠️ ${mention} · **[KENDALA]** *${status.reason || 'Ada error'}* — ${cmd.description}`;
                }

                return `🟢 ${mention} · ${cmd.description}`;
            })
            .join("\n");

        const maxLength = 1000;
        if (commandMentions.length <= maxLength) {
            embed.addFields({
                name: `Daftar Command (${commandsWithStatus.length})`,
                value: commandMentions,
                inline: false,
            });
        } else {
            const chunks = [];
            let currentChunk = "";
            const lines = commandMentions.split("\n");

            for (const line of lines) {
                if ((currentChunk + "\n" + line).length > maxLength) {
                    if (currentChunk) chunks.push(currentChunk);
                    currentChunk = line;
                } else {
                    currentChunk += (currentChunk ? "\n" : "") + line;
                }
            }
            if (currentChunk) chunks.push(currentChunk);

            chunks.forEach((chunk, index) => {
                embed.addFields({
                    name: `Daftar Command (Bagian ${index + 1})`,
                    value: chunk,
                    inline: false,
                });
            });
        }
    } else {
        embed.addFields({
            name: "Informasi",
            value: `Belum ada command yang terdaftar pada divisi **${categoryName}**.`,
            inline: false,
        });
    }

    embed.setFooter({ text: FOOTER_TEXT });
    embed.setTimestamp();

    const backButton = createButton(
        BACK_BUTTON_ID,
        "Kembali ke Menu Utama",
        "primary",
        "⬅️",
        false,
    );

    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    return {
        embeds: [embed],
        components: [buttonRow],
    };
}

export async function createAllCommandsMenu(page = 1, client, guildId = null) {
    const commandsPerPage = 35;
    const allCommands = [];

    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    for (const category of categoryDirs) {
        try {
            const categoryPath = path.join(
                __dirname,
                "../../commands",
                category,
            );
            const commandFiles = (await fs.readdir(categoryPath))
                .filter((file) => file.endsWith(".js"))
                .sort();

            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                const commandModule = await import(`file://${filePath}`);
                const command = commandModule.default;
                const commandData = normalizeCommandData(command);

                if (commandData) {
                    if (
                        commandData.name === "help" ||
                        commandData.name === "commandlist"
                    )
                        continue;

                    const categoryName = formatCategoryName(category);

                    allCommands.push(...buildHelpEntries(command, categoryName));
                }
            }
        } catch (error) {
            logger.error(
                `Error reading commands from category ${category}:`,
                error,
            );
        }
    }

    allCommands.sort((a, b) => a.displayName.localeCompare(b.displayName));

    let registeredCommands = new Collection();
    try {
        if (client?.application?.commands?.fetch) {
            const commands = await client.application.commands.fetch();
            for (const cmd of commands.values()) {
                registeredCommands.set(cmd.name, cmd);
            }
        }
    } catch (error) {
        logger.error('Error fetching registered commands:', error);
    }

    const totalPages = Math.max(1, Math.ceil(allCommands.length / commandsPerPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * commandsPerPage;
    const endIndex = startIndex + commandsPerPage;
    const pageCommands = allCommands.slice(startIndex, endIndex);

    // Resolve status for page commands
    const pageCommandsWithStatus = await Promise.all(
        pageCommands.map(async (cmd) => {
            const status = await getCommandStatus(client, cmd.displayName, guildId, cmd.category);
            return {
                ...cmd,
                status,
            };
        })
    );

    const embed = createEmbed({
        title: "📋 Direktori Seluruh Command — Pacil Baik",
        description: [
            `Menampilkan seluruh command bot Pacil Baik beserta status kesiapannya:`,
            `> 🟢 = **Open/Aktif** · 🔴 = **Closed/Maintenance** · ⚠️ = **Kendala Teknis**`,
            `Gunakan tombol navigasi di bawah untuk berpindah halaman.`
        ].join('\n'),
        color: 'primary',
    });

    embed.setFooter({ text: `${FOOTER_TEXT} • Halaman ${safePage}/${totalPages}` });
    embed.setTimestamp();

    if (pageCommandsWithStatus.length > 0) {
        const commandMentions = pageCommandsWithStatus.map((cmd) => {
            const registeredCmd = registeredCommands.get(cmd.baseName);
            const icon = cmd.status.icon || '🟢';
            if (registeredCmd && registeredCmd.id) {
                return `${icon} </${cmd.displayName}:${registeredCmd.id}> · \`${cmd.category}\``;
            }
            return `${icon} \`/${cmd.displayName}\` · \`${cmd.category}\``;
        });

        const columnCount = pageCommandsWithStatus.length > 20 ? 2 : 1;
        const chunkSize = Math.ceil(commandMentions.length / columnCount);

        for (let i = 0; i < columnCount; i++) {
            const chunk = commandMentions
                .slice(i * chunkSize, (i + 1) * chunkSize)
                .join("\n");

            if (!chunk) continue;

            embed.addFields({
                name: i === 0 ? `Daftar Command (Hal ${safePage})` : "Daftar Command (lanjutan)",
                value: chunk,
                inline: columnCount > 1,
            });
        }
    }

    const components = [];

    if (totalPages > 1) {
        const paginationRow = getPaginationRow(
            PAGINATION_PREFIX,
            safePage,
            totalPages,
        );
        components.push(paginationRow);
    }

    const backButton = createButton(
        BACK_BUTTON_ID,
        "Kembali ke Menu Utama",
        "primary",
        "⬅️",
        false,
    );

    const buttonRow = new ActionRowBuilder().addComponents(backButton);
    components.push(buttonRow);

    return {
        embeds: [embed],
        components,
        currentPage: safePage,
        totalPages,
    };
}

export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const selectedCategory = interaction.values[0];

            if (selectedCategory === ALL_COMMANDS_ID) {
                const { embeds, components } = await createAllCommandsMenu(1, client, interaction.guildId);
                await interaction.editReply({
                    embeds,
                    components,
                });
            } else {
                const { embeds, components } = await createCategoryCommandsMenu(selectedCategory, client, interaction.guildId);
                await interaction.editReply({
                    embeds,
                    components,
                });
            }
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help category select interaction already acknowledged or expired.', {
                    event: 'interaction.help.select.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            await handleInteractionError(interaction, error, {
                type: 'select_menu',
                customId: interaction.customId,
                handler: 'help_category',
            });
        }
    },
};