import { isCommandEnabled } from './commandAccessService.js';
import { isCommandCategoryEnabled, isMaintenanceMode } from '../config/bot.js';
import { logger } from '../utils/logger.js';

export const CommandStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  DEGRADED: 'degraded',
  MAINTENANCE: 'maintenance',
};

export const STATUS_ICONS = {
  [CommandStatus.OPEN]: '🟢',
  [CommandStatus.CLOSED]: '🔴',
  [CommandStatus.DEGRADED]: '⚠️',
  [CommandStatus.MAINTENANCE]: '🛠️',
};

export const STATUS_LABELS = {
  [CommandStatus.OPEN]: 'Aktif / Open',
  [CommandStatus.CLOSED]: 'Ditutup / Closed',
  [CommandStatus.DEGRADED]: 'Ada Kendala',
  [CommandStatus.MAINTENANCE]: 'Dalam Perbaikan',
};

// Global manual overrides (e.g. when developers take down a command for fixes)
const globalOverrides = new Map();

// Rolling window error tracking (command -> { errors: timestamps[], lastError: string, lastErrorTime: number, consecutiveErrors: number })
const errorTracker = new Map();

const ERROR_ROLLING_WINDOW_MS = 20 * 60 * 1000; // 20 minutes
const DEGRADED_ERROR_THRESHOLD = 3; // 3 errors in rolling window triggers degraded

function cleanOldErrors(trackerEntry) {
  const cutoff = Date.now() - ERROR_ROLLING_WINDOW_MS;
  trackerEntry.errors = trackerEntry.errors.filter((time) => time > cutoff);
}

/**
 * Record a command failure to track command health dynamically.
 */
export function recordCommandError(commandName, error) {
  if (!commandName) return;
  const key = String(commandName).toLowerCase().trim();

  let entry = errorTracker.get(key);
  if (!entry) {
    entry = { errors: [], lastError: null, lastErrorTime: null, consecutiveErrors: 0 };
    errorTracker.set(key, entry);
  }

  const now = Date.now();
  entry.errors.push(now);
  cleanOldErrors(entry);
  entry.consecutiveErrors += 1;
  entry.lastError = error?.userMessage || error?.message || 'Unexpected runtime error';
  entry.lastErrorTime = now;

  logger.warn(`[CommandHealth] Recorded error for /${key} (consecutive: ${entry.consecutiveErrors}, recent: ${entry.errors.length}):`, {
    error: entry.lastError,
  });
}

/**
 * Record a successful command execution to recover health.
 */
export function recordCommandSuccess(commandName) {
  if (!commandName) return;
  const key = String(commandName).toLowerCase().trim();

  const entry = errorTracker.get(key);
  if (entry) {
    entry.consecutiveErrors = 0;
    cleanOldErrors(entry);
    if (entry.errors.length === 0) {
      errorTracker.delete(key);
    }
  }
}

/**
 * Set a manual global status for a command (e.g. closed or maintenance).
 */
export function setGlobalCommandStatus(commandName, status, reason = null, updatedBy = 'Admin Pacil Baik') {
  const key = String(commandName).toLowerCase().trim();
  if (status === CommandStatus.OPEN) {
    globalOverrides.delete(key);
    return { commandName: key, status: CommandStatus.OPEN };
  }

  const override = {
    status,
    reason: reason || (status === CommandStatus.MAINTENANCE ? 'Sedang dalam pemeliharaan/update' : 'Ditutup sementara oleh admin'),
    updatedAt: Date.now(),
    updatedBy,
  };

  globalOverrides.set(key, override);
  return { commandName: key, ...override };
}

/**
 * Remove manual global status override for a command.
 */
export function clearGlobalCommandStatus(commandName) {
  const key = String(commandName).toLowerCase().trim();
  globalOverrides.delete(key);
  return { commandName: key, cleared: true };
}

/**
 * Get all active global overrides.
 */
export function getGlobalCommandOverrides() {
  const result = [];
  for (const [commandName, data] of globalOverrides.entries()) {
    result.push({ commandName, ...data });
  }
  return result;
}

/**
 * Clear recorded error history for a command.
 */
export function clearCommandErrors(commandName) {
  const key = String(commandName).toLowerCase().trim();
  errorTracker.delete(key);
  return { commandName: key, cleared: true };
}

/**
 * Evaluates the full availability and status of a single command.
 */
export async function getCommandStatus(client, commandName, guildId = null, category = null) {
  const normalized = String(commandName || '').toLowerCase().trim();
  const baseName = normalized.includes(' ') ? normalized.split(' ')[0] : normalized;

  // 1. Check global maintenance mode
  if (isMaintenanceMode()) {
    return {
      name: normalized,
      status: CommandStatus.MAINTENANCE,
      icon: STATUS_ICONS[CommandStatus.MAINTENANCE],
      label: STATUS_LABELS[CommandStatus.MAINTENANCE],
      isOpen: false,
      reason: 'Bot sedang dalam mode maintenance global.',
      lastError: null,
      lastErrorTime: null,
      errorCount: 0,
      isGuildDisabled: false,
      isGlobalOverride: true,
    };
  }

  // 2. Check category enabled globally
  let resolvedCategory = category;
  if (!resolvedCategory && client?.commands) {
    const cmdObj = client.commands.get(baseName);
    resolvedCategory = cmdObj?.category || 'Core';
  }

  if (resolvedCategory && !isCommandCategoryEnabled(resolvedCategory)) {
    return {
      name: normalized,
      status: CommandStatus.CLOSED,
      icon: STATUS_ICONS[CommandStatus.CLOSED],
      label: STATUS_LABELS[CommandStatus.CLOSED],
      isOpen: false,
      reason: `Kategori ${resolvedCategory} sedang dinonaktifkan secara global.`,
      lastError: null,
      lastErrorTime: null,
      errorCount: 0,
      isGuildDisabled: false,
      isGlobalOverride: true,
    };
  }

  // 3. Check manual global overrides (for base command or subcommand)
  const manualOverride = globalOverrides.get(normalized) || globalOverrides.get(baseName);
  if (manualOverride) {
    return {
      name: normalized,
      status: manualOverride.status,
      icon: STATUS_ICONS[manualOverride.status] || STATUS_ICONS[CommandStatus.CLOSED],
      label: STATUS_LABELS[manualOverride.status] || STATUS_LABELS[CommandStatus.CLOSED],
      isOpen: manualOverride.status === CommandStatus.OPEN,
      reason: manualOverride.reason,
      lastError: null,
      lastErrorTime: null,
      errorCount: 0,
      isGuildDisabled: false,
      isGlobalOverride: true,
    };
  }

  // 4. Check guild-level disable
  let isGuildDisabled = false;
  if (guildId && client) {
    try {
      const enabledInGuild = await isCommandEnabled(client, guildId, normalized, resolvedCategory);
      if (!enabledInGuild) {
        isGuildDisabled = true;
      }
    } catch {
      // Ignore guild config fetch error in status calculation
    }
  }

  if (isGuildDisabled) {
    return {
      name: normalized,
      status: CommandStatus.CLOSED,
      icon: STATUS_ICONS[CommandStatus.CLOSED],
      label: STATUS_LABELS[CommandStatus.CLOSED],
      isOpen: false,
      reason: 'Command ini dinonaktifkan untuk server ini.',
      lastError: null,
      lastErrorTime: null,
      errorCount: 0,
      isGuildDisabled: true,
      isGlobalOverride: false,
    };
  }

  // 5. Check error health
  const errorInfo = errorTracker.get(normalized) || errorTracker.get(baseName);
  if (errorInfo) {
    cleanOldErrors(errorInfo);
    if (errorInfo.errors.length >= DEGRADED_ERROR_THRESHOLD || errorInfo.consecutiveErrors >= 3) {
      return {
        name: normalized,
        status: CommandStatus.DEGRADED,
        icon: STATUS_ICONS[CommandStatus.DEGRADED],
        label: STATUS_LABELS[CommandStatus.DEGRADED],
        isOpen: true, // still technically executable unless closed, but with warning
        reason: `Terdeteksi ${errorInfo.errors.length} error baru-baru ini: ${errorInfo.lastError || 'Kendala runtime'}`,
        lastError: errorInfo.lastError,
        lastErrorTime: errorInfo.lastErrorTime,
        errorCount: errorInfo.errors.length,
        isGuildDisabled: false,
        isGlobalOverride: false,
      };
    }
  }

  // 6. Healthy / Open
  return {
    name: normalized,
    status: CommandStatus.OPEN,
    icon: STATUS_ICONS[CommandStatus.OPEN],
    label: STATUS_LABELS[CommandStatus.OPEN],
    isOpen: true,
    reason: null,
    lastError: null,
    lastErrorTime: null,
    errorCount: errorInfo?.errors?.length || 0,
    isGuildDisabled: false,
    isGlobalOverride: false,
  };
}

/**
 * Quick check if a command can be executed.
 */
export async function isCommandAvailable(client, commandName, guildId = null, category = null) {
  const status = await getCommandStatus(client, commandName, guildId, category);
  return {
    allowed: status.isOpen,
    status: status.status,
    icon: status.icon,
    reason: status.reason || 'Command siap digunakan',
  };
}

/**
 * Aggregates all command statuses for an entire guild / server.
 */
export async function getSystemStatusSummary(client, guildId = null) {
  const allCommands = [];

  if (client?.commands) {
    for (const command of client.commands.values()) {
      if (!command?.data?.name) continue;
      const cmdName = command.data.name;
      const category = command.category || 'Core';

      const status = await getCommandStatus(client, cmdName, guildId, category);
      allCommands.push({
        ...status,
        category,
        description: command.data.description || 'Tidak ada deskripsi',
      });
    }
  }

  allCommands.sort((a, b) => a.name.localeCompare(b.name));

  const openList = allCommands.filter((c) => c.status === CommandStatus.OPEN);
  const closedList = allCommands.filter((c) => c.status === CommandStatus.CLOSED);
  const degradedList = allCommands.filter((c) => c.status === CommandStatus.DEGRADED);
  const maintenanceList = allCommands.filter((c) => c.status === CommandStatus.MAINTENANCE);

  let overallHealth = 'healthy';
  if (maintenanceList.length > 0 || closedList.length > 5) {
    overallHealth = 'maintenance';
  } else if (degradedList.length > 0 || closedList.length > 0) {
    overallHealth = 'degraded';
  }

  return {
    totalCommands: allCommands.length,
    openCount: openList.length,
    closedCount: closedList.length,
    degradedCount: degradedList.length,
    maintenanceCount: maintenanceList.length,
    overallHealth,
    commands: allCommands,
    closedList,
    degradedList,
    maintenanceList,
  };
}
