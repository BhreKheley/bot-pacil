import { MessageFlags } from 'discord.js';
import {
  getUserBoosterRole,
  saveUserBoosterRole,
  parseRoleColors,
  applyRoleColors,
} from '../../../services/boosterService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';

export default {
  name: 'boosterModal',
  async execute(interaction, client, [action]) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 1. Create Role Submit
    if (action === 'create') {
      const name = interaction.fields.getTextInputValue('role_name')?.trim();
      const rawColor = interaction.fields.getTextInputValue('role_color')?.trim();
      const colors = parseRoleColors(rawColor || '#F2A900');
      if (!colors.ok) return interaction.editReply({ content: `❌ ${colors.error}` });
      const color = colors.primary;

      try {
        const role = await interaction.guild.roles.create({
          name: `💎 ${name}`,
          colors: { primaryColor: colors.primary },
          reason: `Custom role created by booster ${interaction.user.tag}`,
        });
        const applied = colors.secondary !== null ? await applyRoleColors(role, colors) : { gradient: false };

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
            { name: '🎨 Warna', value: `${rawColor || '#F2A900 (Makara Gold)'}${applied.fallback ? ' — gradien butuh level boost lebih tinggi, dipasang solid' : ''}`, inline: true },
          ],
          footer: 'Booster Perks',
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
      const parsed = parseRoleColors(newColor);
      if (!parsed.ok) return interaction.editReply({ content: `❌ ${parsed.error}` });
      const parsedColor = parsed.primary;
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);

      if (!existing) {
        return interaction.editReply({ content: '❌ Data role tidak ditemukan.' });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        const applied = await applyRoleColors(role, parsed);
        existing.color = parsedColor;
        await saveUserBoosterRole(client, interaction.guildId, interaction.user.id, existing);
        const note = applied.fallback ? ' (gradien butuh level boost lebih tinggi, dipasang solid)' : applied.gradient ? ' (gradien)' : '';
        return interaction.editReply({ content: `✅ Warna role berhasil diubah menjadi **${newColor}**${note}!` });
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

