import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildPacilEmbed, pacilFooter, pacilNotice, PACIL_FOOTER, PACIL_COLORS } from '../src/ui/pacil.js';
import { createEmbed } from '../src/utils/embeds.js';

// Kompatibel dengan discord.js asli (huruf kecil) maupun harness tiruan (huruf kapital).
const field = (json, key) => json[key] ?? json[key[0].toUpperCase() + key.slice(1)];

test('footer dan warna dasar berasal dari konfigurasi Pacil', () => {
  assert.equal(PACIL_FOOTER, 'Pacil Baik • Fasilkom UI');
  assert.equal(PACIL_COLORS.navy, 0x0d3a73);
  assert.equal(PACIL_COLORS.gold, 0xf2a900);
  const json = buildPacilEmbed({ title: 'Halo' }).toJSON();
  assert.equal(field(json, 'footer').text, PACIL_FOOTER);
  assert.equal(field(json, 'color'), PACIL_COLORS.navy);
});

test('createEmbed dan pacilNotice memakai footer yang sama', () => {
  assert.equal(field(createEmbed({ title: 'x' }).toJSON(), 'footer').text, PACIL_FOOTER);
  assert.equal(field(pacilNotice({ tone: 'success', title: 'ok' }).toJSON(), 'footer').text, PACIL_FOOTER);
});

test('teks dibersihkan dan dipotong sesuai batas Discord', () => {
  const json = buildPacilEmbed({ title: 'T', description: `a\n\n\n\nb${'x'.repeat(5000)}`, fields: [{ name: 'n', value: 'v'.repeat(2000) }, { name: '', value: 'abaikan' }] }).toJSON();
  const description = field(json, 'description');
  assert.ok(description.length <= 4096);
  assert.ok(!description.includes('\n\n\n'));
  const fields = field(json, 'fields');
  assert.equal(fields.length, 1);
  assert.equal(fields[0].value.length, 1024);
});

test('tidak ada new EmbedBuilder mentah di luar builder pusat', () => {
  const allow = new Set(['src/ui/pacil.js', 'src/commands/Tools/embedbuilder.js']);
  const offenders = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const normalized = path.replaceAll('\\', '/');
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.js') && !allow.has(normalized) && /new EmbedBuilder\(/.test(readFileSync(path, 'utf8'))) offenders.push(normalized);
    }
  })('src');
  assert.deepEqual(offenders, []);
});

function scan(pattern, allow) {
  const hits = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const normalized = path.replaceAll('\\', '/');
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.js') && !allow.has(normalized)) {
        readFileSync(path, 'utf8').split('\n').forEach((line, i) => { if (pattern.test(line)) hits.push(`${normalized}:${i + 1}`); });
      }
    }
  })('src');
  return hits;
}

test('warna selalu dari token pusat, tidak ada hex/angka literal di setColor', () => {
  const allow = new Set(['src/ui/pacil.js', 'src/commands/Tools/embedbuilder.js']);
  assert.deepEqual(scan(/\.setColor\(\s*['"#0-9]/, allow), []);
});

test('footer selalu lewat pacilFooter, tidak ada teks literal', () => {
  const allow = new Set(['src/ui/pacil.js', 'src/commands/Tools/embedbuilder.js', 'src/utils/logging/logEmbeds.js']);
  assert.deepEqual(scan(/\.setFooter\(\{\s*text:\s*['"`]/, allow), []);
});

test('pacilFooter menormalkan awalan merek lama dan menambah petunjuk', () => {
  assert.equal(pacilFooter(), PACIL_FOOTER);
  assert.equal(pacilFooter('Makara Fasilkom UI • Pacil Bot'), PACIL_FOOTER);
  assert.equal(pacilFooter('Makara Fasilkom UI • Pacil Bot • Panduan Interaktif'), `${PACIL_FOOTER} • Panduan Interaktif`);
  assert.equal(pacilFooter('Pacil Baik • #ab12'), `${PACIL_FOOTER} • #ab12`);
  assert.equal(pacilFooter('Halaman 1/3'), `${PACIL_FOOTER} • Halaman 1/3`);
  assert.equal(pacilFooter(PACIL_FOOTER), PACIL_FOOTER);
});

test('footer string dan objek di buildPacilEmbed ikut dinormalkan', () => {
  assert.equal(field(buildPacilEmbed({ title: 'x', footer: 'Makara Fasilkom UI • Booster Perks' }).toJSON(), 'footer').text, `${PACIL_FOOTER} • Booster Perks`);
  assert.equal(field(buildPacilEmbed({ title: 'x', footer: { text: 'Ticket ID: 7' } }).toJSON(), 'footer').text, `${PACIL_FOOTER} • Ticket ID: 7`);
});

test('tone status memberi penanda ikon pada judul (tidak hanya warna)', () => {
  assert.match(String(field(buildPacilEmbed({ title: 'Gagal', tone: 'error' }).toJSON(), 'title')), /^❌ {2}Gagal$/);
  assert.equal(field(buildPacilEmbed({ title: '✅ Siap', tone: 'success' }).toJSON(), 'title'), '✅ Siap');
  assert.equal(field(buildPacilEmbed({ title: 'Info', tone: 'navy' }).toJSON(), 'title'), 'Info');
});
