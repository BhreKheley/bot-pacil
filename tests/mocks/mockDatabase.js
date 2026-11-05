/**
 * MockDatabase - In-memory database simulator for Pacil-Bot offline unit & integration testing.
 * Implements the database interface used across Pacil-Bot services and commands.
 */

function deepClone(value) {
  if (value === undefined || value === null) {
    return value;
  }
  try {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export class MockDatabase {
  constructor(initialData = {}) {
    this.store = new Map();
    this.expirationTimes = new Map();

    if (initialData && typeof initialData === 'object') {
      const entries = initialData instanceof Map ? initialData.entries() : Object.entries(initialData);
      for (const [k, v] of entries) {
        this.store.set(String(k), deepClone(v));
      }
    }
  }

  async get(key, defaultValue = null) {
    const k = String(key);
    if (this.expirationTimes.has(k)) {
      const expiry = this.expirationTimes.get(k);
      if (Date.now() > expiry) {
        this.store.delete(k);
        this.expirationTimes.delete(k);
        return defaultValue;
      }
    }

    if (!this.store.has(k)) {
      return defaultValue;
    }
    return deepClone(this.store.get(k));
  }

  async set(key, value, ttl = null) {
    const k = String(key);
    this.store.set(k, deepClone(value));

    if (typeof ttl === 'number' && ttl > 0) {
      this.expirationTimes.set(k, Date.now() + (ttl * 1000));
    } else {
      this.expirationTimes.delete(k);
    }
    return true;
  }

  async delete(key) {
    const k = String(key);
    this.expirationTimes.delete(k);
    return this.store.delete(k);
  }

  async has(key) {
    const k = String(key);
    if (this.expirationTimes.has(k)) {
      const expiry = this.expirationTimes.get(k);
      if (Date.now() > expiry) {
        this.store.delete(k);
        this.expirationTimes.delete(k);
        return false;
      }
    }
    return this.store.has(k);
  }

  async exists(key) {
    return this.has(key);
  }

  async list(prefix = '') {
    const p = String(prefix);
    const keys = [];
    const now = Date.now();

    for (const key of this.store.keys()) {
      if (key.startsWith(p)) {
        if (this.expirationTimes.has(key) && now > this.expirationTimes.get(key)) {
          this.store.delete(key);
          this.expirationTimes.delete(key);
          continue;
        }
        keys.push(key);
      }
    }
    return keys;
  }

  async increment(key, amount = 1) {
    const current = await this.get(key, 0);
    const numericCurrent = typeof current === 'number' ? current : 0;
    const newValue = numericCurrent + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }

  clear() {
    this.store.clear();
    this.expirationTimes.clear();
    return true;
  }

  getStatus() {
    return {
      initialized: true,
      connectionType: 'mock-memory',
      isDegraded: false,
      isAvailable: true,
      size: this.store.size,
    };
  }

  isDegraded() {
    return false;
  }

  isAvailable() {
    return true;
  }

  getConnectionType() {
    return 'mock-memory';
  }

  get size() {
    return this.store.size;
  }
}

export default MockDatabase;
