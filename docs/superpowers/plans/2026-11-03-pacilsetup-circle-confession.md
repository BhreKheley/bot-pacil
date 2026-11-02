# /pacilsetup, Circle, dan Confession Terstruktur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti `/config` menjadi `/pacilsetup`, ubah confession menjadi Dari/Untuk/Pesan, dan tambah sistem Circle (role + kategori privat, disetujui pengurus) tanpa menambah slash command.

**Architecture:** Logika murni di `*Logic.js` (diuji unit), operasi Discord + penyimpanan di `*Service.js`, tampilan di `ui/`, handler tipis di `src/interactions/**`. Data Circle disimpan di guild config (`circles`) dengan mutex `guildcfg:${guildId}`; tanpa tabel/versi skema baru.

**Tech Stack:** Node ≥20 ESM, discord.js v14, `node --test` (`npm test`), harness tiruan di scratchpad untuk alur (npm registry tidak terjangkau).

**Spec:** `docs/superpowers/specs/2026-11-03-pacilsetup-circle-confession-design.md`

## Global Constraints

- Slash command global tetap **100**; tidak boleh ada command baru (cek: `grep -L "register: false" src/commands/*/*.js | wc -l` = 100).
- `customId` komponen global berbentuk `modul:aksi:arg`; handler terdaftar per `name` (`circle`, `pacilcfg`, `confession_modal`).
- Semua teks pengguna berbahasa Indonesia; tampilan lewat `pacilPanel`/`pacilNotice`/`pacilButtons` (`src/ui/pacil.js`).
- `Mutex.runExclusive` tidak reentrant: jangan bersarang dengan kunci sama.
- Circle: default 40 aktif per server (hard cap 45), 1 per pemilik (dapat 1–3), nama 3–32 karakter, masa berlaku 30 hari, pengingat hari ke-25, masa tenggang 7 hari, interval pemeriksaan 1 jam.
- Confession: Dari maks 40, Untuk maks 60, Pesan maks 1800 karakter; Dari/Untuk opsional (kosong → "Anonim" / "Semua").
- Setiap task ditutup commit dengan trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` dan `Claude-Session: https://claude.ai/code/session_017i1nyEqsbUbhmZPtEJN4nv`.

## Review Focus

- Nama Circle berisi `@everyone`, `<@id>`, tautan undangan, atau hanya spasi → ditolak, tidak pernah dikirim sebagai mention (Task 3, 5).
- Role bot berada di bawah role Circle / izin Manage Roles-Channels kurang → permintaan tidak diproses, pesan menjelaskan, tidak ada resource setengah jadi (Task 4, 7).
- Pembuatan gagal di tengah (role jadi, kategori gagal) → semua resource yang terbuat dihapus dan permintaan ditandai gagal (Task 4).
- Dua permintaan nama sama (beda huruf besar/kecil) atau klik Setujui dua kali bersamaan → hanya satu Circle terbentuk (Task 4, 5).
- Pengurus menghapus role/kategori manual, atau pemilik keluar server → pemeriksaan berkala menandai `deleted` / mengalihkan pemilik tanpa crash (Task 6).

---

### Task 1: Ganti nama `/config` → `/pacilsetup`

**Files:**
- Modify: `src/commands/Core/config.js` (`.setName('pacilsetup')`), `src/config/commands/prefixRestrictions.js:22`, `src/config/commands/commandCategories.js:28`, `src/ui/configHub.js:1,143`, `src/services/configHubService.js:3,232`, `src/commands/Core/help.js:108`, `README.md`, `docs/`.
- Test: `tests/commandCategories.test.js` (new)

**Interfaces:** Produces: nama command `pacilsetup`; `PROTECTED_COMMANDS` berisi `pacilsetup`, `config`, `commands`, `configwizard`.

- [ ] **Step 1:** Tes `PROTECTED_COMMANDS.has('pacilsetup')` dan `.has('configwizard')` true.
- [ ] **Step 2:** Jalankan `node --test tests/commandCategories.test.js`; Expected: FAIL pada `pacilsetup`.
- [ ] **Step 3:** Ganti nama command dan semua referensi teks; `config` tetap di `PROTECTED_COMMANDS` agar kebijakan lama aman.
- [ ] **Step 4:** `npm test` → semua PASS; `grep -rn "/config\b" src README.md docs` tidak menyisakan rujukan ke command lama selain catatan sejarah.
- [ ] **Step 5:** Commit `feat: rename /config to /pacilsetup`.

### Task 2: Confession terstruktur (Dari / Untuk / Pesan)

**Files:**
- Modify: `src/services/confessionLogic.js`, `src/services/confessionService.js` (`publicConfessionEmbed`, `reviewConfessionEmbed`), `src/commands/Community/confession.js:65` (modal), `src/interactions/modals/confessions/confession.js`, `src/utils/i18n.js`
- Test: `tests/confessionLogic.test.js`

**Interfaces:**
- Produces: `sanitizeLabel(raw: unknown, max: number, fallback: string): string`; `isImpersonation(label: string, knownNames: string[]): boolean`; record confession mendapat `from: string`, `to: string`.
- Consumes: `shortId`, `pacilPanel`.

- [ ] **Step 1:** Tes di `confessionLogic.test.js`: `sanitizeLabel('  <@123> @everyone hai  ', 40, 'Anonim')` mengembalikan `'hai'`; `sanitizeLabel('', 40, 'Anonim') === 'Anonim'`; `sanitizeLabel('https://discord.gg/x', 40, 'Semua') === 'Semua'`; panjang dipotong ke `max`; `isImpersonation('bUdI  ', ['Budi']) === true`; `isImpersonation('Budi2', ['Budi']) === false`.
- [ ] **Step 2:** `node --test tests/confessionLogic.test.js` → FAIL (fungsi belum ada).
- [ ] **Step 3:** Implementasikan kedua fungsi: hapus pola mention/@everyone/@here/tautan/undangan/karakter kontrol, rapikan spasi, potong, fallback bila kosong; bandingkan nama dengan `normalize` (trim, huruf kecil, spasi tunggal).
- [ ] **Step 4:** Modal: tiga `TextInput` (`from` pendek opsional, `to` pendek opsional, `content` paragraf wajib). Handler modal menyaring, menolak bila `isImpersonation(from, nama anggota di cache guild)` dengan balasan ephemeral meminta mengganti, lalu menyimpan `from`/`to` pada record. Embed publik/review menampilkan Dari/Untuk sebagai field; review tetap memuat pengirim asli.
- [ ] **Step 5:** `npm test` PASS; harness: kirim modal dengan Dari berisi nama anggota → ditolak; Dari kosong → "Anonim". Commit.

### Task 3: `circleLogic.js` (murni)

**Files:**
- Create: `src/services/circleLogic.js`
- Test: `tests/circleLogic.test.js`

**Interfaces:** Produces:
- `CIRCLE_LIMITS` (frozen): `{ nameMin:3, nameMax:32, maxActive:40, hardCap:45, perOwner:1, validityDays:30, remindAfterDays:25, graceDays:7, maintenanceIntervalMs:3600000 }`
- `normalizeCircleName(raw): string` (hapus mention/tautan/karakter kontrol, rapikan spasi)
- `validateCircleName(raw, activeNames: string[]): { ok: true, name } | { ok: false, reason: 'short'|'long'|'taken'|'invalid' }`
- `canRequest(circles: Record<string, Circle>, ownerId, settings): { ok: true } | { ok: false, reason: 'server_full'|'owner_limit'|'pending' }`
- `computeExpiry(now: number, days?: number): number`; `phaseOf(circle, now): 'active'|'remind'|'expired'|'purge'`
- `clampSettings(partial): CircleSettings` (batas 1–45, perOwner 1–3)

- [ ] **Step 1:** Tes: nama `'@everyone'`→`invalid`; `'ab'`→`short`; 33 karakter→`long`; `'Kelompok A'` vs aktif `['kelompok a']`→`taken`; `canRequest` penuh pada `maxActive`; `phaseOf` pada hari 24/25/30/37 menghasilkan `active/remind/expired/purge`; `clampSettings({maxActive:99}).maxActive === 45`.
- [ ] **Step 2:** `node --test tests/circleLogic.test.js` → FAIL.
- [ ] **Step 3:** Implementasikan sesuai antarmuka; hanya fungsi murni, tanpa import Discord.
- [ ] **Step 4:** `node --test tests/circleLogic.test.js` → PASS. Commit.

### Task 4: `circleService.js` (Discord + penyimpanan)

**Files:**
- Create: `src/services/circleService.js`
- Modify: `src/config/guild/guildConfigDefaults.js` (tambah `circles: {}`, `circleSettings: {...}`)
- Test: harness `scratchpad/harness/circle.test.mjs` (di luar repo)

**Interfaces:**
- Consumes: `CIRCLE_LIMITS`, `validateCircleName`, `canRequest`, `phaseOf`, `computeExpiry` (Task 3); `getGuildConfig`/`updateGuildConfig`; `Mutex`.
- Produces (semua `async`, `client, guild` di depan): `submitRequest({ownerId, name, purpose}): Circle` (status `pending`); `approve(circleId, reviewerId): Circle`; `reject(circleId, reviewerId, reason?)`; `addMember(circleId, actorId, userId)`; `removeMember(...)`; `renameCircle(...)`; `transferOwner(circleId, actorId, newOwnerId)`; `extend(circleId, actorId)`; `archive(circleId)`; `restore(circleId, actorId)`; `purge(circleId)`; `checkBotPermissions(guild): { ok: boolean, missing: string[] }`. Kunci antrean per server `circle:${guildId}`; penyimpanan memakai `guildcfg:${guildId}` — jangan bersarang.

- [ ] **Step 1:** Tes harness: `approve` membuat role, kategori (overwrite: `@everyone` tolak ViewChannel, role Circle & bot izinkan), 1 text + 1 voice, memberi role ke pemilik, status `active`, `expiresAt = computeExpiry`.
- [ ] **Step 2:** Tes: gagal pada pembuatan kategori → role yang sudah dibuat dihapus, status `failed`, tidak ada channel tersisa (rollback).
- [ ] **Step 3:** Tes: `approve` dua kali serentak pada permintaan sama → satu Circle; dua permintaan nama sama berbeda huruf → yang kedua `taken`; `checkBotPermissions` dengan role bot di bawah role Circle / izin kurang → `ok:false` dengan nama izin, `approve` melempar sebelum membuat apa pun.
- [ ] **Step 4:** Jalankan harness → FAIL; implementasikan service (antrean serial per guild; setiap perubahan penyimpanan lewat `updateCircles(client, guildId, mutate)` dengan mutex `guildcfg`); jalankan → PASS.
- [ ] **Step 5:** `npm test` + smoke import PASS. Commit.

### Task 5: UI & interaksi Circle

**Files:**
- Create: `src/ui/circleViews.js`, `src/interactions/buttons/circle/circle.js`, `src/interactions/modals/circle/circle.js`, `src/interactions/selectMenus/circle/circle.js`
- Test: harness `scratchpad/harness/circleui.test.mjs`

**Interfaces:**
- Consumes: Task 4 service.
- Produces: `circleRequestPanel(settings)`, `circleReviewCard(circle)`, `circleOwnerPanel(circle)` (payload `{embeds, components}`); `customId`: `circle:request`, `circle:modal:request`, `circle:approve:<id>`, `circle:reject:<id>`, `circle:add:<id>` (user select), `circle:remove:<id>`, `circle:rename:<id>` (+modal), `circle:transfer:<id>`, `circle:extend:<id>`, `circle:disband:<id>` dan `circle:confirm:<id>`.

- [ ] **Step 1:** Tes harness: tombol Setujui oleh non-pengurus → ditolak ephemeral; oleh pengurus → memanggil `approve` dan mengedit kartu review; tombol panel pemilik oleh non-pemilik → ditolak; "Bubarkan" membutuhkan konfirmasi kedua.
- [ ] **Step 2:** Harness FAIL → implementasi tampilan dan handler tipis (semua keputusan di service) → PASS.
- [ ] **Step 3:** Hitung command tetap 100; smoke import; commit.

### Task 6: Pemeliharaan berkala Circle

**Files:**
- Create: `src/services/circleMaintenanceService.js`
- Modify: `src/events/ready.js` (panggil `startCircleMaintenance(client)`)
- Test: harness `scratchpad/harness/circlemaint.test.mjs`

**Interfaces:** Produces: `runCircleMaintenance(client, now = Date.now()): Promise<{reminded:number, archived:number, purged:number, markedDeleted:number}>`; `startCircleMaintenance(client): void` (jalan sekali saat mulai, lalu tiap `maintenanceIntervalMs`).

- [ ] **Step 1:** Tes harness dengan jam palsu: hari 25 → pengingat terkirim sekali (tidak berulang); hari 30 → `archive`; hari 37 → `purge`; role/kategori dihapus manual → `markedDeleted`; pemilik keluar server → pemilik dialihkan ke anggota berrole Circle, bila tidak ada → arsip; satu Circle error tidak menghentikan yang lain.
- [ ] **Step 2:** FAIL → implementasikan (iterasi per guild, try/catch per Circle, log ringkasan) → PASS.
- [ ] **Step 3:** Commit.

### Task 7: View Circle & Confession di `/pacilsetup`

**Files:**
- Modify: `src/ui/configHub.js` (`HOME_SECTIONS` tambah `circle`; `circleView({settings, counts, botCheck, notice})`; tambahkan opsi dukungan di `menfessView`), `src/services/configHubService.js` (`renderConfigView` cabang `circle`; aksi: toggle, set channel permintaan/review (channel select), batas via modal, kirim panel Circle, toggle tombol dukungan)
- Test: `tests/configHubCircle.test.js` + harness hub yang ada

**Interfaces:** Consumes: `clampSettings`, `checkBotPermissions`, `circleRequestPanel`. Produces: view `circle` dapat dibuka dari menu utama.

- [ ] **Step 1:** Tes: `circleView` memuat peringatan izin saat `botCheck.ok=false`; pengaturan di luar batas diklamp (`maxActive` 99 → 45); menu utama berisi opsi `circle`.
- [ ] **Step 2:** FAIL → implementasi → PASS (`npm test` dan harness hub 8 tes lama tetap PASS).
- [ ] **Step 3:** Commit.

### Task 8: Tombol dukungan confession (opsional, default mati)

**Files:**
- Modify: `src/services/confessionLogic.js`, `src/services/confessionService.js` (`supportButtonRow`), `src/interactions/buttons/confessions/confession.js`, konfigurasi `supportEnabled` di `getConfessionConfig`
- Test: `tests/confessionLogic.test.js`

**Interfaces:** Produces: `toggleSupport(record, kind: 'hug'|'cheer', userHash: string): { record, added: boolean }` (satu klik per orang per tombol; klik lagi membatalkan); `customId` `confessSupport:<kind>:<id>`.

- [ ] **Step 1:** Tes: klik pertama menambah, klik kedua membatalkan, dua pengguna berbeda menghitung 2, `kind` tak dikenal → ditolak.
- [ ] **Step 2:** FAIL → implementasi (hash anonim memakai `participantHash`) → PASS; tombol hanya muncul bila `supportEnabled`.
- [ ] **Step 3:** Commit.

### Task 9: Verifikasi akhir dan dokumentasi

**Files:** Modify: `README.md`, `docs/DEPLOY.md` (izin bot untuk Circle: Manage Roles + Manage Channels, role bot di atas role Circle).

- [ ] **Step 1:** `npm test` semua PASS; smoke import 0 gagal; harness hub/jtc/circle PASS; hitung command = 100.
- [ ] **Step 2:** Push `pacil-overhaul`; verifikasi `git ls-remote` sama dengan HEAD.
- [ ] **Step 3:** Rangkum uji manual untuk pengguna: `/pacilsetup` → Circle, minta Circle, setujui, tambah anggota, perpanjang, bubarkan; confession dengan Dari/Untuk.
