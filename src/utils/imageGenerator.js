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
 * Fallback avatar drawer if image fails to download.
 */
function drawAvatarFallback(ctx, x, y, radius, name) {
  const grad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  grad.addColorStop(0, '#0d3a73');
  grad.addColorStop(1, '#f2a900');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(radius)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), x, y);
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
