import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { createPrivateCircle, circleRequestKey } from '../../../services/circleService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';

export default {
  name: 'circleReview',
  async execute(interaction, client, [action, reqId]) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'Hanya pengurus (Manage Server) yang dapat memproses permintaan ini.', flags: MessageFlags.Ephemeral });
    }
    const key = circleRequestKey(interaction.guildId, reqId);
    const req = await client.db.get(key, null);
    if (!req) return interaction.reply({ content: 'Permintaan sudah diproses atau tidak ditemukan.', flags: MessageFlags.Ephemeral });
    await client.db.delete(key); // klaim dulu agar tidak diproses ganda
    const user = await client.users.fetch(req.userId).catch(() => null);
    let verdict;
    if (action === 'approve') {
      try {
        const member = await interaction.guild.members.fetch(req.userId);
        const { textChannel } = await createPrivateCircle(client, interaction.guild, member, req.name);
        verdict = `✅ Disetujui oleh <@${interaction.user.id}> — <#${textChannel.id}>`;
        await user?.send(`Circle **${req.name}** disetujui! Masuk ke <#${textChannel.id}> dan undang temanmu dengan \`/circle add\`.`).catch(() => {});
      } catch (e) {
        verdict = `⚠️ Gagal membuat circle: ${e.message}`;
      }
    } else {
      verdict = `❌ Ditolak oleh <@${interaction.user.id}>`;
      await user?.send(`Permintaan circle **${req.name}** belum dapat disetujui pengurus.`).catch(() => {});
    }
    return interaction.update({
      embeds: [buildPacilEmbed({ title: '👥 Permintaan Circle', description: `**${req.name}** — <@${req.userId}>\n${verdict}`, tone: verdict.startsWith('✅') ? 'success' : 'warning' })],
      components: [],
    });
  },
};
