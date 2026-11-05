import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWelcomeCard, renderBoostCard } from '../src/utils/imageGenerator.js';
import { safeModal, safeTextInputRow, MODAL_LIMITS } from '../src/utils/modalHelper.js';
import { buildCustomRolePanel, isBoosterOrAdmin } from '../src/services/customRoleService.js';
import { buildCategoryTicketPanel, TICKET_CATEGORIES } from '../src/services/ticket/ticketCategoryPanels.js';
import { buildStaffListEmbed } from '../src/commands/Community/staff.js';
import { resolveBoostChannel } from '../src/services/boostHallService.js';
import { PermissionFlagsBits } from 'discord.js';

test('imageGenerator menghasilkan buffer PNG valid untuk Welcome & Boost card', async () => {
  const welcomeBuffer = await renderWelcomeCard({
    member: { user: { username: 'testuser', globalName: 'Test User' } },
    guild: { name: 'Fasilkom UI' },
    inviterTag: '@Akame',
    memberCount: 521,
  });

  assert.ok(Buffer.isBuffer(welcomeBuffer));
  assert.ok(welcomeBuffer.length > 50000, 'Ukuran buffer welcome card minimal 50KB');

  const boostBuffer = await renderBoostCard({
    member: { user: { username: 'booster' } },
    guild: { name: 'Fasilkom UI' },
    totalBoosts: 12,
    boostTier: 2,
  });

  assert.ok(Buffer.isBuffer(boostBuffer));
  assert.ok(boostBuffer.length > 50000, 'Ukuran buffer boost card minimal 50KB');
});

test('modalHelper memotong label <= 45 karakter dan placeholder <= 100 karakter', () => {
  const row = safeTextInputRow({
    id: 'very_long_input_id_that_might_exceed_limits',
    label: 'Label yang sengaja dibuat sangat panjang sekali agar melebihi batas 45 karakter yang ditentukan oleh Discord',
    placeholder: 'Placeholder yang juga dibuat sangat panjang melebihi seratus karakter untuk menguji fungsi pemotongan otomatis oleh helper modal',
    max: 5000,
    value: 'Some value',
  });

  const comp = row.components[0];
  assert.ok(comp.data.label.length <= MODAL_LIMITS.LABEL_MAX);
  assert.ok(comp.data.placeholder.length <= MODAL_LIMITS.PLACEHOLDER_MAX);

  const modal = safeModal({
    customId: 'custom_id_modal',
    title: 'Judul Modal yang sengaja dibuat panjang sekali melebihi empat puluh lima karakter',
    rows: [row],
  });

  assert.ok(modal.data.title.length <= MODAL_LIMITS.TITLE_MAX);
});

test('customRoleService: buildCustomRolePanel membuat panel 7 tombol interaktif', () => {
  const panel = buildCustomRolePanel();
  assert.equal(panel.embeds.length, 1);
  assert.equal(panel.components.length, 2);

  const allButtonIds = panel.components.flatMap((r) => r.components.map((c) => c.data.custom_id));
  assert.deepEqual(allButtonIds, [
    'crole:create',
    'crole:gift',
    'crole:managegift',
    'crole:delete',
    'crole:name',
    'crole:color',
    'crole:icon',
  ]);

  assert.equal(isBoosterOrAdmin({ premiumSince: new Date() }), true);
  assert.equal(isBoosterOrAdmin({ premiumSince: null, permissions: { has: () => false } }), false);
  assert.equal(isBoosterOrAdmin({ premiumSince: null, permissions: { has: (p) => p === PermissionFlagsBits.Administrator } }), true);
});

test('ticketCategoryPanels: membuat panel mandiri untuk bantuan, report, dan suggestion', () => {
  for (const key of ['bantuan', 'report', 'suggestion']) {
    const panel = buildCategoryTicketPanel(key);
    assert.equal(panel.embeds.length, 1);
    assert.equal(panel.components.length, 1);
    const btn = panel.components[0].components[0];
    assert.equal(btn.data.custom_id, `ticket_create_cat:${key}`);
    assert.match(btn.data.label, new RegExp(TICKET_CATEGORIES[key].name, 'i'));
  }
});

test('boostHallService: resolveBoostChannel mendeteksi channel boost', () => {
  const channels = new Map([
    ['1', { id: '1', name: 'general', isTextBased: () => true }],
    ['2', { id: '2', name: 'boost-hall', isTextBased: () => true }],
  ]);
  const guild = { channels: { cache: channels } };

  assert.equal(resolveBoostChannel(guild, '2')?.id, '2');
  assert.equal(resolveBoostChannel(guild, null)?.id, '2');
});
