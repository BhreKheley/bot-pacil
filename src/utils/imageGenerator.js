import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import { logger } from './logger.js';

// Makara Fasilkom UI Theme Colors
const COLORS = {
  navyDark: '#08172c',
  navyMid: '#0d2a4f',
  navyLight: '#163b6d',
  gold: '#f2a900',
  goldLight: '#ffd166',
  goldGlow: 'rgba(242, 169, 0, 0.45)',
  textPrimary: '#ffffff',
  textSecondary: '#a0b3cf',
  textMuted: '#6b84a6',
  cardBg: 'rgba(10, 26, 49, 0.75)',
  cardBorder: '#20406b',
  innerBoxBg: 'rgba(8, 20, 38, 0.85)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0284C7',
  rose: '#f472b6',
};

/**
 * Safely fetches an image buffer or returns null.
 */
async function fetchImageSafe(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
      headers: { 'User-Agent': 'PacilBot/2.2 (Fasilkom UI Discord Bot)' },
    });
    return Buffer.from(res.data);
  } catch (err) {
    logger.warn('Gagal mengunduh avatar untuk canvas:', err.message);
    return null;
  }
}

/**
 * Draws a rounded rectangle.
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Draws subtle grid lines across background.
 */
function drawTechGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;

  const step = 28;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws Makara gold corner bracket accents.
 */
function drawCornerAccents(ctx, width, height, inset = 35, length = 13) {
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(inset, inset + length);
  ctx.lineTo(inset, inset);
  ctx.lineTo(inset + length, inset);
  ctx.stroke();
  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(width - inset - length, height - inset);
  ctx.lineTo(width - inset, height - inset);
  ctx.lineTo(width - inset, height - inset - length);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws wrapped multi-line text with truncation ellipsis.
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  if (!text) return;
  const words = String(text).split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y + lineCount * lineHeight);
      line = words[n] + ' ';
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        let remaining = words.slice(n).join(' ');
        // Pre-clamp to avoid quadratic character-by-character trimming
        const estCharCount = Math.max(10, Math.ceil(maxWidth / 5));
        if (remaining.length > estCharCount * 2) {
          remaining = remaining.slice(0, estCharCount * 2);
        }
        while (ctx.measureText(remaining + '…').width > maxWidth && remaining.length > 0) {
          remaining = remaining.slice(0, -1);
        }
        ctx.fillText(remaining.trim() + '…', x, y + lineCount * lineHeight);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y + lineCount * lineHeight);
}

/**
 * In-memory cache for static and semi-static visual guide card buffers.
 */
export const TEMPLATE_CACHE = new Map();
const IN_FLIGHT_PROMISES = new Map();

/**
 * Gets a cached guide card buffer or executes renderFn and caches the result.
 * Coalesces in-flight requests to eliminate cache stampedes.
 * @param {string} templateKey
 * @param {Function} renderFn
 * @param {...any} args
 * @returns {Promise<Buffer>}
 */
export async function getCachedGuideCard(templateKey, renderFn, ...args) {
  if (TEMPLATE_CACHE.has(templateKey)) {
    return TEMPLATE_CACHE.get(templateKey);
  }
  if (IN_FLIGHT_PROMISES.has(templateKey)) {
    return IN_FLIGHT_PROMISES.get(templateKey);
  }

  const promise = (async () => {
    try {
      const buffer = await renderFn(...args);
      if (buffer) {
        TEMPLATE_CACHE.set(templateKey, buffer);
      }
      return buffer;
    } finally {
      IN_FLIGHT_PROMISES.delete(templateKey);
    }
  })();

  IN_FLIGHT_PROMISES.set(templateKey, promise);
  return promise;
}

/**
 * Clears the guide card cache completely or for a specific key.
 * @param {string|null} templateKey
 */
export function clearGuideCardCache(templateKey = null) {
  if (templateKey) {
    TEMPLATE_CACHE.delete(templateKey);
    IN_FLIGHT_PROMISES.delete(templateKey);
  } else {
    TEMPLATE_CACHE.clear();
    IN_FLIGHT_PROMISES.clear();
  }
}

/**
 * Renders modern dynamic Welcome Card image for #arrival (Screenshot 1).
 */
export async function renderWelcomeCard({
  member,
  guild,
  inviterTag = 'Direct / Discovery',
  memberCount = 1,
}) {
  const width = 800;
  const height = 340;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Background Gradient (Makara Navy)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0a2140');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Tech Grid Lines
  drawTechGrid(ctx, width, height);

  // 3. Subtle Glowing Ambient Lights
  const glowGrad = ctx.createRadialGradient(160, 170, 20, 160, 170, 240);
  glowGrad.addColorStop(0, 'rgba(13, 58, 115, 0.4)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Top-right Gold Glow
  const goldAura = ctx.createRadialGradient(720, 40, 10, 720, 40, 180);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.12)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // 4. Main Outer Card Frame with subtle border
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 5. Corner Accents (Modern Minimalist brackets)
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(35, 48);
  ctx.lineTo(35, 35);
  ctx.lineTo(48, 35);
  ctx.stroke();
  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(width - 48, height - 35);
  ctx.lineTo(width - 35, height - 35);
  ctx.lineTo(width - 35, height - 48);
  ctx.stroke();
  ctx.restore();

  // 6. Top Right Pill: "MEMBER KE- #..."
  const pillText = `MEMBER KE- #${memberCount}`;
  ctx.font = 'bold 12px sans-serif';
  const pillWidth = Math.max(120, ctx.measureText(pillText).width + 24);
  const pillHeight = 28;
  const pillX = width - 45 - pillWidth;
  const pillY = 38;

  ctx.save();
  roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 14);
  ctx.fillStyle = 'rgba(20, 43, 77, 0.85)';
  ctx.fill();
  ctx.strokeStyle = '#2d5488';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillWidth / 2, pillY + pillHeight / 2);
  ctx.restore();

  // 7. Avatar (Circle with Dual Ring & Gold Glow)
  const avatarX = 135;
  const avatarY = 170;
  const avatarRadius = 66;

  // Outer Gold Ring & Glow
  ctx.save();
  ctx.shadowColor = COLORS.goldGlow;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Inner subtle cyan ring
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw Avatar Image or Fallback
  const avatarUrl = member?.user?.displayAvatarURL?.({ extension: 'png', size: 256 })
    || member?.displayAvatarURL?.({ extension: 'png', size: 256 });
  const avatarBuffer = await fetchImageSafe(avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch {
      drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, member?.user?.username || 'U');
    }
  } else {
    drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, member?.user?.username || 'U');
  }
  ctx.restore();

  // 8. Text Information on Right Side
  const textLeft = 230;

  // Badge: "ANGGOTA BARU"
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ANGGOTA BARU', textLeft, 105);
  ctx.restore();

  // Big Username
  const rawName = member?.user?.globalName || member?.user?.username || member?.displayName || 'Mahasiswa Baru';
  const displayName = rawName.length > 20 ? rawName.slice(0, 19) + '…' : rawName;
  ctx.save();
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(displayName, textLeft, 145);
  ctx.restore();

  // Server Subtext
  const serverName = guild?.name || 'FASILKOM UI';
  const cleanServer = serverName.length > 32 ? serverName.slice(0, 31) + '…' : serverName;
  ctx.save();
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Telah bergabung ke ${cleanServer}`, textLeft, 175);
  ctx.restore();

  // 9. Bottom Meta Cards (DIUNDANG OLEH & TOTAL MEMBER)
  const boxY = 210;
  const boxHeight = 64;

  // Box 1: Invited by
  const box1Width = 270;
  ctx.save();
  roundRect(ctx, textLeft, boxY, box1Width, boxHeight, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DIUNDANG OLEH', textLeft + 16, boxY + 24);

  const cleanInviter = inviterTag.length > 24 ? inviterTag.slice(0, 23) + '…' : inviterTag;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(cleanInviter, textLeft + 16, boxY + 48);
  ctx.restore();

  // Box 2: Total Member
  const box2X = textLeft + box1Width + 16;
  const box2Width = 180;
  ctx.save();
  roundRect(ctx, box2X, boxY, box2Width, boxHeight, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('TOTAL MEMBER', box2X + 16, boxY + 24);

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(String(memberCount), box2X + 16, boxY + 49);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Fallback avatar drawer if image fails to download or user has no avatar.
 */
export function drawAvatarFallback(ctx, x, y, radius, name = 'U') {
  const safeName = typeof name === 'string' && name.length > 0 ? name : 'U';
  const grad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  grad.addColorStop(0, '#0d3a73');
  grad.addColorStop(1, '#f2a900');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(radius)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(safeName.charAt(0).toUpperCase(), x, y);
}

/**
 * Renders modern dynamic Server Boost Card image for #boost-hall.
 */
export async function renderBoostCard({
  member,
  guild,
  totalBoosts = 1,
  boostTier = 1,
}) {
  const width = 800;
  const height = 340;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#100726');
  bgGrad.addColorStop(0.5, '#0b1633');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  // Celebratory golden aura
  const goldAura = ctx.createRadialGradient(400, 170, 20, 400, 170, 320);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.22)');
  goldAura.addColorStop(0.7, 'rgba(244, 114, 182, 0.08)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = '#3b2469';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Top Right Badge: SERVER BOOSTER
  const pillText = `💎 SERVER BOOSTER TIER ${boostTier}`;
  ctx.font = 'bold 12px sans-serif';
  const pillWidth = Math.max(160, ctx.measureText(pillText).width + 24);
  const pillHeight = 28;
  const pillX = width - 45 - pillWidth;
  const pillY = 38;

  ctx.save();
  roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 14);
  ctx.fillStyle = 'rgba(242, 169, 0, 0.18)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillWidth / 2, pillY + pillHeight / 2);
  ctx.restore();

  // Avatar with Glowing Halo
  const avatarX = 135;
  const avatarY = 170;
  const avatarRadius = 66;

  ctx.save();
  ctx.shadowColor = '#f472b6';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const avatarUrl = member?.user?.displayAvatarURL?.({ extension: 'png', size: 256 })
    || member?.displayAvatarURL?.({ extension: 'png', size: 256 });
  const avatarBuffer = await fetchImageSafe(avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch {
      drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, member?.user?.username || 'B');
    }
  } else {
    drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, member?.user?.username || 'B');
  }
  ctx.restore();

  // Text Information
  const textLeft = 230;

  ctx.save();
  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('TERIMA KASIH TELAH MEM-BOOST KAMI!', textLeft, 105);
  ctx.restore();

  const rawName = member?.user?.globalName || member?.user?.username || member?.displayName || 'Booster Hebat';
  const displayName = rawName.length > 20 ? rawName.slice(0, 19) + '…' : rawName;
  ctx.save();
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(displayName, textLeft, 145);
  ctx.restore();

  const serverName = guild?.name || 'FASILKOM UI';
  ctx.save();
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Server Booster di ${serverName}`, textLeft, 175);
  ctx.restore();

  // Meta Cards
  const boxY = 210;
  const boxHeight = 64;

  // Box 1: Perk Status
  const box1Width = 240;
  ctx.save();
  roundRect(ctx, textLeft, boxY, box1Width, boxHeight, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#2d2254';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('STATUS HAK ISTIMEWA', textLeft + 16, boxY + 24);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('✅ Custom Role & Circle Unlocked', textLeft + 16, boxY + 48);
  ctx.restore();

  // Box 2: Total Server Boosts
  const box2X = textLeft + box1Width + 16;
  const box2Width = 210;
  ctx.save();
  roundRect(ctx, box2X, boxY, box2Width, boxHeight, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#2d2254';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('TOTAL SERVER BOOSTS', box2X + 16, boxY + 24);

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${totalBoosts} Boosts`, box2X + 16, boxY + 49);
  ctx.restore();

  return canvas.toBuffer('image/png');
}


/**
 * Renders visual guide card for new member orientation / #arrival (800x360).
 */
export async function renderWelcomeGuideCard({ guildName, guideSteps } = {}) {
  const width = 800;
  const height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0a2140');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  // Subtle ambient gold glow
  const goldAura = ctx.createRadialGradient(400, 50, 10, 400, 50, 260);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height);

  // Header Title
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('🏛️ FASILKOM UI • PANDUAN MAHASISWA BARU', 42, 58);

  const serverName = guildName || 'FASILKOM UI';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '13px sans-serif';
  ctx.fillText(`Selamat datang di ${serverName} • Ikuti 3 langkah awal berikut untuk memulai:`, 42, 82);
  ctx.restore();

  // Top Right Pill
  const badgeText = '🔰 ORIENTASI MABA';
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 24;
  const badgeX = width - 42 - badgeW;
  roundRect(ctx, badgeX, 42, badgeW, 26, 13);
  ctx.fillStyle = 'rgba(242, 169, 0, 0.15)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.goldLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeW / 2, 55);
  ctx.restore();

  // 3-Kolom Alur Langkah Pertama
  const defaultSteps = [
    {
      num: '1',
      title: 'Verifikasi Akun',
      desc: 'Ambil role mahasiswa Fasilkom via form verifikasi / #verifikasi.',
    },
    {
      num: '2',
      title: 'Pilih Role Studi',
      desc: 'Ambil role program studi (Ilkom / SI) dan Angkatan di #reaction-roles.',
    },
    {
      num: '3',
      title: 'Mulai Eksplorasi',
      desc: 'Kunjungi channel #general, circle nugas, dan voice room.',
    },
  ];

  const steps = Array.isArray(guideSteps) && guideSteps.length === 3 ? guideSteps : defaultSteps;
  const colW = 226;
  const colH = 170;
  const startX = 42;
  const gap = 19;
  const colY = 105;

  for (let i = 0; i < 3; i++) {
    const s = steps[i] || defaultSteps[i];
    const boxX = startX + i * (colW + gap);

    ctx.save();
    roundRect(ctx, boxX, colY, colW, colH, 12);
    ctx.fillStyle = COLORS.innerBoxBg;
    ctx.fill();
    ctx.strokeStyle = '#1b375e';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Step Number Badge (Gold circle)
    const circX = boxX + 28;
    const circY = colY + 30;
    const circR = 14;
    ctx.beginPath();
    ctx.arc(circX, circY, circR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.fillStyle = COLORS.navyDark;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.num || String(i + 1), circX, circY);

    // Title
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(s.title || `Langkah ${i + 1}`, boxX + 50, colY + 35);

    // Divider
    ctx.beginPath();
    ctx.moveTo(boxX + 16, colY + 54);
    ctx.lineTo(boxX + colW - 16, colY + 54);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Desc wrapped
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '12px sans-serif';
    drawWrappedText(ctx, s.desc || '', boxX + 16, colY + 76, colW - 32, 18, 4);
    ctx.restore();
  }

  // Bottom tip bar
  const tipY = 292;
  const tipH = 34;
  const tipW = width - 84;
  ctx.save();
  roundRect(ctx, 42, tipY, tipW, tipH, 8);
  ctx.fillStyle = 'rgba(13, 58, 115, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡 Butuh bantuan lebih lanjut? Buka channel #bantuan-tiket atau ketik /help', width / 2, tipY + tipH / 2);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders visual help and directory hub card for /help (800x320).
 */
export async function renderHelpGuideCard({ client, guildId } = {}) {
  const width = 800;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0b213f');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  // Radial Gold Glow
  const goldAura = ctx.createRadialGradient(400, 60, 10, 400, 60, 260);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height);

  // Header Title
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('🎓 PUSAT BANTUAN & DIREKTORI FITUR PACIL BAIK', 42, 56);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('Bot Komunitas Mahasiswa Fakultas Ilmu Komputer Universitas Indonesia', 42, 78);
  ctx.restore();

  // Status Pill: ALL SYSTEMS OPERATIONAL
  const pillText = '🟢 ALL SYSTEMS OPERATIONAL';
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const pillW = ctx.measureText(pillText).width + 20;
  const pillX = width - 42 - pillW;
  roundRect(ctx, pillX, 40, pillW, 26, 13);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.strokeStyle = COLORS.success;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = COLORS.success;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, 53);
  ctx.restore();

  // 4 Feature Module Boxes
  const modules = [
    { icon: '🎵', name: 'MUSIK', desc: 'Lavalink streaming, autoplay, dan lirik lagu berkualitas tinggi.' },
    { icon: '📊', name: 'LEVELING', desc: 'Sistem XP interaksi, rank card grafis, dan leaderboard server.' },
    { icon: '🛡️', name: 'MODERASI', desc: 'Proteksi server, tiket bantuan mahasiswa, dan log audit otomatis.' },
    { icon: '👥', name: 'KOMUNITAS', desc: 'Circle ruang nugas privat, menfess kampus anonim, dan role angkatan.' },
  ];

  const colW = 168;
  const colH = 138;
  const startX = 42;
  const gap = 16;
  const colY = 96;

  for (let i = 0; i < 4; i++) {
    const mod = modules[i];
    const boxX = startX + i * (colW + gap);

    ctx.save();
    roundRect(ctx, boxX, colY, colW, colH, 10);
    ctx.fillStyle = COLORS.innerBoxBg;
    ctx.fill();
    ctx.strokeStyle = '#1b375e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Module Icon & Name
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${mod.icon} ${mod.name}`, boxX + 14, colY + 30);

    // Divider
    ctx.beginPath();
    ctx.moveTo(boxX + 14, colY + 44);
    ctx.lineTo(boxX + colW - 14, colY + 44);
    ctx.strokeStyle = 'rgba(242, 169, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Module Desc
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '11px sans-serif';
    drawWrappedText(ctx, mod.desc, boxX + 14, colY + 64, colW - 28, 16, 4);
    ctx.restore();
  }

  // Footer Strip
  const footerY = 252;
  const footerH = 34;
  const footerW = width - 84;
  ctx.save();
  roundRect(ctx, 42, footerY, footerW, footerH, 8);
  ctx.fillStyle = 'rgba(13, 58, 115, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡 Gunakan dropdown menu di bawah untuk membuka detail command per divisi', width / 2, footerY + footerH / 2);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders modern graphic rank card for member profile in /rank (800x260).
 */
export async function renderRankCard({
  member,
  level = 1,
  xp = 0,
  xpNeeded = 1000,
  totalXp = 0,
  rankPosition = 1,
} = {}) {
  const width = 800;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0d2a4f');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  // Auras
  const avatarAura = ctx.createRadialGradient(105, 105, 10, 105, 105, 160);
  avatarAura.addColorStop(0, 'rgba(13, 58, 115, 0.45)');
  avatarAura.addColorStop(1, 'transparent');
  ctx.fillStyle = avatarAura;
  ctx.fillRect(0, 0, width, height);

  const goldAura = ctx.createRadialGradient(720, 50, 10, 720, 50, 160);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 16, 16, width - 32, height - 32, 14);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height, 28, 12);

  // 1. Avatar Area
  const avatarX = 105;
  const avatarY = 105;
  const avatarRadius = 50;

  // Dual rings
  ctx.save();
  ctx.shadowColor = COLORS.goldGlow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Avatar loading with fallback
  const rawUsername = member?.user?.username || member?.displayName || 'Mahasiswa';
  const avatarUrl = member?.user?.displayAvatarURL?.({ extension: 'png', size: 256 })
    || member?.displayAvatarURL?.({ extension: 'png', size: 256 });
  const avatarBuffer = await fetchImageSafe(avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch {
      drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, rawUsername);
    }
  } else {
    drawAvatarFallback(ctx, avatarX, avatarY, avatarRadius, rawUsername);
  }
  ctx.restore();

  // Level Pill Badge beneath avatar
  const pillW = 110;
  const pillH = 26;
  const pillX = avatarX - pillW / 2;
  const pillY = 172;
  ctx.save();
  roundRect(ctx, pillX, pillY, pillW, pillH, 13);
  const lvlGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  lvlGrad.addColorStop(0, COLORS.gold);
  lvlGrad.addColorStop(1, COLORS.goldLight);
  ctx.fillStyle = lvlGrad;
  ctx.fill();

  ctx.fillStyle = COLORS.navyDark;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${level}`, avatarX, pillY + pillH / 2);
  ctx.restore();

  // 2. User Info & Rank
  const textLeft = 195;

  const rawDisplayName = member?.user?.globalName || member?.user?.username || member?.displayName || 'Mahasiswa Pacil';
  const cleanDisplayName = rawDisplayName.length > 20 ? rawDisplayName.slice(0, 19) + '…' : rawDisplayName;
  ctx.save();
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(cleanDisplayName, textLeft, 58);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '13px sans-serif';
  ctx.fillText(`@${member?.user?.username || 'member'}`, textLeft, 80);
  ctx.restore();

  // Rank in Top Right Corner
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('RANK', 750, 48);

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`#${rankPosition}`, 750, 80);
  ctx.restore();

  // 3. Progress Bar
  const curXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const reqXp = Number.isFinite(xpNeeded) && xpNeeded > 0 ? xpNeeded : 1000;
  const pct = Math.min(1, Math.max(0, curXp / reqXp));

  ctx.save();
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('PROGRESS XP', textLeft, 108);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${curXp.toLocaleString()} / ${reqXp.toLocaleString()} XP (${Math.round(pct * 100)}%)`, 750, 108);
  ctx.restore();

  const barY = 118;
  const barW = 555;
  const barH = 20;
  ctx.save();
  roundRect(ctx, textLeft, barY, barW, barH, 10);
  ctx.fillStyle = '#132742';
  ctx.fill();
  ctx.strokeStyle = '#23426d';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (pct > 0) {
    const fillW = Math.max(10, Math.floor(barW * pct));
    roundRect(ctx, textLeft, barY, fillW, barH, 10);
    const barGrad = ctx.createLinearGradient(textLeft, barY, textLeft + fillW, barY);
    barGrad.addColorStop(0, '#0d3a73');
    barGrad.addColorStop(1, COLORS.gold);
    ctx.fillStyle = barGrad;
    ctx.fill();
  }
  ctx.restore();

  // 4. Bottom Stats (Mini Cards)
  const cardY = 155;
  const cardW = 265;
  const cardH = 55;

  // Mini-card 1: Total XP
  ctx.save();
  roundRect(ctx, textLeft, cardY, cardW, cardH, 8);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('TOTAL XP DIKUMPULKAN', textLeft + 14, cardY + 20);

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 15px sans-serif';
  const effectiveTotal = totalXp || curXp;
  ctx.fillText(`${effectiveTotal.toLocaleString()} XP`, textLeft + 14, cardY + 42);
  ctx.restore();

  // Mini-card 2: Next Level
  const card2X = textLeft + cardW + 25;
  ctx.save();
  roundRect(ctx, card2X, cardY, cardW, cardH, 8);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('MENUJU LEVEL BERIKUTNYA', card2X + 14, cardY + 20);

  const neededNext = Math.max(0, reqXp - curXp);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`+${neededNext.toLocaleString()} XP`, card2X + 14, cardY + 42);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders visual guide for leveling mechanics and role rewards (800x300).
 */
export async function renderLevelGuideCard() {
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0a2140');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  const goldAura = ctx.createRadialGradient(400, 50, 10, 400, 50, 240);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height);

  // Header Title
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('📊 PANDUAN SISTEM LEVELING & XP PACIL', 42, 56);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('Tingkatkan keaktifan diskusi untuk membuka role kehormatan dan reward khusus', 42, 78);
  ctx.restore();

  // Top Right Pill
  const pillText = '⭐ LEVEL SYSTEM';
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const pillW = ctx.measureText(pillText).width + 22;
  const pillX = width - 42 - pillW;
  roundRect(ctx, pillX, 40, pillW, 26, 13);
  ctx.fillStyle = 'rgba(242, 169, 0, 0.15)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.goldLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, 53);
  ctx.restore();

  // 2 Columns
  const boxW = 345;
  const boxH = 150;
  const boxY = 88;

  // Box 1: Mekanisme XP
  ctx.save();
  roundRect(ctx, 42, boxY, boxW, boxH, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('⚡ ATURAN PEROLEHAN XP', 58, boxY + 28);

  ctx.beginPath();
  ctx.moveTo(58, boxY + 40);
  ctx.lineTo(42 + boxW - 16, boxY + 40);
  ctx.strokeStyle = 'rgba(242, 169, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const rules = [
    '• 15 - 25 XP per pesan (cooldown 60 detik)',
    '• Bonus XP untuk interaksi voice room aktif',
    '• Channel spam & bot otomatis dikecualikan',
    '• Pengali 1.5x XP saat event belajar bersama',
  ];
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  rules.forEach((r, idx) => {
    ctx.fillText(r, 58, boxY + 65 + idx * 22);
  });
  ctx.restore();

  // Box 2: Tingkatan Role Reward
  const box2X = 413;
  ctx.save();
  roundRect(ctx, box2X, boxY, boxW, boxH, 10);
  ctx.fillStyle = COLORS.innerBoxBg;
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('🎖️ TINGKATAN ROLE REWARD', box2X + 16, boxY + 28);

  ctx.beginPath();
  ctx.moveTo(box2X + 16, boxY + 40);
  ctx.lineTo(box2X + boxW - 16, boxY + 40);
  ctx.strokeStyle = 'rgba(242, 169, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const rewards = [
    { badge: 'Lv 5', color: '#a0b3cf', title: 'Maba Aktif', desc: 'Fitur stiker & command hiburan' },
    { badge: 'Lv 10', color: '#38bdf8', title: 'Sophomore', desc: 'Ruang nugas privat & voice prioritas' },
    { badge: 'Lv 20', color: '#f2a900', title: 'Senior Scholar', desc: 'Hak custom role & badge profil' },
    { badge: 'Lv 50', color: '#f472b6', title: 'Pacil Legend', desc: 'Hall of Fame & hak istimewa eksklusif' },
  ];

  rewards.forEach((rw, idx) => {
    const itemY = boxY + 54 + idx * 23;
    roundRect(ctx, box2X + 16, itemY, 40, 18, 9);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = rw.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = rw.color;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rw.badge, box2X + 36, itemY + 13);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(rw.title, box2X + 66, itemY + 13);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '11px sans-serif';
    ctx.fillText(`• ${rw.desc}`, box2X + 165, itemY + 13);
  });
  ctx.restore();

  // Bottom tip
  const tipY = 248;
  const tipH = 30;
  const tipW = width - 84;
  ctx.save();
  roundRect(ctx, 42, tipY, tipW, tipH, 8);
  ctx.fillStyle = 'rgba(13, 58, 115, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡 Ketik /rank untuk melihat profil level Anda atau /leaderboard untuk daftar teratas', width / 2, tipY + tipH / 2);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders visual guide for anonymous campus confessions & menfess (/confession panel) (800x320).
 */
export async function renderConfessionGuideCard() {
  const width = 800;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#100726');
  bgGrad.addColorStop(0.5, '#0d1b38');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  // Rose Gold and Gold Ambient Glow
  const roseAura = ctx.createRadialGradient(250, 60, 10, 250, 60, 220);
  roseAura.addColorStop(0, 'rgba(244, 114, 182, 0.18)');
  roseAura.addColorStop(1, 'transparent');
  ctx.fillStyle = roseAura;
  ctx.fillRect(0, 0, width, height);

  const goldAura = ctx.createRadialGradient(650, 60, 10, 650, 60, 220);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = '#3b2469';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height);

  // Header Title
  ctx.save();
  ctx.fillStyle = '#f472b6';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('💌 PACIL MENFESS CORNER • SUARA MAHASISWA', 42, 56);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText('Ruang berbagi pesan, curahan hati, dan apresiasi kampus secara anonim', 42, 78);
  ctx.restore();

  // Top Right Pill
  const pillText = '🔒 100% ANONIM';
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const pillW = ctx.measureText(pillText).width + 22;
  const pillX = width - 42 - pillW;
  roundRect(ctx, pillX, 40, pillW, 26, 13);
  ctx.fillStyle = 'rgba(244, 114, 182, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f9a8d4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, 53);
  ctx.restore();

  // 3 Pillar Boxes
  const pillars = [
    {
      title: '🔒 100% ANONIM',
      desc: 'Identitas pengirim dirahasiakan sepenuhnya dari publik dan member server.',
    },
    {
      title: '📝 FORMAT RAPI',
      desc: 'Pilihan kolom From (samaran), To (target), dan Message curhat terstruktur.',
    },
    {
      title: '💬 THREAD BALASAN',
      desc: 'Setiap pesan menfess otomatis membuat thread diskusi interaktif anonim.',
    },
  ];

  const colW = 226;
  const colH = 118;
  const startX = 42;
  const gap = 19;
  const colY = 92;

  for (let i = 0; i < 3; i++) {
    const p = pillars[i];
    const boxX = startX + i * (colW + gap);

    ctx.save();
    roundRect(ctx, boxX, colY, colW, colH, 10);
    ctx.fillStyle = COLORS.innerBoxBg;
    ctx.fill();
    ctx.strokeStyle = '#2d2254';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(p.title, boxX + 16, colY + 28);

    ctx.beginPath();
    ctx.moveTo(boxX + 16, colY + 38);
    ctx.lineTo(boxX + colW - 16, colY + 38);
    ctx.strokeStyle = 'rgba(242, 169, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '11px sans-serif';
    drawWrappedText(ctx, p.desc, boxX + 16, colY + 56, colW - 32, 16, 3);
    ctx.restore();
  }

  // Warning Banner at Bottom
  const warnY = 222;
  const warnH = 66;
  const warnW = width - 84;
  ctx.save();
  roundRect(ctx, 42, warnY, warnW, warnH, 10);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('⚠️ ETIKA & KETENTUAN PENGIRIMAN MENFESS', 60, warnY + 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.fillText('Dilarang menyebarkan data pribadi (doxxing), fitnah, pelecehan, atau ujaran kebencian.', 60, warnY + 44);
  ctx.fillText('Moderator memantau kepatuhan etika secara berkala demi kenyamanan bersama.', 60, warnY + 59);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders visual guide for community rules and code of conduct (/guide) (800x340).
 */
export async function renderRulesGuideCard({ guildName } = {}) {
  const width = 800;
  const height = 340;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0a2140');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  const goldAura = ctx.createRadialGradient(400, 50, 10, 400, 50, 260);
  goldAura.addColorStop(0, 'rgba(242, 169, 0, 0.15)');
  goldAura.addColorStop(1, 'transparent');
  ctx.fillStyle = goldAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height);

  // Header Title
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('📜 TATA TERTIB & ETIKA KOMUNITAS PACIL BAIK', 42, 56);

  const serverName = guildName || 'FASILKOM UI';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${serverName} • Norma kehidupan kampus dan interaksi digital sehat`, 42, 78);
  ctx.restore();

  // Top Right Pill
  const pillText = '⚖️ CODE OF CONDUCT';
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const pillW = ctx.measureText(pillText).width + 22;
  const pillX = width - 42 - pillW;
  roundRect(ctx, pillX, 40, pillW, 26, 13);
  ctx.fillStyle = 'rgba(242, 169, 0, 0.15)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.goldLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, 53);
  ctx.restore();

  // 4 Pilar Tata Tertib (2x2 Grid)
  const rules = [
    {
      title: '⚖️ Integritas Akademik',
      desc: 'Dilarang keras membagikan jawaban tugas/ujian langsung atau melakukan plagiarisme kode kuliah Fasilkom UI.',
    },
    {
      title: '🤝 Inklusivitas & Kesopanan',
      desc: 'Saling menghargai tanpa membedakan angkatan, prodi, suku, agama, ras, dan identitas gender.',
    },
    {
      title: '🛡️ Keamanan & Privasi',
      desc: 'Jaga kerahasiaan identitas rekan mahasiswa. Dilarang menyebarkan tangkapan layar privat tanpa izin.',
    },
    {
      title: '📌 Saluran Tepat Topik',
      desc: 'Manfaatkan channel sesuai fungsinya (#tugas-diskusi untuk akademik, #general untuk obrolan santai).',
    },
  ];

  const colW = 345;
  const rowH = 98;
  const startX1 = 42;
  const startX2 = 413;
  const startY1 = 96;
  const startY2 = 208;

  const positions = [
    { x: startX1, y: startY1 },
    { x: startX2, y: startY1 },
    { x: startX1, y: startY2 },
    { x: startX2, y: startY2 },
  ];

  for (let i = 0; i < 4; i++) {
    const r = rules[i];
    const pos = positions[i];

    ctx.save();
    roundRect(ctx, pos.x, pos.y, colW, rowH, 10);
    ctx.fillStyle = COLORS.innerBoxBg;
    ctx.fill();
    ctx.strokeStyle = '#1b375e';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(r.title, pos.x + 14, pos.y + 24);

    ctx.beginPath();
    ctx.moveTo(pos.x + 14, pos.y + 34);
    ctx.lineTo(pos.x + colW - 14, pos.y + 34);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '11px sans-serif';
    drawWrappedText(ctx, r.desc, pos.x + 14, pos.y + 52, colW - 28, 16, 3);
    ctx.restore();
  }

  // Bottom gold subtle line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(42, 318);
  ctx.lineTo(width - 42, 318);
  ctx.strokeStyle = 'rgba(242, 169, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Renders visual guide for temporary voice rooms (Join-to-Create) (800x280).
 */
export async function renderVoiceGuideCard({ channelName, ownerName } = {}) {
  const width = 800;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, COLORS.navyDark);
  bgGrad.addColorStop(0.5, '#0b213f');
  bgGrad.addColorStop(1, '#051122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  drawTechGrid(ctx, width, height);

  const cyanAura = ctx.createRadialGradient(400, 50, 10, 400, 50, 240);
  cyanAura.addColorStop(0, 'rgba(2, 132, 199, 0.18)');
  cyanAura.addColorStop(1, 'transparent');
  ctx.fillStyle = cyanAura;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.save();
  roundRect(ctx, 18, 18, width - 36, height - 36, 14);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  drawCornerAccents(ctx, width, height, 28, 12);

  // Header Title
  ctx.save();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('🔊 PANDUAN KONTROL RUANG SUARA (JTC)', 42, 54);

  const cleanRoom = channelName || 'Private Room';
  const cleanOwner = ownerName || 'Host Ruang';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText(`Ruang: ${cleanRoom} • Pemilik: ${cleanOwner}`, 42, 74);
  ctx.restore();

  // Top Right Pill
  const pillText = '🎙️ VOICE ROOM ACTIVE';
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const pillW = ctx.measureText(pillText).width + 20;
  const pillX = width - 42 - pillW;
  roundRect(ctx, pillX, 38, pillW, 26, 13);
  ctx.fillStyle = 'rgba(2, 132, 199, 0.15)';
  ctx.fill();
  ctx.strokeStyle = COLORS.info;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, 51);
  ctx.restore();

  // 6 Action Buttons (3 cols x 2 rows)
  const buttons = [
    { title: '🔒 Kunci / Buka', desc: 'Batasi akses hanya untuk teman tertentu.' },
    { title: '🙈 Sembunyikan', desc: 'Buat ruang tidak terlihat oleh member lain.' },
    { title: '✏️ Ganti Nama', desc: 'Sesuaikan nama ruang (contoh: Diskusi SDA).' },
    { title: '👥 Batas User', desc: 'Atur kuota maksimal peserta (1 - 99 orang).' },
    { title: '🎚️ Bitrate Suara', desc: 'Sesuaikan kualitas audio (64 - 384 kbps).' },
    { title: '👑 Klaim / Transfer', desc: 'Pindahkan host jika ketua offline.' },
  ];

  const colW = 226;
  const rowH = 58;
  const startX = 42;
  const gapX = 19;
  const startY1 = 88;
  const startY2 = 154;

  for (let i = 0; i < 6; i++) {
    const btn = buttons[i];
    const colIdx = i % 3;
    const rowIdx = Math.floor(i / 3);
    const boxX = startX + colIdx * (colW + gapX);
    const boxY = rowIdx === 0 ? startY1 : startY2;

    ctx.save();
    roundRect(ctx, boxX, boxY, colW, rowH, 8);
    ctx.fillStyle = COLORS.innerBoxBg;
    ctx.fill();
    ctx.strokeStyle = '#1b375e';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(btn.title, boxX + 12, boxY + 22);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '10px sans-serif';
    drawWrappedText(ctx, btn.desc, boxX + 12, boxY + 40, colW - 24, 14, 2);
    ctx.restore();
  }

  // Bottom Etika Mini-Banner
  const bannerY = 222;
  const bannerH = 30;
  const bannerW = width - 84;
  ctx.save();
  roundRect(ctx, 42, bannerY, bannerW, bannerH, 8);
  ctx.fillStyle = 'rgba(13, 58, 115, 0.35)';
  ctx.fill();
  ctx.strokeStyle = '#1b375e';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡 Gunakan fitur mute/push-to-talk di ruang publik agar diskusi tetap kondusif.', width / 2, bannerY + bannerH / 2);
  ctx.restore();

  return canvas.toBuffer('image/png');
}
