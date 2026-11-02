import { MessageFlags } from 'discord.js';
import {
  getUserBoosterRole,
  saveUserBoosterRole,
} from '../../../services/boosterService.js';
import { PACIL_COLORS, buildPacilEmbed } from '../../../ui/pacil.js';

function parseColorHex(input = '') {
  const clean = input.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return parseInt(clean, 16);
  }
  return PACIL_COLORS.gold;
}

export default {
  name: 'boosterModal',
  async execute(interaction, client, [action]) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 1. Create Role Submit
    if (action === 'create') {
      const name = interaction.fields.getTextInputValue('role_name')?.trim();
      const rawColor = interaction.fields.getTextInputValue('role_color')?.trim();
      const color = rawColor ? parseColorHex(rawColor) : PACIL_COLORS.gold;

      try {
        const role = await interaction.guild.roles.create({
          name: `💎 ${name}`,
          color,
          reason: `Custom role created by booster ${interaction.user.tag}`,
        });

        await interaction.member.roles.add(role);

        await saveUserBoosterRole(client, interaction.guildId, interaction.user.id, {
          roleId: role.id,
          name,
          color,
          ownerId: interaction.user.id,
          createdAt: Date.now(),
        });

        const successEmbed = buildPacilEmbed({
          title: '✨ Custom Role Berhasil Dibuat!',
          description: `Selamat! Role khusus kamu <@&${role.id}> telah terpasang di profilmu.`,
          tone: 'gold',
          fields: [
            { name: '🏷️ Nama Role', value: `💎 ${name}`, inline: true },
            { name: '🎨 Warna', value: rawColor || '#F2A900 (Makara Gold)', inline: true },
          ],
          footer: 'Makara Fasilkom UI • Booster Perks',
        });

        return interaction.editReply({ embeds: [successEmbed] });
      } catch (err) {
        return interaction.editReply({ content: `❌ Gagal membuat role: ${err.message}` });
      }
    }

    // 2. Name Submit
    if (action === 'name') {
      const newName = interaction.fields.getTextInputValue('new_name')?.trim();
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);

      if (!existing) {
        return interaction.editReply({ content: '❌ Data role tidak ditemukan.' });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        await role.setName(`💎 ${newName}`);
        existing.name = newName;
        await saveUserBoosterRole(client, interaction.guildId, interaction.user.id, existing);
        return interaction.editReply({ content: `✅ Nama role berhasil diubah menjadi **"💎 ${newName}"**!` });
      } else {
        return interaction.editReply({ content: '❌ Role tidak ditemukan di server Discord.' });
      }
    }

    // 3. Color Submit
    if (action === 'color') {
      const newColor = interaction.fields.getTextInputValue('new_color')?.trim();
      const parsedColor = parseColorHex(newColor);
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);

      if (!existing) {
        return interaction.editReply({ content: '❌ Data role tidak ditemukan.' });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        await role.setColor(parsedColor);
        existing.color = parsedColor;
        await saveUserBoosterRole(client, interaction.guildId, interaction.user.id, existing);
        return interaction.editReply({ content: `✅ Warna role berhasil diubah menjadi **${newColor}**!` });
      } else {
        return interaction.editReply({ content: '❌ Role tidak ditemukan di server Discord.' });
      }
    }

    // 4. Icon Submit
    if (action === 'icon') {
      const iconUrl = interaction.fields.getTextInputValue('icon_url')?.trim();
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);

      if (!existing) {
        return interaction.editReply({ content: '❌ Data role tidak ditemukan.' });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        try {
          await role.setIcon(iconUrl);
          return interaction.editReply({ content: `✅ Ikon role berhasil diperbarui!` });
        } catch (err) {
          return interaction.editReply({ content: `❌ Gagal memasang icon: ${err.message}. Pastikan server mencapai Level 2 Boost untuk fitur Role Icon.` });
        }
      }
    }

    // 5. Gift Submit
    if (action === 'gift') {
      const rawUser = interaction.fields.getTextInputValue('target_user')?.trim();
      const cleanUserId = rawUser.replace(/[<@!>]/g, '');
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);

      if (!existing) {
        return interaction.editReply({ content: '❌ Data role tidak ditemukan.' });
      }

      const targetMember = await interaction.guild.members.fetch(cleanUserId).catch(() => null);
      if (!targetMember) {
        return interaction.editReply({ content: `❌ Member dengan ID/mention "${rawUser}" tidak ditemukan di server.` });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        await targetMember.roles.add(role);
        return interaction.editReply({ content: `🎁 Berhasil memberikan custom role **"${role.name}"** kepada <@${targetMember.id}>!` });
      } else {
        return interaction.editReply({ content: '❌ Role tidak ditemukan di server.' });
      }
    }
  },
};
