import { getUsageData } from "./scraper.js";
import { prisma } from "../../core/database.js";
import { getScraperConfig, setSyncStatus } from "./simcard.config.js";

// Helper to get Indonesian Month Year
export const getIndonesianMonthYear = () => {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const date = new Date();
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Main function to sync scraper data into database
export async function syncSimcardsToDatabase() {
  const config = getScraperConfig();

  // Prevent concurrent syncs
  if (config.isSyncing) {
    console.log("[SIMCARD SCHEDULER] Sync already in progress. Skipping.");
    return { success: false, skipped: true, reason: "already_syncing" };
  }

  setSyncStatus({ isSyncing: true });
  const startTime = Date.now();

  console.log("[SIMCARD SCHEDULER] Starting SIM Card usage synchronization...");
  try {
    const rawData = await getUsageData("335", null);
    console.log(`[SIMCARD SCHEDULER] Scraper retrieved ${rawData.length} simcards.`);

    const currentPeriode = getIndonesianMonthYear();
    const allSites = await prisma.site.findMany();

    for (const card of rawData) {
      if (card.error) {
        console.error(`[SIMCARD SCHEDULER] Skipping ${card.msisdn} due to scraper error: ${card.error}`);
        continue;
      }

      // 1. Try to find matching Site by looking for existing site names within the location label
      let siteId = null;
      if (card.lokasi) {
        const matchingSite = allSites.find(s => {
          const sName = s.name.toLowerCase();
          const targetName = card.lokasi.toLowerCase();
          return targetName.includes(sName);
        });

        if (matchingSite) {
          siteId = matchingSite.id;
        }
      }

      // 2. Upsert Simcard
      const simcard = await prisma.simcard.upsert({
        where: { msisdn: card.msisdn },
        update: {
          label: card.lokasi,
          grup: card.grup,
          siteId: siteId
        },
        create: {
          msisdn: card.msisdn,
          label: card.lokasi,
          grup: card.grup,
          siteId: siteId
        }
      });

      // Helper parser functions
      const parseDecimal = (valStr) => {
        if (!valStr || valStr === "Tidak Ditemukan") return 0;
        const matches = valStr.match(/([\d.]+)/);
        return matches ? parseFloat(matches[1]) : 0;
      };

      const parseIntVal = (valStr) => {
        if (!valStr || valStr === "Tidak Ditemukan") return 0;
        const matches = valStr.match(/(\d+)/);
        return matches ? parseInt(matches[1]) : 0;
      };

      // Parsing Quotas
      // Data Quota e.g. "0.0 / 10 GB" -> used: 0.0, total: 10
      const dataParts = card.kuota_digunakan ? card.kuota_digunakan.match(/([\d.]+)/g) : null;
      const dataUsed = dataParts && dataParts[0] ? parseFloat(dataParts[0]) : 0;
      const dataTotal = dataParts && dataParts[1] ? parseFloat(dataParts[1]) : 10;

      // Voice Quota e.g. "0 / 60 Min" -> used: 0, total: 60
      const voiceParts = card.voice_digunakan ? card.voice_digunakan.match(/(\d+)/g) : null;
      const voiceUsed = voiceParts && voiceParts[0] ? parseInt(voiceParts[0]) : 0;
      const voiceTotal = voiceParts && voiceParts[1] ? parseInt(voiceParts[1]) : 60;

      // SMS Quota e.g. "0 / 60 SMS" -> used: 0, total: 60
      const smsParts = card.sms_digunakan ? card.sms_digunakan.match(/(\d+)/g) : null;
      const smsUsed = smsParts && smsParts[0] ? parseInt(smsParts[0]) : 0;
      const smsTotal = smsParts && smsParts[1] ? parseInt(smsParts[1]) : 60;

      // 3. Upsert SimcardUsage for current period
      await prisma.simcardUsage.upsert({
        where: {
          simcardId_periode: {
            simcardId: simcard.id,
            periode: currentPeriode
          }
        },
        update: {
          kuotaUsed: dataUsed,
          kuotaTotal: dataTotal,
          kuotaLimitText: card.sisa_kuota,
          voiceUsed: voiceUsed,
          voiceTotal: voiceTotal,
          voiceLimitText: card.sisa_voice,
          smsUsed: smsUsed,
          smsTotal: smsTotal,
          smsLimitText: card.sisa_sms,
          scrapedAt: new Date()
        },
        create: {
          simcardId: simcard.id,
          periode: currentPeriode,
          kuotaUsed: dataUsed,
          kuotaTotal: dataTotal,
          kuotaLimitText: card.sisa_kuota,
          voiceUsed: voiceUsed,
          voiceTotal: voiceTotal,
          voiceLimitText: card.sisa_voice,
          smsUsed: smsUsed,
          smsTotal: smsTotal,
          smsLimitText: card.sisa_sms,
          scrapedAt: new Date()
        }
      });

      // 4. Upsert SimcardDailyLog for today
      const todayString = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time format roughly
      await prisma.simcardDailyLog.upsert({
        where: {
          simcardId_date: {
            simcardId: simcard.id,
            date: todayString
          }
        },
        update: {
          kuotaUsed: dataUsed,
          kuotaTotal: dataTotal
        },
        create: {
          simcardId: simcard.id,
          date: todayString,
          kuotaUsed: dataUsed,
          kuotaTotal: dataTotal
        }
      });
    }

    const durationMs = Date.now() - startTime;
    console.log(`[SIMCARD SCHEDULER] Sync completed successfully in ${(durationMs / 1000).toFixed(1)}s.`);

    setSyncStatus({
      isSyncing: false,
      lastSyncAt: new Date(),
      lastSyncResult: { success: true, count: rawData.length, durationMs }
    });

    return { success: true, count: rawData.length, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[SIMCARD SCHEDULER] Synchronization failed:", error);

    setSyncStatus({
      isSyncing: false,
      lastSyncAt: new Date(),
      lastSyncResult: { success: false, error: error.message, durationMs }
    });

    throw error;
  }
}

// Scheduler management
let schedulerInterval = null;

function runScheduledSync() {
  const config = getScraperConfig();

  if (!config.enabled) {
    console.log("[SIMCARD SCHEDULER] Auto-scraping is disabled. Skipping scheduled sync.");
    return;
  }

  syncSimcardsToDatabase().catch(err => {
    console.error("[SIMCARD SCHEDULER] Error in scheduled sync:", err);
  });
}

export function startScheduler() {
  const config = getScraperConfig();
  const intervalMs = config.intervalMinutes * 60 * 1000;

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  schedulerInterval = setInterval(runScheduledSync, intervalMs);
  console.log(`[SIMCARD SCHEDULER] Auto-scraping started (every ${config.intervalMinutes} min, enabled=${config.enabled}).`);
}

export function restartScheduler() {
  console.log("[SIMCARD SCHEDULER] Restarting scheduler with new config...");
  startScheduler();
}

// Initialize scheduler
export function initSimcardScheduler() {
  startScheduler();

  // Run sync on startup in background IF it has not been synced recently
  const runStartupSync = async () => {
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

      const lastSync = await prisma.simcardUsage.findFirst({
        where: {
          scrapedAt: {
            gte: thirtyMinAgo
          }
        }
      });

      if (!lastSync) {
        console.log("[SIMCARD SCHEDULER] No recent sync detected. Running automatic startup sync...");
        syncSimcardsToDatabase().catch(err => {
          console.error("[SIMCARD SCHEDULER] Error in startup sync:", err);
        });
      } else {
        console.log("[SIMCARD SCHEDULER] Recent sync found. Skipping startup sync.");
      }
    } catch (err) {
      console.error("[SIMCARD SCHEDULER] Failed to check last sync on startup:", err);
    }
  };

  runStartupSync();
}
