import {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, ActionRowBuilder,
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder,
} from 'discord.js';
import { pacilButtons, pacilNotice, pacilPanel } from '../../ui/pacil.js';
import { logger } from '../../utils/logger.js';
import { PacilBotError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    initializeJoinToCreate,
    getChannelConfiguration,
    updateChannelConfig,
    removeTriggerChannel,
    hasManageGuildPermission,
    logConfigurationChange,
    getConfiguration,
} from '../../services/joinToCreateService.js';
import {
    RTC_REGIONS, ROOM_LIMITS, formatLimit, parseBitrateKbps, parseUserLimit, regionLabel, sanitizeRoomStatus,
} from '../../services/voiceRoomLogic.js';

const DASHBOARD_TIMEOUT_MS = 5 * 60 * 1000;
const MODAL_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_TEMPLATE = "{username}'s Room";

// Template nama ruang. Placeholder yang diizinkan divalidasi oleh joinToCreateService.
const NAME_TEMPLATES = [
    DEFAULT_TEMPLATE,
    "{username}'s Channel",
    "{username}'s Lounge",
    "{username}'s Space",
    "{displayName}'s Room",
    "{username}'s VC",
    "{username}'s Music Room",
    "{username}'s Gaming Room",
    "{username}'s Chat Room",
    "{username}'s Private Room",
    'Ruang {username}',
    'Ngumpul {username}',
    'Belajar bareng {username}',
    'Ngoding {username}',
    'Warroom {username}',
];

const isModalTimeout = (error) => error?.code === 'InteractionCollectorError' || /time/i.test(error?.message ?? '');

export default {
    data: new SlashCommandBuilder()
        .setName('jointocreate')
        .setDescription('Manage Join to Create voice channels system.')
        .setDescriptionLocalizations({ id: 'Atur sistem ruang voice Join to Create' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((sub) => sub
            .setName('setup')
            .setDescription('Set up a new Join to Create voice channel.')
            .setDescriptionLocalizations({ id: 'Buat channel pemicu Join to Create' })
            .addChannelOption((o) => o.setName('category').setDescription('Category to create the channel in.').setDescriptionLocalizations({ id: 'Kategori tempat channel dibuat' }).addChannelTypes(ChannelType.GuildCategory))
            .addStringOption((o) => o.setName('channel_name').setDescription('Naming template for temporary voice channels.').setDescriptionLocalizations({ id: 'Template nama ruang sementara' })
                .addChoices(...NAME_TEMPLATES.map((value) => ({ name: value === DEFAULT_TEMPLATE ? `${value} (Default)` : value, value }))))
            .addIntegerOption((o) => o.setName('user_limit').setDescription('Maximum number of users in temporary channels. (0 = unlimited)').setDescriptionLocalizations({ id: 'Batas orang per ruang (0 = tanpa batas)' }).setMinValue(0).setMaxValue(ROOM_LIMITS.maxUserLimit))
            .addIntegerOption((o) => o.setName('bitrate').setDescription('Bitrate for temporary channels in kbps (8-96).').setDescriptionLocalizations({ id: 'Bitrate ruang dalam kbps (8-96)' }).setMinValue(8).setMaxValue(96)))
        .addSubcommand((sub) => sub
            .setName('dashboard')
            .setDescription('Configure an existing Join to Create system.')
            .setDescriptionLocalizations({ id: 'Atur Join to Create yang sudah ada' })
            .addChannelOption((o) => o.setName('trigger_channel').setDescription('The Join to Create trigger channel to configure.').setDescriptionLocalizations({ id: 'Channel pemicu yang mau diatur' }).setRequired(true).addChannelTypes(ChannelType.GuildVoice))),
    category: 'utility',

    async execute(interaction, config, client) {
        try {
            if (!hasManageGuildPermission(interaction.member)) {
                throw new PacilBotError('User lacks ManageGuild permission', ErrorTypes.PERMISSION, 'Kamu butuh izin **Manage Server** untuk memakai command ini.');
            }
            const subcommand = interaction.options.getSubcommand();
            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
            if (subcommand === 'setup') return await handleSetup(interaction, client);
            if (subcommand === 'dashboard') return await handleDashboard(interaction, client);
        } catch (error) {
            try {
                let message = 'Waduh, ada kendala tak terduga. Coba lagi, atau hubungi pengurus server.';
                if (error instanceof PacilBotError) {
                    message = error.userMessage || 'Terjadi kendala. Coba lagi ya.';
                    logger.debug(`PacilBotError [${error.type}]: ${error.message}`, error.context || {});
                } else {
                    logger.error('Unexpected error in jointocreate command:', error);
                }
                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message });
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    },
};

// ---------------------------------------------------------------- setup

async function handleSetup(interaction, client) {
    try {
        const category = interaction.options.getChannel('category');
        const nameTemplate = interaction.options.getString('channel_name') || DEFAULT_TEMPLATE;
        const userLimit = interaction.options.getInteger('user_limit') || 0;
        const bitrate = interaction.options.getInteger('bitrate') || 64;
        const guildId = interaction.guild.id;

        const existing = await getConfiguration(client, guildId);
        if (Array.isArray(existing.triggerChannels) && existing.triggerChannels.length > 0) {
            const active = [];
            for (const id of existing.triggerChannels) {
                const channel = await interaction.guild.channels.fetch(id).catch(() => null);
                if (channel) active.push(channel);
                else {
                    logger.info(`Cleaning up stale JTC trigger ${id} from guild ${guildId}`);
                    await removeTriggerChannel(client, guildId, id);
                }
            }
            if (active.length > 0) {
                throw new PacilBotError(
                    'Guild already has a Join to Create channel',
                    ErrorTypes.VALIDATION,
                    `Server ini sudah punya channel Join to Create: ${active[0]}\n\nPakai \`/jointocreate dashboard\` untuk mengubahnya, atau hapus dulu sebelum membuat yang baru.`,
                    { guildId, activeTriggerCount: active.length, expected: true, suppressErrorLog: true },
                );
            }
        }

        const triggerChannel = await interaction.guild.channels.create({
            name: 'Join to Create',
            type: ChannelType.GuildVoice,
            parent: category?.id,
            userLimit: 0,
            bitrate: 64000,
            permissionOverwrites: [{ id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }],
        });

        await initializeJoinToCreate(client, guildId, triggerChannel.id, {
            nameTemplate, userLimit, bitrate: bitrate * 1000, categoryId: category?.id,
        });
        await logConfigurationChange(client, guildId, interaction.user.id, 'Initialized Join to Create', {
            channelId: triggerChannel.id, nameTemplate, userLimit, bitrate,
        });
        logger.info(`Successfully created Join to Create system in guild ${guildId}`);

        const embed = pacilNotice({
            tone: 'success',
            title: 'Join to Create siap dipakai',
            body: [
                `Channel pemicu: ${triggerChannel}`,
                '',
                `**Template nama:** \`${nameTemplate}\``,
                `**Batas orang:** ${formatLimit(userLimit)}`,
                `**Bitrate:** ${bitrate} kbps`,
                `**Kategori:** ${category ? category.name : 'Tanpa kategori'}`,
                '',
                'Atur region, mode video, status awal, dan lainnya lewat `/jointocreate dashboard`.',
            ].join('\n'),
        });
        return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    } catch (error) {
        logger.error('Error in handleSetup:', error);
        if (error instanceof PacilBotError) throw error;
        throw new PacilBotError(`Setup failed: ${error.message}`, ErrorTypes.DISCORD_API, 'Gagal menyiapkan Join to Create. Cek izin bot (Manage Channels, Move Members) lalu coba lagi.');
    }
}

// ---------------------------------------------------------------- dashboard

const buttonId = (action, channelId) => `jtc_cfg_${action}_${channelId}`;

/** Nilai efektif sebuah pemicu (pengaturan per pemicu menimpa bawaan server). */
function effectiveSettings(current) {
    const own = current.channelConfig || {};
    return {
        template: own.nameTemplate || current.channelNameTemplate || DEFAULT_TEMPLATE,
        userLimit: own.userLimit ?? current.userLimit ?? 0,
        bitrate: own.bitrate ?? current.bitrate ?? 64000,
        rtcRegion: own.rtcRegion ?? null,
        videoQuality: own.videoQuality === 'full' ? 'full' : 'auto',
        defaultStatus: own.defaultStatus || '',
    };
}

function buildDashboard(triggerChannel, current, { expired = false } = {}) {
    const s = effectiveSettings(current);
    const embed = pacilPanel({
        title: 'Pengaturan Join to Create',
        icon: '🎙️',
        tone: expired ? 'warning' : 'panel',
        description: expired
            ? 'Sesi pengaturan habis. Jalankan `/jointocreate dashboard` lagi untuk mengubah.'
            : `Pengaturan bawaan untuk ruang yang dibuat dari ${triggerChannel}. Pemilik ruang tetap bisa mengubah ruangnya sendiri lewat panel di chat voice.`,
        fields: [
            { name: 'Template nama', value: `\`${s.template}\``, inline: false },
            { name: 'Batas orang', value: formatLimit(s.userLimit), inline: true },
            { name: 'Bitrate', value: `${Math.round(s.bitrate / 1000)} kbps`, inline: true },
            { name: 'Mode video', value: s.videoQuality === 'full' ? '720p' : 'Otomatis', inline: true },
            { name: 'Region', value: regionLabel(s.rtcRegion), inline: true },
            { name: 'Status awal ruang', value: s.defaultStatus || '—', inline: true },
        ],
        footer: 'Pacil Baik • Hanya satu channel pemicu per server',
    });

    const id = (action) => buttonId(action, triggerChannel.id);
    const buttons = pacilButtons([
        { id: id('name'), label: 'Nama', emoji: '✏️', style: 'primary', disabled: expired },
        { id: id('limit'), label: 'Batas', emoji: '👥', style: 'primary', disabled: expired },
        { id: id('bitrate'), label: 'Bitrate', emoji: '🎚️', style: 'primary', disabled: expired },
        { id: id('status'), label: 'Status Awal', emoji: '📝', style: 'secondary', disabled: expired },
        { id: id('video'), label: s.videoQuality === 'full' ? 'Video 720p' : 'Video Auto', emoji: '🎥', style: 'secondary', disabled: expired },
    ]);
    const region = new StringSelectMenuBuilder()
        .setCustomId(id('region'))
        .setPlaceholder('Region suara bawaan…')
        .setDisabled(expired)
        .addOptions(RTC_REGIONS.map((r) => ({ label: r.label, value: r.value, default: r.rtc === (s.rtcRegion ?? null) })));
    const remove = pacilButtons([{ id: id('delete'), label: 'Hapus Pemicu', emoji: '🗑️', style: 'danger', disabled: expired }]);
    return { embeds: [embed], components: [...buttons, new ActionRowBuilder().addComponents(region), ...remove] };
}

function buildDeleteConfirm(triggerChannel) {
    return {
        embeds: [pacilNotice({
            tone: 'warning',
            title: 'Hapus channel pemicu?',
            body: `**${triggerChannel.name}** akan dikeluarkan dari sistem Join to Create. Ruang sementara yang sedang aktif tidak ikut dihapus.\n\nTindakan ini tidak bisa dibatalkan.`,
        })],
        components: pacilButtons([
            { id: buttonId('delyes', triggerChannel.id), label: 'Ya, Hapus', emoji: '🗑️', style: 'danger' },
            { id: buttonId('delno', triggerChannel.id), label: 'Batal', emoji: '↩️', style: 'secondary' },
        ]),
    };
}

function textModal(customId, title, label, { value = '', style = TextInputStyle.Short, min = 1, max = 3, required = true, placeholder } = {}) {
    const input = new TextInputBuilder().setCustomId('value').setLabel(label).setStyle(style).setMinLength(min).setMaxLength(max).setRequired(required);
    if (value !== '' && value !== null && value !== undefined) input.setValue(String(value).slice(0, max));
    if (placeholder) input.setPlaceholder(placeholder);
    return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(new ActionRowBuilder().addComponents(input));
}

async function handleDashboard(interaction, client) {
    const triggerChannel = interaction.options.getChannel('trigger_channel');
    const guildId = interaction.guild.id;
    const fetchCurrent = () => getChannelConfiguration(client, guildId, triggerChannel.id);

    try {
        const initial = await fetchCurrent();
        await InteractionHelper.safeEditReply(interaction, buildDashboard(triggerChannel, initial));
        const message = await interaction.fetchReply();
        if (typeof message?.createMessageComponentCollector !== 'function') {
            throw new PacilBotError('Failed to fetch reply for collector', ErrorTypes.DISCORD_API, 'Gagal membuka kontrol pengaturan. Jalankan `/jointocreate dashboard` lagi.');
        }

        const collector = message.createMessageComponentCollector({ time: DASHBOARD_TIMEOUT_MS });
        const refresh = async (target) => target.update(buildDashboard(triggerChannel, await fetchCurrent()));
        const change = async (updates, logLabel) => {
            await updateChannelConfig(client, guildId, triggerChannel.id, updates);
            await logConfigurationChange(client, guildId, interaction.user.id, logLabel, { channelId: triggerChannel.id, ...updates });
        };

        collector.on('collect', async (component) => {
            try {
                if (!hasManageGuildPermission(component.member)) {
                    return await component.reply({ content: 'Kamu butuh izin **Manage Server** untuk memakai kontrol ini.', flags: MessageFlags.Ephemeral });
                }
                const action = component.customId.replace(/^jtc_cfg_/, '').replace(`_${triggerChannel.id}`, '');
                const current = effectiveSettings(await fetchCurrent());

                if (action === 'video') {
                    await change({ videoQuality: current.videoQuality === 'full' ? 'auto' : 'full' }, 'Mengubah mode video bawaan');
                    return await refresh(component);
                }
                if (action === 'region') {
                    const region = RTC_REGIONS.find((r) => r.value === component.values[0]);
                    if (!region) return await component.deferUpdate();
                    await change({ rtcRegion: region.rtc }, 'Mengubah region bawaan');
                    return await refresh(component);
                }
                if (action === 'delete') return await component.update(buildDeleteConfirm(triggerChannel));
                if (action === 'delno') return await refresh(component);
                if (action === 'delyes') {
                    await removeTriggerChannel(client, guildId, triggerChannel.id);
                    await logConfigurationChange(client, guildId, interaction.user.id, 'Removed Join to Create trigger', { channelId: triggerChannel.id, channelName: triggerChannel.name });
                    if (triggerChannel.members?.size === 0) {
                        await triggerChannel.delete('Join to Create trigger removed by administrator').catch((e) => logger.warn(`Could not delete channel ${triggerChannel.id}: ${e.message}`));
                    }
                    collector.stop('removed');
                    return await component.update({ embeds: [pacilNotice({ tone: 'success', title: 'Pemicu dihapus', body: `**${triggerChannel.name}** sudah dikeluarkan dari Join to Create.` })], components: [] });
                }

                // Aksi berbentuk modal: tampilkan, tunggu isian, lalu segarkan dashboard.
                const modalId = `jtc_modal_${action}_${triggerChannel.id}`;
                let modal;
                if (action === 'name') {
                    const select = new StringSelectMenuBuilder().setCustomId('template').setPlaceholder('Pilih template nama…')
                        .setOptions(NAME_TEMPLATES.map((value) => ({ label: value, value, default: value === current.template })));
                    modal = new ModalBuilder().setCustomId(modalId).setTitle('Template Nama Ruang')
                        .addLabelComponents(new LabelBuilder().setLabel('Template nama ruang').setStringSelectMenuComponent(select));
                } else if (action === 'limit') {
                    modal = textModal(modalId, 'Batas Orang', 'Batas orang (0 = tanpa batas, maks. 99)', { value: current.userLimit, max: 2, placeholder: '0' });
                } else if (action === 'bitrate') {
                    modal = textModal(modalId, 'Bitrate Suara', 'Bitrate dalam kbps (8–384)', { value: Math.round(current.bitrate / 1000), max: 3 });
                } else if (action === 'status') {
                    modal = textModal(modalId, 'Status Awal Ruang', 'Status awal (kosongkan untuk menghapus)', { value: current.defaultStatus, min: 0, max: ROOM_LIMITS.statusLength, required: false, style: TextInputStyle.Paragraph, placeholder: 'Contoh: Belajar bareng, santai aja' });
                } else {
                    return await component.deferUpdate();
                }

                await component.showModal(modal);
                const submission = await component.awaitModalSubmit({
                    filter: (i) => i.customId === modalId && i.user.id === component.user.id,
                    time: MODAL_TIMEOUT_MS,
                });
                if (!hasManageGuildPermission(submission.member)) {
                    return await submission.reply({ content: 'Kamu butuh izin **Manage Server** untuk mengubah pengaturan ini.', flags: MessageFlags.Ephemeral });
                }

                let updates;
                let logLabel;
                if (action === 'name') {
                    [updates, logLabel] = [{ nameTemplate: submission.fields.getStringSelectValues('template')[0] }, 'Mengubah template nama'];
                } else if (action === 'limit') {
                    const parsed = parseUserLimit(submission.fields.getTextInputValue('value'));
                    if (!parsed.ok) return await submission.reply({ content: 'Batas harus berupa angka 0 sampai 99.', flags: MessageFlags.Ephemeral });
                    [updates, logLabel] = [{ userLimit: parsed.value }, 'Mengubah batas orang'];
                } else if (action === 'bitrate') {
                    const parsed = parseBitrateKbps(submission.fields.getTextInputValue('value'), interaction.guild.maximumBitrate);
                    if (!parsed.ok) {
                        const text = parsed.error === 'bitrateTooHigh'
                            ? `Bitrate maksimal untuk server ini **${parsed.maxKbps} kbps** (naik level boost untuk batas lebih tinggi).`
                            : 'Bitrate harus berupa angka dalam kbps, minimal 8.';
                        return await submission.reply({ content: text, flags: MessageFlags.Ephemeral });
                    }
                    [updates, logLabel] = [{ bitrate: parsed.value }, 'Mengubah bitrate'];
                } else {
                    [updates, logLabel] = [{ defaultStatus: sanitizeRoomStatus(submission.fields.getTextInputValue('value')) }, 'Mengubah status awal'];
                }
                await change(updates, logLabel);
                return await refresh(submission);
            } catch (error) {
                if (isModalTimeout(error)) return;
                const text = error instanceof PacilBotError ? (error.userMessage || 'Terjadi kendala.') : 'Waduh, pengaturan tidak bisa disimpan. Coba lagi ya.';
                if (error instanceof PacilBotError) logger.debug(`JTC dashboard validation: ${error.message}`, error.context || {});
                else logger.error('Unexpected error in JTC dashboard interaction:', error);
                const payload = { content: `❌ ${text}`, flags: MessageFlags.Ephemeral };
                await (component.deferred || component.replied ? component.followUp(payload) : component.reply(payload)).catch(() => {});
            }
        });

        collector.on('end', (_collected, reason) => {
            if (reason === 'removed') return;
            fetchCurrent()
                .then((current) => message.edit(buildDashboard(triggerChannel, current, { expired: true })))
                .catch(() => {});
        });
    } catch (error) {
        if (error instanceof PacilBotError) throw error;
        throw new PacilBotError(`Dashboard failed: ${error.message}`, ErrorTypes.DATABASE, 'Gagal memuat pengaturan. Coba lagi sebentar.');
    }
}
