import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import { getSystemStatusSummary } from "../../services/commandStatusService.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CATEGORY_SELECT_ID = "help-category-select";
export const ALL_COMMANDS_ID = "help-all-commands";
export const BUG_REPORT_BUTTON_ID = "help-bug-report";
export const STATUS_BUTTON_ID = "help-system-status";
export const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

export const CATEGORY_ICONS = {
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
};

export function formatCategoryName(rawCategory) {
    return rawCategory
        .replace(/_/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function createInitialHelpMenu(client, guildId = null) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const statusSummary = await getSystemStatusSummary(client, guildId);

    const options = [
        {
            label: "📋 Semua Command (All Commands)",
            description: `Daftar lengkap ${statusSummary.totalCommands} command bot Pacil Baik`,
            value: ALL_COMMANDS_ID,
            emoji: "📋",
        },
        ...categoryDirs.map((category) => {
            const categoryName = formatCategoryName(category);
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: `Lihat daftar command divisi ${categoryName}`,
                value: category,
            };
        }),
    ];

    const botName = client?.user?.username || "Pacil Baik";
    const healthBadge = statusSummary.overallHealth === 'healthy'
        ? '🟢 **Semua Layanan Normal**'
        : statusSummary.overallHealth === 'degraded'
        ? '⚠️ **Beberapa Command Mengalami Kendala**'
        : '🛠️ **Mode Pemeliharaan / Maintenance**';

    const embed = createEmbed({
        title: `🎓 ${botName} — Pusat Bantuan & Direktori Command`,
        description: [
            `Halo warga Pacil! 👋 Bot **${botName}** hadir khusus untuk nemenin anak-anak Fasilkom UI di server **pacil baik** buat belajar, ngoding, denger musik, dan seru-seruan bareng di Discord.`,
            '',
            `### 📡 Status Command Saat Ini`,
            `> ${healthBadge}`,
            `> 🟢 **${statusSummary.openCount}** Open / Aktif · 🔴 **${statusSummary.closedCount}** Closed · ⚠️ **${statusSummary.degradedCount}** Ada Kendala`,
            '',
            `*💡 **Tips Indikator Status:** Command bertanda 🟢 siap dipakai tanpa kendala. Jika bertanda 🔴 atau ⚠️, berarti sedang ditutup/diperbaiki oleh tim dev Pacil Baik.*`,
        ].join('\n'),
        color: statusSummary.overallHealth === 'healthy' ? 'primary' : 'warning',
        thumbnail: client.user?.displayAvatarURL?.({ size: 1024 }),
        fields: [
            {
                name: '🚀 Panduan Penggunaan',
                value: [
                    '**1. Buka Direktori** — Gunakan dropdown menu di bawah untuk memilih kategori fitur.',
                    '**2. Cek Status** — Klik tombol **Cek Status Bot** untuk melihat latensi, database, & kesehatan node musik.',
                    '**3. Konfigurasi Server** — Pengurus server bisa menjalankan `/configwizard` atau `/commands dashboard`.',
                ].join('\n'),
                inline: false,
            },
            {
                name: '⚡ Fitur Utama Pacil Baik',
                value: [
                    '• **🎵 Music**: Putar musik santai temen begadang nugas SDA / Basdat',
                    '• **📊 Leveling & Economy**: Sistem XP ngobrol dan saldo koin Pacil',
                    '• **🛡️ Moderasi & Log**: Jaga ketertiban server pacil baik tetap aman & kondusif',
                    '• **🎉 Giveaway & Birthday**: Rayakan ulang tahun & event angkatan',
                ].join('\n'),
                inline: false,
            },
            {
                name: '💻 Dukungan & Info',
                value: `-# Dibuat dengan bangga untuk mahasiswa Fasilkom UI • Gunakan \`/\` atau prefix \`!\``,
                inline: false,
            },
        ],
        footer: {
            text: "Pacil Baik • Fasilkom UI",
        },
        timestamp: true,
    });

    const statusButton = new ButtonBuilder()
        .setCustomId(STATUS_BUTTON_ID)
        .setLabel("Cek Status Bot")
        .setEmoji("📊")
        .setStyle(ButtonStyle.Primary);

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("Lapor Bug / Kendala")
        .setEmoji("🐛")
        .setStyle(ButtonStyle.Danger);

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "📂 Pilih Kategori Fitur yang Ingin Dilihat...",
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents([
        statusButton,
        bugReportButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Menampilkan menu bantuan dan status seluruh command bot Pacil Baik"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);

        const { embeds, components } = await createInitialHelpMenu(client, interaction.guildId);

        await InteractionHelper.safeEditReply(interaction, {
            embeds,
            components,
        });

        setTimeout(async () => {
            try {
                if (!InteractionHelper.isInteractionValid(interaction)) {
                    return;
                }

                const closedEmbed = createEmbed({
                    title: "Menu Bantuan Ditutup",
                    description: "Sesi menu bantuan telah berakhir karena timeout. Ketik `/help` lagi kapan saja saat butuh bantuan!",
                    color: "secondary",
                    footer: { text: "Pacil Baik • Fasilkom UI" },
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {
                logger.debug('Help menu close edit failed (interaction may have expired):', error?.message);
            }
        }, HELP_MENU_TIMEOUT_MS);
    },
};