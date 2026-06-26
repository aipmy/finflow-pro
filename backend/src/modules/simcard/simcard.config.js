/**
 * In-memory configuration store for SIM card scraping.
 * This allows the frontend to toggle auto-scraping ON/OFF and change the interval.
 */

const scraperConfig = {
  enabled: true,
  intervalMinutes: 5, // Default: every 5 minutes
  lastSyncAt: null,
  isSyncing: false,
  lastSyncResult: null, // { success, count, error, durationMs }
};

export function getScraperConfig() {
  return { ...scraperConfig };
}

export function setScraperConfig({ enabled, intervalMinutes }) {
  if (typeof enabled === "boolean") {
    scraperConfig.enabled = enabled;
  }
  if (typeof intervalMinutes === "number" && intervalMinutes >= 1) {
    scraperConfig.intervalMinutes = intervalMinutes;
  }
}

export function setSyncStatus({ isSyncing, lastSyncAt, lastSyncResult }) {
  if (typeof isSyncing === "boolean") {
    scraperConfig.isSyncing = isSyncing;
  }
  if (lastSyncAt !== undefined) {
    scraperConfig.lastSyncAt = lastSyncAt;
  }
  if (lastSyncResult !== undefined) {
    scraperConfig.lastSyncResult = lastSyncResult;
  }
}
