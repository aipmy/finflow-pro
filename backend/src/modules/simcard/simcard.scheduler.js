import cron from "node-cron";
import { getUsageData } from "./scraper.js";
import { prisma } from "../../core/database.js";

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
  console.log("[SIMCARD SCHEDULER] Starting SIM Card usage synchronization...");
  try {
    const rawData = await getUsageData("335", null);
    console.log(`[SIMCARD SCHEDULER] Scraper retrieved ${rawData.length} simcards.`);

    const currentPeriode = getIndonesianMonthYear();

    for (const card of rawData) {
      if (card.error) {
        console.error(`[SIMCARD SCHEDULER] Skipping ${card.msisdn} due to scraper error: ${card.error}`);
        continue;
      }

      // 1. Try to find matching Site by name (lokasi)
      let siteId = null;
      if (card.lokasi) {
        const matchingSite = await prisma.site.findFirst({
          where: {
            name: {
              contains: card.lokasi
            }
          }
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
    }

    console.log("[SIMCARD SCHEDULER] SIM Card usage synchronization completed successfully.");
    return { success: true, count: rawData.length };
  } catch (error) {
    console.error("[SIMCARD SCHEDULER] Synchronization failed:", error);
    throw error;
  }
}

// Initialize cron scheduler (runs every day at 01:00 AM)
export function initSimcardScheduler() {
  cron.schedule("0 1 * * *", () => {
    syncSimcardsToDatabase().catch(err => {
      console.error("[SIMCARD CRON] Error executing sync:", err);
    });
  });
  console.log("[SIMCARD SCHEDULER] Registered SIM card sync cron job (daily at 01:00 AM)");

  // Run sync on startup in background IF it has not been synced today
  const runStartupSync = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastSync = await prisma.simcardUsage.findFirst({
        where: {
          scrapedAt: {
            gte: today
          }
        }
      });

      if (!lastSync) {
        console.log("[SIMCARD SCHEDULER] No sync detected for today. Running automatic startup sync in background...");
        syncSimcardsToDatabase().catch(err => {
          console.error("[SIMCARD SCHEDULER] Error in automatic startup sync:", err);
        });
      } else {
        console.log("[SIMCARD SCHEDULER] SIM cards already synced today. Skipping startup sync.");
      }
    } catch (err) {
      console.error("[SIMCARD SCHEDULER] Failed to check last sync on startup:", err);
    }
  };

  runStartupSync();
}
