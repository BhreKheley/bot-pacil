import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchQueries, isEligible, isYoutubeSource, pickRecommendation, pushHistory, youtubeMixUrl,
} from '../src/services/music/autoplayLogic.js';

const t = (title, author = 'A', extra = {}) => ({
  info: { title, author, uri: `u:${title}`, identifier: title, length: 200000, ...extra },
});

test('pushHistory tanpa duplikat dan dibatasi', () => {
  let h = [];
  for (let i = 0; i < 40; i += 1) h = pushHistory(h, t(`s${i}`));
  assert.equal(h.length, 30);
  h = pushHistory(h, t('s39'));
  assert.equal(h.filter((e) => e.key === 'u:s39').length, 1);
});

test('isEligible menolak stream, durasi ekstrem, riwayat, antrean, dan versi noise', () => {
  const seed = t('Seed');
  assert.equal(isEligible(t('x', 'A', { isStream: true }), seed), false);
  assert.equal(isEligible(t('x', 'A', { length: 3600000 }), seed), false);
  assert.equal(isEligible(t('x', 'A', { length: 5000 }), seed), false);
  assert.equal(isEligible(t('Lagu'), seed, pushHistory([], t('Lagu'))), false);
  assert.equal(isEligible(t('LAGU!'), seed, pushHistory([], t('lagu', 'B'))), false);
  assert.equal(isEligible(t('Lagu'), seed, [], [t('Lagu')]), false);
  assert.equal(isEligible(t('Lagu (Live)'), seed), false);
  assert.equal(isEligible(t('Lagu (Live)'), t('Seed Live')), true);
  assert.equal(isEligible(t('Lagu Baru'), seed), true);
});

test('pickRecommendation memprioritaskan artis berbeda dan null bila kosong', () => {
  const seed = t('Seed', 'Same');
  const cands = [t('a', 'Same'), t('b', 'Other'), t('c', 'Same')];
  assert.equal(pickRecommendation(cands, seed, [], [], () => 0).info.title, 'b');
  assert.equal(pickRecommendation([], seed), null);
  assert.equal(pickRecommendation([t('Seed', 'Same')], seed, pushHistory([], seed)), null);
});

test('buildSearchQueries dan helper youtube', () => {
  assert.deepEqual(buildSearchQueries(t('Judul', 'Artis - Topic')), ['Artis songs', 'songs like Judul Artis']);
  assert.deepEqual(buildSearchQueries({ info: {} }), []);
  assert.equal(isYoutubeSource({ info: { sourceName: 'youtube', identifier: 'abc' } }), true);
  assert.equal(isYoutubeSource({ info: { sourceName: 'spotify', identifier: 'abc' } }), false);
  assert.equal(youtubeMixUrl('abc'), 'https://www.youtube.com/watch?v=abc&list=RDabc');
});
