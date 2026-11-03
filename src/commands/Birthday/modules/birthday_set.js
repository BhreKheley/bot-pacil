import { pacilEmbed, PACIL_COLORS } from '../../../ui/pacil.js';

import { setBirthday } from '../../../services/birthdayService.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const month = interaction.options.getInteger("month");
        const day = interaction.options.getInteger("day");
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        const result = await setBirthday(client, guildId, userId, month, day);

        const embed = pacilEmbed()
            .setColor(PACIL_COLORS.success)
            .setTitle('Birthday Set!')
            .setDescription(`Your birthday has been set to **${result.data.monthName} ${result.data.day}**!`);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });
    }
};