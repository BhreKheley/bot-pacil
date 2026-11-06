import { Router } from 'express';
import {
  generateVerificationState,
  verifyVerificationState,
  validateCasTicket,
  assignStudentRoles,
  VERIFIED_NPM_REGISTRY,
} from '../services/ssoUiService.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { logger } from '../utils/logger.js';
import { buildPacilEmbed } from '../ui/pacil.js';

export function createSsoRouter(client) {
  const router = Router();

  /**
   * Helper to resolve the public base URL of the bot's web server.
   */
  function getBaseUrl(req) {
    const host = req.get('host');
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${proto}://${host}`;
  }

  /**
   * 1. GET /auth/sso/login?guildId=...&userId=...
   * Redirects user to official UI SSO login page.
   */
  router.get('/login', async (req, res) => {
    const { guildId, userId } = req.query;

    if (!guildId || !userId) {
      return res.status(400).send(renderHtmlNotice({
        status: 'error',
        title: 'Parameter Tidak Lengkap',
        message: 'Parameter guildId atau userId tidak ditemukan. Silakan ulangi proses verifikasi dari Discord.',
      }));
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).send(renderHtmlNotice({
        status: 'error',
        title: 'Server Tidak Ditemukan',
        message: 'Bot tidak dapat menemukan server Discord tersebut.',
      }));
    }

    const state = generateVerificationState(guildId, userId);
    const callbackUrl = `${getBaseUrl(req)}/auth/sso/callback?state=${encodeURIComponent(state)}`;
    const casLoginUrl = `https://sso.ui.ac.id/cas2/login?service=${encodeURIComponent(callbackUrl)}`;

    return res.redirect(casLoginUrl);
  });

  /**
   * 2. GET /auth/sso/callback?ticket=...&state=...
   * Handles CAS authentication return and validates ticket.
   */
  router.get('/callback', async (req, res) => {
    const { ticket, state } = req.query;

    if (!ticket || !state) {
      return res.status(400).send(renderHtmlNotice({
        status: 'error',
        title: 'Autentikasi Gagal',
        message: 'Tiket CAS atau token state tidak diterima dari server SSO UI.',
      }));
    }

    const session = verifyVerificationState(state);
    if (!session) {
      return res.status(401).send(renderHtmlNotice({
        status: 'error',
        title: 'Sesi Kedaluwarsa',
        message: 'Tautan verifikasi telah kedaluwarsa atau tidak valid. Silakan lakukan klik verifikasi ulang di Discord.',
      }));
    }

    const { guildId, userId } = session;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).send(renderHtmlNotice({
        status: 'error',
        title: 'Server Discord Tidak Ditemukan',
        message: 'Server Discord tempat kamu melakukan verifikasi tidak aktif di bot ini.',
      }));
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch {
      return res.status(404).send(renderHtmlNotice({
        status: 'error',
        title: 'Member Tidak Ditemukan',
        message: 'Akun Discord kamu tidak ditemukan di server ini. Pastikan kamu sudah bergabung di server.',
      }));
    }

    // Reconstruct exact service URL passed during login
    const serviceUrl = `${getBaseUrl(req)}/auth/sso/callback?state=${encodeURIComponent(state)}`;
    const validationResult = await validateCasTicket(serviceUrl, ticket);

    if (!validationResult.success || !validationResult.user) {
      return res.status(400).send(renderHtmlNotice({
        status: 'error',
        title: 'Validasi SSO Gagal',
        message: validationResult.error || 'Server SSO UI menolak validasi tiket Anda.',
      }));
    }

    const student = validationResult.user;

    // Check anti-alt: Has this NPM already been linked to a different Discord ID?
    const existingRegistration = VERIFIED_NPM_REGISTRY.get(student.npm);
    if (existingRegistration && existingRegistration.userId !== userId && existingRegistration.guildId === guildId) {
      return res.status(403).send(renderHtmlNotice({
        status: 'warning',
        title: 'NPM Sudah Terdaftar',
        message: `NPM ${student.npm} sudah digunakan oleh akun Discord lain di server ini. Jika ini keliru, silakan hubungi tim Administrator atau BPH.`,
      }));
    }

    // Fetch guild config for custom role names / IDs
    const guildConfig = await getGuildConfig(client, guildId);
    const verifConfig = guildConfig.verification || {};

    // Assign roles & nickname
    const assignment = await assignStudentRoles(guild, member, student, verifConfig);

    // Send direct notification embed to the verified student
    try {
      const dmEmbed = buildPacilEmbed({
        title: 'Verifikasi Mahasiswa Berhasil',
        icon: '🎓',
        description: `Halo **${student.nama}**! Akun Discord kamu telah berhasil diverifikasi sebagai mahasiswa resmi **${student.fakultas}** di server **${guild.name}**.\n\n` +
          `• **NPM:** \`${student.npm}\`\n` +
          `• **Program Studi:** ${student.prodi}\n` +
          `• **Angkatan:** ${student.angkatan || '-'}\n` +
          `• **Role Diberikan:** ${assignment.rolesAdded.join(', ') || 'Warga Pacil'}\n\n` +
          `Selamat bergabung dan nikmati fasilitas komunitas digital Fasilkom UI!`,
        tone: 'gold',
      });
      await member.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch {
      // Ignored if user has DMs closed
    }

    return res.status(200).send(renderHtmlNotice({
      status: 'success',
      title: 'Verifikasi Berhasil!',
      student,
      roles: assignment.rolesAdded,
      nickname: assignment.nicknameUpdated ? student.formattedNickname : null,
      serverName: guild.name,
    }));
  });

  return router;
}

/**
 * Renders a clean, modern minimalist Fasilkom UI HTML response page.
 */
function renderHtmlNotice({ status, title, message, student, roles = [], nickname, serverName }) {
  const isSuccess = status === 'success';
  const badgeColor = isSuccess ? '#f2a900' : '#ef4444';
  const accentColor = '#0d3a73';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Pacil Bot Fasilkom UI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #08172c;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #0d213d;
      border: 1px solid rgba(242, 169, 0, 0.25);
      border-radius: 16px;
      max-width: 520px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
      text-align: center;
      position: relative;
    }
    .badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: rgba(242, 169, 0, 0.15);
      color: #ffd166;
      border: 1px solid rgba(242, 169, 0, 0.35);
      margin-bottom: 20px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .meta-box {
      background: #08172c;
      border: 1px solid #1e3a63;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 14px;
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-val { color: #f8fafc; font-weight: 700; }
    .footer-note {
      font-size: 12px;
      color: #64748b;
      margin-top: 18px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 12px 20px;
      background: ${isSuccess ? '#f2a900' : '#334155'};
      color: ${isSuccess ? '#08172c' : '#ffffff'};
      font-weight: 700;
      border-radius: 8px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? 'SSO UI Terverifikasi' : 'Status Verifikasi'}</div>
    <h1>${title}</h1>
    <p>${message || `Autentikasi akun mahasiswa Fasilkom UI di server Discord <strong>${serverName || 'pacil baik'}</strong> telah selesai.`}</p>

    ${student ? `
    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Nama Lengkap</span>
        <span class="meta-val">${student.nama}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">NPM</span>
        <span class="meta-val">${student.npm}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Program Studi</span>
        <span class="meta-val">${student.prodi}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Angkatan</span>
        <span class="meta-val">${student.angkatan || '-'}</span>
      </div>
      ${roles.length ? `
      <div class="meta-row">
        <span class="meta-label">Role Discord</span>
        <span class="meta-val" style="color: #ffd166;">${roles.join(', ')}</span>
      </div>` : ''}
    </div>
    ` : ''}

    <a href="https://discord.com/app" class="btn">Kembali ke Discord</a>
    <div class="footer-note">Pacil Baik • Fakultas Ilmu Komputer Universitas Indonesia</div>
  </div>
</body>
</html>`;
}

