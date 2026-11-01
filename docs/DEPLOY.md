# Menjalankan Pacil Bot (database + 24/7)

Bot ini butuh dua hal agar tidak error: **database PostgreSQL** dan **tempat yang menyala terus**.
Tabel database dibuat otomatis oleh bot saat pertama jalan (`AUTO_MIGRATE=true`), jadi cukup siapkan Postgres yang kosong.

## 1. Database (gratis, tanpa install)

Pakai Postgres online, misalnya [Neon](https://neon.tech) atau [Supabase](https://supabase.com) (cek paket gratis terbarunya di situs masing-masing).

1. Daftar, buat project baru, lalu salin **connection string** (bentuknya `postgresql://user:pass@host/dbname?sslmode=require`).
2. Di file `.env`, isi satu baris ini dan kosongkan/hapus `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`:

   ```env
   POSTGRES_URL=postgresql://user:pass@host/dbname?sslmode=require
   ```
3. Jalankan `npm start`. Di log harus muncul koneksi sukses dan **tidak ada** tulisan `DATABASE DEGRADED MODE`.

Catatan: pakai connection string versi *direct* bila ada pilihan "pooled" dan "direct". Jangan pernah menaruh `.env` di GitHub.

## 2. Menyala 24/7

Komputer pribadi yang mati/sleep berarti bot ikut mati. Pilihan, dari yang paling stabil:

### A. VPS (disarankan)
Bisa VPS murah atau Oracle Cloud "Always Free" (ketersediaannya berubah-ubah, cek langsung). Pakai Ubuntu, lalu:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
git clone https://github.com/BhreKheley/bot-pacil.git && cd bot-pacil
git checkout pacil-overhaul
cp .env.example .env && nano .env      # isi DISCORD_TOKEN, CLIENT_ID, GUILD_ID
docker compose up -d --build           # bot + Postgres sendiri, otomatis restart
docker compose logs -f bot             # lihat log
```

`docker compose` sudah menyertakan Postgres, jadi di VPS kamu **tidak perlu** Neon. Update bot: `git pull && docker compose up -d --build`.

Catatan data lama: nama database default tetap `titanbot` supaya data produksi lama tidak hilang. Instalasi baru boleh memakai `POSTGRES_DB=pacilbot` di `.env`.

### B. Tanpa Docker (VPS atau PC yang selalu hidup)
Pakai Node 20+ dan pm2:

```bash
npm ci --omit=dev
npm i -g pm2
pm2 start src/app.js --name pacil-bot
pm2 save && pm2 startup     # ikuti perintah yang ditampilkan agar jalan lagi setelah reboot
```

Database di mode ini pakai Postgres online (bagian 1).

### C. Hosting bot gratis
Banyak platform gratis yang menidurkan aplikasi atau menghapus paket gratisnya (seperti trial Railway kamu). Kalau mau coba, pastikan paketnya tidak tidur dan mendukung proses Node yang jalan terus, lalu isi variabel `.env` di dasbornya (jangan upload file `.env`).

## 3. Cek kesehatan
Bot membuka `http://HOST:3000/health` dan `/ready`; bisa dipasang di UptimeRobot atau dipakai healthcheck platform.

## Batas 100 command
Discord membatasi 100 slash command global. Command yang tidak dipakai bisa dimatikan dengan `register: false` di file command-nya (contoh: `src/commands/Economy/slut.js`).
