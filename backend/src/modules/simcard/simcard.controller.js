import { prisma } from "../../core/database.js";
import { syncSimcardsToDatabase, getIndonesianMonthYear, restartScheduler } from "./simcard.scheduler.js";
import { getScraperConfig, setScraperConfig } from "./simcard.config.js";

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
      count: result.count,
      durationMs: result.durationMs
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/simcard/usage/:msisdn/history
export async function getSimcardHistory(req, res, next) {
  try {
    const { msisdn } = req.params;
    const simcard = await prisma.simcard.findUnique({
      where: { msisdn },
      include: {
        usages: {
          orderBy: {
            scrapedAt: "asc"
          }
        }
      }
    });

    if (!simcard) {
      return res.status(404).json({ error: { message: "SIM card not found" } });
    }

    const history = simcard.usages.map(u => ({
      periode: u.periode,
      kuotaUsed: Number(u.kuotaUsed),
      kuotaTotal: Number(u.kuotaTotal),
      voiceUsed: u.voiceUsed,
      smsUsed: u.smsUsed,
      scrapedAt: u.scrapedAt
    }));

    history.sort((a, b) => new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime());

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/simcard/scraper-status
export async function getScraperStatus(req, res, next) {
  try {
    const config = getScraperConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/simcard/scraper-config
export async function updateScraperConfig(req, res, next) {
  try {
    const { enabled, intervalMinutes } = req.body;

    // Validate intervalMinutes
    if (intervalMinutes !== undefined && (typeof intervalMinutes !== "number" || intervalMinutes < 1 || intervalMinutes > 1440)) {
      return res.status(400).json({
        success: false,
        error: { message: "intervalMinutes harus antara 1 dan 1440 (24 jam)" }
      });
    }

    setScraperConfig({ enabled, intervalMinutes });
    restartScheduler();

    const newConfig = getScraperConfig();
    console.log(`[SIMCARD CONTROLLER] Scraper config updated: enabled=${newConfig.enabled}, interval=${newConfig.intervalMinutes}min`);

    res.json({
      success: true,
      message: "Konfigurasi scraper berhasil diperbarui.",
      data: newConfig
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/simcard/overview
export async function getSimcardOverview(req, res, next) {
  try {
    const trendFilter = req.query.trendFilter || "1year";
    const currentPeriode = req.query.periode || getIndonesianMonthYear();

    // Get all simcards with current usage
    const simcards = await prisma.simcard.findMany({
      include: {
        site: true,
        usages: {
          where: { periode: currentPeriode }
        }
      }
    });

    // Summary stats
    let totalModem = simcards.length;
    let totalUsedGB = 0;
    let totalAllocatedGB = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let safeCount = 0;

    // Per-group usage
    const grupMap = {};
    // Top usage cards
    const cardUsages = [];

    for (const card of simcards) {
      const usage = card.usages && card.usages[0] ? card.usages[0] : null;
      const used = usage ? Number(usage.kuotaUsed) : 0;
      const total = usage ? Number(usage.kuotaTotal) : 10;
      const percent = total > 0 ? (used / total) * 100 : 0;

      totalUsedGB += used;
      totalAllocatedGB += total;

      if (percent >= 90) criticalCount++;
      else if (percent >= 70) warningCount++;
      else safeCount++;

      // Group aggregation
      const grup = card.grup || "Lainnya";
      if (!grupMap[grup]) {
        grupMap[grup] = { grup, totalUsed: 0, totalAllocated: 0, count: 0 };
      }
      grupMap[grup].totalUsed += used;
      grupMap[grup].totalAllocated += total;
      grupMap[grup].count += 1;

      cardUsages.push({
        msisdn: card.msisdn,
        lokasi: card.label || "",
        grup: card.grup || "",
        site: card.site ? card.site.name : "",
        used,
        total,
        percent
      });
    }

    // Top 10 highest usage
    const top10 = cardUsages
      .sort((a, b) => b.used - a.used)
      .slice(0, 10);

    // Per-group breakdown
    const perGrup = Object.values(grupMap).sort((a, b) => b.totalUsed - a.totalUsed);

    // Monthly vs Weekly trend
    let monthlyTrend = [];

    if (trendFilter === "1year") {
      // Generate last 12 months
      const indonesianMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const currentDate = new Date();
      const last12Months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        last12Months.push(`${indonesianMonths[d.getMonth()]} ${d.getFullYear()}`);
      }

      // Initialize periodeMap with 0 for all 12 months
      const periodeMap = {};
      last12Months.forEach(p => {
        periodeMap[p] = { periode: p, totalUsed: 0, totalAllocated: 0, count: 0 };
      });

      // Monthly trends (all periods aggregated)
      const allUsages = await prisma.simcardUsage.findMany({
        where: {
          periode: { in: last12Months }
        },
        select: {
          periode: true,
          kuotaUsed: true,
          kuotaTotal: true
        }
      });

      // Aggregate by periode
      for (const u of allUsages) {
        if (periodeMap[u.periode]) {
          periodeMap[u.periode].totalUsed += Number(u.kuotaUsed);
          periodeMap[u.periode].totalAllocated += Number(u.kuotaTotal);
          periodeMap[u.periode].count += 1;
        }
      }

      // Map back to ordered array
      monthlyTrend = last12Months.map(p => periodeMap[p]);
    } else if (trendFilter.startsWith("daily_")) {
      // Daily trends for specific month
      const monthMap = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
      const rawMonthYear = trendFilter.substring(6); // e.g. "Juli 2026"
      const parts = rawMonthYear.split(" ");
      const mName = parts[0];
      const yStr = parts[1];
      const mStr = monthMap[mName] || "01";
      const prefix = `${yStr}-${mStr}`;
      
      const logs = await prisma.simcardDailyLog.findMany({
        where: { date: { startsWith: prefix } },
        select: { simcardId: true, date: true, kuotaUsed: true, kuotaTotal: true }
      });
      
      const dateMap = {};
      for (const log of logs) {
        if (!dateMap[log.date]) {
          const dayPart = log.date.split("-")[2];
          const label = `${dayPart} ${mName.substring(0, 3)}`;
          dateMap[log.date] = { periode: label, totalUsed: 0, totalAllocated: 0, count: 0, rawDate: log.date };
        }
        dateMap[log.date].totalUsed += Number(log.kuotaUsed);
        dateMap[log.date].totalAllocated += Number(log.kuotaTotal);
        dateMap[log.date].count += 1;
      }
      
      monthlyTrend = Object.values(dateMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    } else {
      // Weekly trends for specific month
      const monthMap = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
      const parts = trendFilter.split(" ");
      const mName = parts[0];
      const yStr = parts[1];
      const mStr = monthMap[mName] || "01";
      const prefix = `${yStr}-${mStr}`;
      
      const logs = await prisma.simcardDailyLog.findMany({
        where: { date: { startsWith: prefix } },
        select: { simcardId: true, date: true, kuotaUsed: true, kuotaTotal: true }
      });
      
      const maxPerSimWeek = {}; 
      for (const log of logs) {
        const day = parseInt(log.date.split("-")[2], 10);
        let week = "Minggu 4";
        if (day <= 7) week = "Minggu 1";
        else if (day <= 14) week = "Minggu 2";
        else if (day <= 21) week = "Minggu 3";
        
        const key = `${log.simcardId}_${week}`;
        const used = Number(log.kuotaUsed);
        const total = Number(log.kuotaTotal);
        if (!maxPerSimWeek[key] || used > maxPerSimWeek[key].used) {
          maxPerSimWeek[key] = { week, used, total };
        }
      }

      const weekMap = {
        "Minggu 1": { periode: "Minggu 1", totalUsed: 0, totalAllocated: 0, count: 0 },
        "Minggu 2": { periode: "Minggu 2", totalUsed: 0, totalAllocated: 0, count: 0 },
        "Minggu 3": { periode: "Minggu 3", totalUsed: 0, totalAllocated: 0, count: 0 },
        "Minggu 4": { periode: "Minggu 4", totalUsed: 0, totalAllocated: 0, count: 0 }
      };

      for (const val of Object.values(maxPerSimWeek)) {
        weekMap[val.week].totalUsed += val.used;
        weekMap[val.week].totalAllocated += val.total;
        weekMap[val.week].count += 1;
      }
      
      monthlyTrend = Object.values(weekMap).filter(w => w.count > 0);
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalModem,
          totalUsedGB: parseFloat(totalUsedGB.toFixed(2)),
          totalAllocatedGB: parseFloat(totalAllocatedGB.toFixed(2)),
          criticalCount,
          warningCount,
          safeCount
        },
        monthlyTrend,
        perGrup,
        top10
      }
    });
  } catch (error) {
    next(error);
  }
}
