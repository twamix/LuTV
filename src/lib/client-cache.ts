const prefix = 'lunatv:cache:';

export const ClientCache = {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(prefix + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as { expiresAt: number; value: T };
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        window.localStorage.removeItem(prefix + key);
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        prefix + key,
        JSON.stringify({ value, expiresAt: Date.now() + ttlSeconds * 1000 })
      );
    } catch {
      // Ignore storage quota and privacy-mode errors.
    }
  },
};
