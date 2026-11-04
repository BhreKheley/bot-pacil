import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';
import { getUserBoosterRole, deleteUserBoosterRole } from '../../../services/boosterService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';

export default {
  name: 'booster',
  async execute(interaction, client, [action]) {
    const isBooster = Boolean(interaction.member?.premiumSince);
    const isAdmin = interaction.memberPermissions?.has('Administrator');

    if (!isBooster && !isAdmin) {
      return interaction.reply({
        content: '❌ Fitur ini khusus untuk Server Booster server Pacil Baik Fasilkom UI! Terima kasih atas dukungannya.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 1. Create Role
    if (action === 'create') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (existing) {
        return interaction.reply({
          content: `❌ Kamu sudah memiliki custom role booster: <@&${existing.roleId}>. Gunakan tombol **Manage Name** atau **Manage Color** untuk mengeditnya.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`boosterModal:create:${interaction.guildId}`)
        .setTitle('Buat Custom Role Booster');

      const nameInput = new TextInputBuilder()
        .setCustomId('role_name')
        .setLabel('Nama Role Impian')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Sepuh Basdat, Elite Pacil, dll.')
        .setMinLength(2)
        .setMaxLength(30)
        .setRequired(true);

      const colorInput = new TextInputBuilder()
        .setCustomId('role_color')
        .setLabel('Hex solid, atau 2 hex untuk gradien')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#F2A900  atau  #0d3a73, #f2a900')
        .setMaxLength(20)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(colorInput)
      );

      return interaction.showModal(modal);
    }

    // 2. Manage Name
    if (action === 'name') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (!existing) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki custom role. Buat terlebih dahulu dengan tombol **Create Role**!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`boosterModal:name:${interaction.guildId}`)
        .setTitle('Ganti Nama Role Booster');

      const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Nama Role Baru')
        .setStyle(TextInputStyle.Short)
        .setValue(existing.name || '')
        .setMinLength(2)
        .setMaxLength(30)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      return interaction.showModal(modal);
    }

    // 3. Manage Color
    if (action === 'color') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (!existing) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki custom role. Buat terlebih dahulu dengan tombol **Create Role**!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`boosterModal:color:${interaction.guildId}`)
        .setTitle('Ganti Warna Role Booster');

      const colorInput = new TextInputBuilder()
        .setCustomId('new_color')
        .setLabel('Hex solid, atau 2 hex untuk gradien')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#f2a900')
        .setMaxLength(20)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
      return interaction.showModal(modal);
    }

    // 4. Manage Icon
    if (action === 'icon') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (!existing) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki custom role.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`boosterModal:icon:${interaction.guildId}`)
        .setTitle('Atur Ikon Role Booster');

      const iconInput = new TextInputBuilder()
        .setCustomId('icon_url')
        .setLabel('URL Gambar PNG/JPG atau Emoji')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/icon.png atau emoji')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(iconInput));
      return interaction.showModal(modal);
    }

    // 5. Gift Role
    if (action === 'gift') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (!existing) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki custom role untuk dibagikan.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`boosterModal:gift:${interaction.guildId}`)
        .setTitle('Hadiahkan Role ke Teman');

      const userInput = new TextInputBuilder()
        .setCustomId('target_user')
        .setLabel('ID User atau Mention Teman (@user)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678 atau @teman')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(userInput));
      return interaction.showModal(modal);
    }

    // 6. Delete Role
    if (action === 'delete') {
      const existing = await getUserBoosterRole(client, interaction.guildId, interaction.user.id);
      if (!existing) {
        return interaction.reply({
          content: '❌ Kamu tidak memiliki custom role aktif.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const role = interaction.guild.roles.cache.get(existing.roleId)
        || (await interaction.guild.roles.fetch(existing.roleId).catch(() => null));

      if (role) {
        await role.delete('Custom role booster deleted by user').catch(() => {});
      }

      await deleteUserBoosterRole(client, interaction.guildId, interaction.user.id);

      return interaction.reply({
        content: `✅ Custom role **"${existing.name}"** telah berhasil dihapus.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

