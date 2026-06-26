import { prisma } from "../../core/database.js";
import { syncSimcardsToDatabase, getIndonesianMonthYear } from "./simcard.scheduler.js";

// GET /api/simcard/usage
export async function getSimcardUsage(req, res, next) {
  try {
    const { search, siteId, isCritical, periode } = req.query;

    const targetPeriode = periode || getIndonesianMonthYear();

    console.log(`[SIMCARD CONTROLLER] Querying database for periode="${targetPeriode}"`);

    // Define filters
    const whereClause = {};

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (search) {
      whereClause.OR = [
        { msisdn: { contains: search } },
        { label: { contains: search } },
        { grup: { contains: search } }
      ];
    }

    // Fetch simcards with their usage for target period
    const simcards = await prisma.simcard.findMany({
      where: whereClause,
      include: {
        site: true,
        usages: {
          where: {
            periode: targetPeriode
          }
        }
      }
    });

    // Map and calculate percent / critical statuses
    let result = simcards.map(card => {
      const usage = card.usages && card.usages[0] ? card.usages[0] : null;

      let kuotaPercent = 0;
      if (usage && usage.kuotaTotal > 0) {
        kuotaPercent = (Number(usage.kuotaUsed) / Number(usage.kuotaTotal)) * 100;
      }

      return {
        msisdn: card.msisdn,
        lokasi: card.label || "",
        grup: card.grup || "",
        site: card.site ? card.site.name : "",
        siteId: card.siteId || "",
        kuota_digunakan: usage ? `${usage.kuotaUsed} / ${usage.kuotaTotal} GB` : "0.0 / 10 GB",
        sisa_kuota: usage ? usage.kuotaLimitText : "10.0 GB",
        voice_digunakan: usage ? `${usage.voiceUsed} / ${usage.voiceTotal} Min` : "0 / 60 Min",
        sisa_voice: usage ? usage.voiceLimitText : "60 Min",
        sms_digunakan: usage ? `${usage.smsUsed} / ${usage.smsTotal} SMS` : "0 / 60 SMS",
        sisa_sms: usage ? usage.smsLimitText : "60 SMS",
        kuotaPercent: kuotaPercent,
        scrapedAt: usage ? usage.scrapedAt : null
      };
    });

    // Filter by critical status (usage > 90% or sisa kuota low)
    if (isCritical === "true") {
      result = result.filter(card => card.kuotaPercent >= 90);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/simcard/sync
export async function triggerManualSync(req, res, next) {
  try {
    console.log("[SIMCARD CONTROLLER] Manual synchronization triggered by user.");
    
    // Trigger sync in background or await it (await since user wants confirmation)
    const result = await syncSimcardsToDatabase();
    
    res.json({
      success: true,
      message: "Sinkronisasi database kartu SIM berhasil dilakukan.",
      count: result.count
    });
  } catch (error) {
    next(error);
  }
}
