import crypto from 'crypto';
import { PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, patchGuildConfig } from './config/guildConfig.js';
import { buildPacilEmbed } from '../ui/pacil.js';

export const CAS_CONFIG = {
  baseUrl: 'https://sso.ui.ac.id/cas2',
  loginUrl: 'https://sso.ui.ac.id/cas2/login',
  validateUrl: 'https://sso.ui.ac.id/cas2/serviceValidate',
  logoutUrl: 'https://sso.ui.ac.id/cas2/logout',
};

// Secret used for HMAC state signing (uses env or stable fallback for current process session)
const STATE_SECRET = process.env.SSO_STATE_SECRET || process.env.DISCORD_TOKEN || 'pacil-sso-state-secret-2026';
const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory or database map for verified NPMs to prevent multi-account abuse
export const VERIFIED_NPM_REGISTRY = new Map();

/**
 * Generates an encrypted/signed HMAC state token tied to guildId and userId.
 */
export function generateVerificationState(guildId, userId) {
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${guildId}:${userId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  return token;
}

/**
 * Validates the HMAC state token and checks expiration.
 */
export function verifyVerificationState(token) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;

    const [guildId, userId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      logger.warn(`SSO State token expired for user ${userId}`);
      return null;
    }

    const payload = `${guildId}:${userId}:${expiresAtStr}`;
    const expected = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      logger.warn(`Invalid SSO State token signature for user ${userId}`);
      return null;
    }

    return { guildId, userId, expiresAt };
  } catch (error) {
    logger.error('Error verifying SSO state token:', error);
    return null;
  }
}

/**
 * Parses XML tag contents safely without external heavy XML parser.
 */
function extractXmlTag(xml, tagName) {
  const openTag = new RegExp(`<cas:${tagName}[^>]*>([\\s\\S]*?)<\\/cas:${tagName}>`, 'i');
  const match = xml.match(openTag);
  return match ? match[1].trim() : null;
}

/**
 * Parses student academic metadata from CAS 2.0 response attributes.
 */
export function parseStudentMetadata({ username, npm, kd_org, nama, role = 'mahasiswa' }) {
  const cleanNpm = String(npm || '').trim();
  const cleanUsername = String(username || '').trim();
  const cleanName = String(nama || username || 'Mahasiswa UI').trim();

  // 1. Angkatan (Tahun Masuk) from NPM 2 digit awal
  let angkatan = null;
  let shortYear = 'XX';
  if (/^\d{2}/.test(cleanNpm)) {
    shortYear = cleanNpm.slice(0, 2);
    angkatan = `20${shortYear}`;
  }

  // 2. Program Studi & Fakultas from kd_org / attributes
  let prodi = 'Ilmu Komputer';
  let prodiCode = 'CS';
  let fakultas = 'Fakultas Ilmu Komputer';
  let isFasilkom = true;

  const orgStr = String(kd_org || '').toLowerCase();

  if (orgStr.includes('01.00.12.02') || orgStr.includes('sistem informasi') || orgStr.includes('si')) {
    prodi = 'Sistem Informasi';
    prodiCode = 'SI';
  } else if (orgStr.includes('01.00.12.01') || orgStr.includes('ilmu komputer') || orgStr.includes('cs')) {
    prodi = 'Ilmu Komputer';
    prodiCode = 'CS';
  } else if (orgStr.includes('01.00.12.03') || orgStr.includes('magister') || orgStr.includes('mik')) {
    prodi = 'Magister Ilmu Komputer';
    prodiCode = 'MIK';
  } else if (orgStr.includes('01.00.12.04') || orgStr.includes('mti')) {
    prodi = 'Magister Teknologi Informasi';
    prodiCode = 'MTI';
  } else if (!orgStr.startsWith('01.00.12') && orgStr.length > 0) {
    isFasilkom = false;
    fakultas = 'Universitas Indonesia (Non-Fasilkom)';
    prodi = 'Mahasiswa UI';
    prodiCode = 'UI';
  }

  // 3. Clean formatted Nickname: "Drew Taylor (CS'24)"
  const maxNameLen = 32 - (prodiCode.length + shortYear.length + 5);
  const truncatedName = cleanName.length > maxNameLen ? cleanName.slice(0, maxNameLen - 1) + '…' : cleanName;
  const formattedNickname = `${truncatedName} (${prodiCode}'${shortYear})`;

  return {
    username: cleanUsername,
    npm: cleanNpm,
    nama: cleanName,
    angkatan,
    shortYear,
    prodi,
    prodiCode,
    fakultas,
    isFasilkom,
    role,
    formattedNickname,
  };
}

/**
 * Validates CAS ticket with official UI server https://sso.ui.ac.id/cas2/serviceValidate.
 */
export async function validateCasTicket(serviceUrl, ticket) {
  try {
    const url = new URL(CAS_CONFIG.validateUrl);
    url.searchParams.set('service', serviceUrl);
    url.searchParams.set('ticket', ticket);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'PacilBot-SSO-Client/2.2.0 (Fasilkom UI)',
        'Accept': 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`CAS validation request failed with HTTP ${response.status}`);
    }

    const xml = await response.text();

    if (!xml.includes('cas:authenticationSuccess')) {
      const errorMsg = extractXmlTag(xml, 'authenticationFailure') || 'Autentikasi SSO UI gagal atau tiket tidak valid';
      return { success: false, error: errorMsg };
    }

    const username = extractXmlTag(xml, 'user') || '';
    const nama = extractXmlTag(xml, 'nama') || extractXmlTag(xml, 'name') || username;
    const npm = extractXmlTag(xml, 'npm') || extractXmlTag(xml, 'student_number') || '';
    const kd_org = extractXmlTag(xml, 'kd_org') || extractXmlTag(xml, 'org_code') || '01.00.12.01';
    const peran = extractXmlTag(xml, 'peran_user') || 'mahasiswa';

    const studentData = parseStudentMetadata({ username, npm, kd_org, nama, role: peran });

    return {
      success: true,
      user: studentData,
    };
  } catch (error) {
    logger.error('Error validating CAS ticket with sso.ui.ac.id:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Finds or creates a role by name in the target guild.
 */
async function getOrCreateRole(guild, name, color = null) {
  let role = guild.roles.cache.find((r) => r.name.toLowerCase() === name.toLowerCase());
  if (!role) {
    try {
      role = await guild.roles.create({
        name,
        color: color || '#f2a900',
        reason: 'Auto-created by Pacil Bot SSO Verification',
      });
      logger.info(`Created role "${name}" in guild ${guild.name} (${guild.id})`);
    } catch (e) {
      logger.warn(`Could not auto-create role "${name}":`, e.message);
    }
  }
  return role;
}

/**
 * Assigns student roles (Verified, Fakultas, Prodi, Angkatan) and updates nickname.
 */
export async function assignStudentRoles(guild, member, studentData, customConfig = {}) {
  const results = {
    rolesAdded: [],
    rolesFailed: [],
    nicknameUpdated: false,
  };

  const botMember = guild.members.me;
  if (!botMember?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
    logger.error(`Bot lacks ManageRoles permission in guild ${guild.name}`);
    return results;
  }

  // 1. Primary Verified Role (e.g. "Warga Pacil")
  const primaryRoleName = customConfig.roleName || 'Warga Pacil';
  const primaryRole = (customConfig.roleId ? guild.roles.cache.get(customConfig.roleId) : null)
    || (await getOrCreateRole(guild, primaryRoleName, '#f2a900'));

  if (primaryRole && botMember.roles.highest.position > primaryRole.position) {
    await member.roles.add(primaryRole.id).catch(() => {});
    results.rolesAdded.push(primaryRole.name);
  }

  // 2. Program Studi Role ("Ilmu Komputer" or "Sistem Informasi")
  if (studentData.prodi) {
    const prodiRole = await getOrCreateRole(guild, studentData.prodi, '#0d3a73');
    if (prodiRole && botMember.roles.highest.position > prodiRole.position) {
      await member.roles.add(prodiRole.id).catch(() => {});
      results.rolesAdded.push(prodiRole.name);
    }
  }

  // 3. Angkatan Role ("Angkatan 2024", etc.)
  if (studentData.angkatan) {
    const angkatanRoleName = `Angkatan ${studentData.angkatan}`;
    const angkatanRole = await getOrCreateRole(guild, angkatanRoleName, '#ffd166');
    if (angkatanRole && botMember.roles.highest.position > angkatanRole.position) {
      await member.roles.add(angkatanRole.id).catch(() => {});
      results.rolesAdded.push(angkatanRole.name);
    }
  }

  // 4. Remove Unverified Role if configured
  if (customConfig.unverifiedRoleId && guild.roles.cache.has(customConfig.unverifiedRoleId)) {
    const unverifiedRole = guild.roles.cache.get(customConfig.unverifiedRoleId);
    if (unverifiedRole && botMember.roles.highest.position > unverifiedRole.position) {
      await member.roles.remove(unverifiedRole.id).catch(() => {});
    }
  }

  // 5. Update Server Nickname (if enabled and bot has permission)
  if (customConfig.autoNickname !== false && botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
    if (botMember.roles.highest.position > member.roles.highest.position && member.id !== guild.ownerId) {
      try {
        await member.setNickname(studentData.formattedNickname, 'SSO UI Verified Nickname');
        results.nicknameUpdated = true;
      } catch (err) {
        logger.warn(`Could not set nickname for ${member.user.tag}: ${err.message}`);
      }
    }
  }

  // 6. Record verification in memory registry to prevent multi-account abuse
  if (studentData.npm) {
    VERIFIED_NPM_REGISTRY.set(studentData.npm, {
      userId: member.id,
      guildId: guild.id,
      verifiedAt: new Date().toISOString(),
    });
  }

  return results;
}
