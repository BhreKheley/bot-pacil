import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStudentMetadata,
  generateVerificationState,
  verifyVerificationState,
} from '../src/services/ssoUiService.js';
import { renderVerificationSubPanel } from '../src/ui/panels/verificationSubPanel.js';
import { renderTicketSubPanel } from '../src/ui/panels/ticketSubPanel.js';

test('SSO UI Verification Suite: Student Metadata & Security Parser', async (t) => {
  await t.test('parseStudentMetadata parses Ilmu Komputer (CS) and 2024 Angkatan', () => {
    const student = parseStudentMetadata({
      username: 'drew.taylor',
      npm: '2406123456',
      kd_org: '01.00.12.01',
      nama: 'Drew Taylor',
    });

    assert.equal(student.npm, '2406123456');
    assert.equal(student.angkatan, '2024');
    assert.equal(student.shortYear, '24');
    assert.equal(student.prodi, 'Ilmu Komputer');
    assert.equal(student.prodiCode, 'CS');
    assert.equal(student.isFasilkom, true);
    assert.equal(student.formattedNickname, 'Drew Taylor (CS\'24)');
  });

  await t.test('parseStudentMetadata parses Sistem Informasi (SI) and 2023 Angkatan', () => {
    const student = parseStudentMetadata({
      username: 'aisyah.putri',
      npm: '2306987654',
      kd_org: '01.00.12.02',
      nama: 'Aisyah Putri',
    });

    assert.equal(student.npm, '2306987654');
    assert.equal(student.angkatan, '2023');
    assert.equal(student.shortYear, '23');
    assert.equal(student.prodi, 'Sistem Informasi');
    assert.equal(student.prodiCode, 'SI');
    assert.equal(student.isFasilkom, true);
    assert.equal(student.formattedNickname, 'Aisyah Putri (SI\'23)');
  });

  await t.test('generateVerificationState and verifyVerificationState HMAC validation', () => {
    const guildId = '123456789012345678';
    const userId = '987654321098765432';

    const token = generateVerificationState(guildId, userId);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyVerificationState(token);
    assert.ok(verified !== null);
    assert.equal(verified.guildId, guildId);
    assert.equal(verified.userId, userId);
    assert.ok(verified.expiresAt > Date.now());

    // Tampered token fails
    const tampered = token.slice(0, -4) + 'abcd';
    assert.equal(verifyVerificationState(tampered), null);
  });

  await t.test('renderVerificationSubPanel renders 5 action rows and Makara embed', async () => {
    const mockGuild = {
      id: 'mock-guild',
      name: 'pacil baik',
      channels: { cache: new Map() },
      roles: { cache: new Map() },
    };
    const mockClient = {};

    const panel = await renderVerificationSubPanel(mockClient, mockGuild);
    assert.ok(panel.embeds && panel.embeds.length === 1);
    assert.ok(panel.components && panel.components.length <= 5);
    assert.ok(panel.embeds[0].data.title.includes('Verification System'));
  });

  await t.test('renderTicketSubPanel renders category deploy buttons and clean embed', async () => {
    const mockGuild = {
      id: 'mock-guild',
      name: 'pacil baik',
      channels: { cache: new Map() },
      roles: { cache: new Map() },
    };
    const mockClient = {};

    const panel = await renderTicketSubPanel(mockClient, mockGuild);
    assert.ok(panel.embeds && panel.embeds.length === 1);
    assert.ok(panel.components && panel.components.length <= 5);
    assert.ok(panel.embeds[0].data.title.includes('Ticket System'));
  });
});
