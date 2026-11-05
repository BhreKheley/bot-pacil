import { pacilEmbed, PACIL_COLORS } from '../../../ui/pacil.js';
import { AttachmentBuilder } from 'discord.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { renderBirthdayCard } from '../../../utils/imageGenerator.js';
import { logger } from '../../../utils/logger.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const userId = targetUser.id;
        const guildId = interaction.guildId;

        const birthdayData = await getUserBirthday(client, guildId, userId);

        if (!birthdayData) {
            const embed = pacilEmbed()
                .setColor(PACIL_COLORS.error)
                .setTitle('Ulang Tahun Belum Diatur')
                .setDescription(targetUser.id === interaction.user.id 
                    ? "Kamu belum mengatur tanggal ulang tahunmu. Gunakan `/birthday set` untuk mengaturnya!"
                    : `${targetUser.username} belum mengatur tanggal ulang tahunnya di server ini.`);
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        let files = [];
        try {
            const cardBuffer = await renderBirthdayCard({
                member: member || { user: targetUser, displayName: targetUser.username },
                guild: interaction.guild,
                dateString: `${birthdayData.day} ${birthdayData.monthName}`,
                wish: `Selamat menyambut hari spesial! Semoga sukses perkuliahan di Fasilkom UI.`,
            });
            if (cardBuffer) {
                files.push(new AttachmentBuilder(cardBuffer, { name: 'birthday-card.png' }));
            }
        } catch (err) {
            logger.debug('Failed to render birthday card:', err?.message);
        }

        const embed = pacilEmbed()
            .setColor(PACIL_COLORS.gold)
            .setTitle('🎂 Informasi Ulang Tahun Warga Pacil')
            .setDescription(`**Member:** ${targetUser.toString()} (\`@${targetUser.username}\`)\n**Tanggal:** ${birthdayData.day} ${birthdayData.monthName}`)
            .setImage(files.length ? 'attachment://birthday-card.png' : null);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            files,
        });

        logger.info('Birthday info retrieved successfully', {
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            guildId,
            commandName: 'birthday_info'
        });
    }
};