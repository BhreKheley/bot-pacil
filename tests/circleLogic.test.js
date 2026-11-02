import test from 'node:test';
import assert from 'node:assert/strict';
import { checkServerLimits } from '../src/services/circleService.js';
import { ChannelType } from 'discord.js';

test('checkServerLimits mengizinkan jika di bawah batas', () => {
  const mockGuild = {
    channels: {
      cache: new Map([
        ['1', { type: ChannelType.GuildCategory }],
        ['2', { type: ChannelType.GuildText }],
      ]),
    },
    roles: {
      cache: new Map([
        ['1', { name: '@everyone' }],
      ]),
    },
  };

  const result = checkServerLimits(mockGuild);
  assert.equal(result.ok, true);
});

test('checkServerLimits menolak jika kategori mendekati batas 50', () => {
  const categories = new Map();
  for (let i = 0; i < 46; i++) {
    categories.set(String(i), { type: ChannelType.GuildCategory });
  }

  const mockGuild = {
    channels: { cache: categories },
    roles: { cache: new Map() },
  };

  const result = checkServerLimits(mockGuild);
  assert.equal(result.ok, false);
  assert.match(result.reason, /kategori/i);
});

