import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../ui/pacil.js';
import {
  applyRoleColors,
  deleteUserBoosterRole,
  getBoosterConfig,
  getUserBoosterRole,
  parseRoleColors,
  saveUserBoosterRole,
} from './boosterService.js';
import { safeModal, safeTextInputRow } from '../utils/modalHelper.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { logger } from '../utils/logger.js';

export const CUSTOM_ROLE_PREFIX = 'crole:';

/**
 * Builds the official Custom & Circle Role panel (Screenshot 2).
 */
export function buildCustomRolePanel() {
  const embed = buildPacilEmbed({
    title: 'PACIL CUSTOM & CIRCLE ROLE',
    description:
      'Buat dan kelola custom role serta circle room kamu sendiri.\n\n' +
      '**Fitur yang tersedia:**\n' +
      '• ➕ **Create Role:** Buat custom / circle role\n' +
      '• 🎁 **Gift Role:** Berikan custom role ke member / teman circle\n' +
      '• 👥 **Manage Gift Role:** Kelola member penerima role\n' +
      '• ✏️ **Manage Role Name:** Kelola nama custom role\n' +
      '• 🎨 **Manage Role Color:** Solid, Gradient, atau Preset Makara\n' +
      '• 🖼️ **Manage Role Icon:** Kelola icon custom role\n' +
      '• 🗑️ **Delete Role:** Hapus custom role\n\n' +
      '*Custom Role hanya tersedia untuk Server Booster.*',
    tone: 'gold',
  });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('crole:create')
      .setLabel('Create Role')
      .setStyle(ButtonStyle.Success)
      .setEmoji('➕'),
    new ButtonBuilder()
      .setCustomId('crole:gift')
      .setLabel('Gift Role')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎁'),
    new ButtonBuilder()
      .setCustomId('crole:managegift')
      .setLabel('Manage Gift Role')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👥'),
    new ButtonBuilder()
      .setCustomId('crole:delete')
      .setLabel('Delete Role')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('crole:name')
      .setLabel('Manage Role Name')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️'),
    new ButtonBuilder()
      .setCustomId('crole:color')
      .setLabel('Manage Role Color')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨'),
    new ButtonBuilder()
      .setCustomId('crole:icon')
      .setLabel('Manage Role Icon')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🖼️')
  );

  return { embeds: [embed], components: [row1, row2] };
}

/**
 * Checks booster authorization.
 */
export function isBoosterOrAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return Boolean(member.premiumSince);
}

/**
 * Handles button interactions for Custom & Circle Role panel.
 */
export async function handleCustomRoleButton(interaction, client, action) {
  const { member, guild } = interaction;

  if (!isBoosterOrAdmin(member)) {
    return interaction.reply({
      content:
        '❌ **Akses Ditolak: Fitur Khusus Server Booster**\n' +
        'Kamu perlu mem-boost server ini terlebih dahulu untuk membuat dan mengelola Custom / Circle Role.\n' +
        'Dukungan boost kamu akan tercatat di **#boost-hall**!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const userRoleData = await getUserBoosterRole(client, guild.id, member.id);

  // 1. CREATE ROLE
  if (action === 'create') {
    if (userRoleData?.roleId) {
      const existingRole = guild.roles.cache.get(userRoleData.roleId);
      if (existingRole) {
        return interaction.reply({
          content: `⚠️ Kamu sudah memiliki custom role: ${existingRole.toString()}.\nGunakan menu edit untuk mengubah nama, warna, atau ikon.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = safeModal({
      customId: 'crole:modal:create',
      title: 'Buat Custom Role Baru',
      rows: [
        safeTextInputRow({
          id: 'name',
          label: 'Nama Role / Circle',
          style: TextInputStyle.Short,
          required: true,
          max: 32,
          placeholder: 'Contoh: Circle Algoritma',
        }),
        safeTextInputRow({
          id: 'color',
          label: 'Warna Hex (mis. #f2a900 atau gradien)',
          style: TextInputStyle.Short,
          required: false,
          max: 30,
          placeholder: '#f2a900 atau #0d3a73, #f2a900',
        }),
      ],
    });
    return interaction.showModal(modal);
  }

  // Verification that role exists for subsequent actions
  if (!userRoleData?.roleId) {
    return interaction.reply({
      content: '⚠️ Kamu belum memiliki custom role. Klik **Create Role** terlebih dahulu!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = guild.roles.cache.get(userRoleData.roleId) || (await guild.roles.fetch(userRoleData.roleId).catch(() => null));
  if (!role) {
    await deleteUserBoosterRole(client, guild.id, member.id);
    return interaction.reply({
      content: '⚠️ Role kamu sebelumnya tidak ditemukan di server. Silakan buat role baru.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. GIFT ROLE
  if (action === 'gift') {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('crole:select:gift')
      .setPlaceholder('Pilih member circle untuk diberikan role')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelect);
    return interaction.reply({
      content: `🎁 Pilih teman atau anggota circle yang ingin kamu berikan role ${role.toString()}:`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 3. MANAGE GIFT ROLE (REVOKE)
  if (action === 'managegift') {
    const recipients = Array.isArray(userRoleData.giftedTo) ? userRoleData.giftedTo : [];
    if (recipients.length === 0) {
      return interaction.reply({
        content: `ℹ️ Kamu belum memberikan role ${role.toString()} ke member lain. Gunakan **Gift Role** untuk membagikannya.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const options = recipients.slice(0, 25).map((uid) => {
      const targetMember = guild.members.cache.get(uid);
      return {
        label: targetMember?.user?.username || `User ${uid}`,
        description: `Cabut role dari ${uid}`,
        value: uid,
      };
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('crole:select:revoke')
      .setPlaceholder('Pilih member yang ingin dicabut rolenya')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    return interaction.reply({
      content: `👥 Daftar member yang menerima role ${role.toString()}. Pilih untuk mencabut:`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 4. MANAGE ROLE NAME
  if (action === 'name') {
    const modal = safeModal({
      customId: 'crole:modal:name',
      title: 'Ubah Nama Custom Role',
      rows: [
        safeTextInputRow({
          id: 'name',
          label: 'Nama Role Baru',
          style: TextInputStyle.Short,
          required: true,
          value: role.name,
          max: 32,
          placeholder: 'Nama circle / role baru...',
        }),
      ],
    });
    return interaction.showModal(modal);
  }

  // 5. MANAGE ROLE COLOR
  if (action === 'color') {
    const modal = safeModal({
      customId: 'crole:modal:color',
      title: 'Ubah Warna Custom Role',
      rows: [
        safeTextInputRow({
          id: 'color',
          label: 'Warna Hex (mis. #f2a900 atau gradien)',
          style: TextInputStyle.Short,
          required: true,
          value: role.hexColor !== '#000000' ? role.hexColor : '#f2a900',
          max: 30,
          placeholder: '#f2a900 atau #0d3a73, #f2a900',
        }),
      ],
    });
    return interaction.showModal(modal);
  }

  // 6. MANAGE ROLE ICON
  if (action === 'icon') {
    if (guild.premiumTier < 2) {
      return interaction.reply({
        content: `⚠️ Server belum mencapai Boost Tier 2 (saat ini Tier ${guild.premiumTier}). Role icon memerlukan server boost Tier 2.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = safeModal({
      customId: 'crole:modal:icon',
      title: 'Ubah Ikon Custom Role',
      rows: [
        safeTextInputRow({
          id: 'icon',
          label: 'URL Gambar Icon (PNG/JPG, https)',
          style: TextInputStyle.Short,
          required: true,
          max: 200,
          placeholder: 'https://i.imgur.com/example.png',
        }),
      ],
    });
    return interaction.showModal(modal);
  }

  // 7. DELETE ROLE
  if (action === 'delete') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await role.delete('Custom role dihapus oleh pemilik').catch(() => {});
      await deleteUserBoosterRole(client, guild.id, member.id);
      return interaction.editReply({
        content: `✅ Custom role **"${role.name}"** telah berhasil dihapus.`,
      });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Gagal menghapus role: ${err.message}`,
      });
    }
  }
}

/**
 * Handles modals submitted from the Custom Role panel.
 */
export async function handleCustomRoleModal(interaction, client, modalId) {
  const { member, guild } = interaction;
  const action = String(modalId).replace(/^crole_modal_/, '').replace(/^crole:modal:/, '').replace(/^crole:/, '');

  await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

  if (action === 'create') {
    const name = interaction.fields.getTextInputValue('name').trim();
    const colorInput = interaction.fields.getTextInputValue('color')?.trim() || '#f2a900';

    const parsed = parseRoleColors(colorInput);
    if (!parsed.ok) {
      return InteractionHelper.safeEditReply(interaction, { content: `❌ ${parsed.error}` });
    }

    try {
      const me = guild.members.me;
      const botRole = me.roles.highest;

      const newRole = await guild.roles.create({
        name,
        color: parsed.primary,
        position: botRole.position > 1 ? botRole.position - 1 : 1,
        reason: `Custom role booster dibuat oleh ${member.user.tag}`,
      });

      if (parsed.secondary !== null) {
        await applyRoleColors(newRole, parsed).catch(() => {});
      }

      await member.roles.add(newRole, 'Member custom role booster');

      await saveUserBoosterRole(client, guild.id, member.id, {
        roleId: newRole.id,
        ownerId: member.id,
        createdAt: Date.now(),
        giftedTo: [],
      });

      return InteractionHelper.safeEditReply(interaction, {
        content: `🎉 Selamat! Custom role **${newRole.toString()}** berhasil dibuat dan diberikan kepadamu!`,
      });
    } catch (err) {
      logger.error('Gagal membuat custom role booster:', err);
      return InteractionHelper.safeEditReply(interaction, {
        content: `❌ Gagal membuat role di Discord: ${err.message}. Pastikan role bot berada di atas role yang akan dibuat.`,
      });
    }
  }

  const userRoleData = await getUserBoosterRole(client, guild.id, member.id);
  if (!userRoleData?.roleId) {
    return InteractionHelper.safeEditReply(interaction, { content: '⚠️ Kamu belum memiliki custom role.' });
  }

  const role = guild.roles.cache.get(userRoleData.roleId) || (await guild.roles.fetch(userRoleData.roleId).catch(() => null));
  if (!role) {
    return InteractionHelper.safeEditReply(interaction, { content: '⚠️ Role tidak ditemukan.' });
  }

  if (action === 'name') {
    const newName = interaction.fields.getTextInputValue('name').trim();
    await role.setName(newName, `Diubah oleh ${member.user.tag}`);
    return InteractionHelper.safeEditReply(interaction, { content: `✅ Nama custom role berhasil diubah menjadi **${newName}**!` });
  }

  if (action === 'color') {
    const colorInput = interaction.fields.getTextInputValue('color').trim();
    const parsed = parseRoleColors(colorInput);
    if (!parsed.ok) return InteractionHelper.safeEditReply(interaction, { content: `❌ ${parsed.error}` });

    await applyRoleColors(role, parsed);
    return InteractionHelper.safeEditReply(interaction, { content: `✅ Warna role ${role.toString()} berhasil diperbarui!` });
  }

  if (action === 'icon') {
    const iconUrl = interaction.fields.getTextInputValue('icon').trim();
    try {
      await role.setIcon(iconUrl, `Icon diubah oleh ${member.user.tag}`);
      return InteractionHelper.safeEditReply(interaction, { content: `✅ Ikon custom role ${role.toString()} berhasil diperbarui!` });
    } catch (err) {
      return InteractionHelper.safeEditReply(interaction, { content: `❌ Gagal memasang icon: ${err.message}` });
    }
  }
}

/**
 * Handles user and string select menus for gift / revoke.
 */
export async function handleCustomRoleSelect(interaction, client, selectId) {
  const { member, guild } = interaction;
  const action = String(selectId).replace(/^crole_select_/, '').replace(/^crole:select:/, '').replace(/^crole:/, '');

  await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

  const userRoleData = await getUserBoosterRole(client, guild.id, member.id);
  if (!userRoleData?.roleId) {
    return InteractionHelper.safeEditReply(interaction, { content: '⚠️ Custom role tidak ditemukan.' });
  }

  const role = guild.roles.cache.get(userRoleData.roleId);
  if (!role) {
    return InteractionHelper.safeEditReply(interaction, { content: '⚠️ Role tidak ditemukan di server.' });
  }

  if (action === 'gift') {
    const targetUserId = interaction.values[0];
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

    if (!targetMember) {
      return InteractionHelper.safeEditReply(interaction, { content: '❌ Member tidak ditemukan.' });
    }

    if (targetMember.id === member.id) {
      return InteractionHelper.safeEditReply(interaction, { content: '⚠️ Kamu sudah memiliki role ini.' });
    }

    const currentGifted = Array.isArray(userRoleData.giftedTo) ? userRoleData.giftedTo : [];
    if (currentGifted.includes(targetUserId)) {
      return InteractionHelper.safeEditReply(interaction, { content: `⚠️ ${targetMember.toString()} sudah memiliki role ini.` });
    }

    await targetMember.roles.add(role, `Diberikan oleh ${member.user.tag}`);
    currentGifted.push(targetUserId);
    await saveUserBoosterRole(client, guild.id, member.id, { ...userRoleData, giftedTo: currentGifted });

    return InteractionHelper.safeEditReply(interaction, {
      content: `🎁 Berhasil memberikan custom role ${role.toString()} ke ${targetMember.toString()}!`,
    });
  }

  if (action === 'revoke') {
    const targetUserId = interaction.values[0];
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

    if (targetMember) {
      await targetMember.roles.remove(role, `Dicabut oleh pemilik custom role ${member.user.tag}`).catch(() => {});
    }

    const currentGifted = (Array.isArray(userRoleData.giftedTo) ? userRoleData.giftedTo : []).filter(
      (id) => id !== targetUserId
    );
    await saveUserBoosterRole(client, guild.id, member.id, { ...userRoleData, giftedTo: currentGifted });

    return InteractionHelper.safeEditReply(interaction, {
      content: `✅ Role ${role.name} berhasil dicabut dari <@${targetUserId}>.`,
    });
  }
}
