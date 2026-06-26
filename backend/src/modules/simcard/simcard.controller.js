import { getUsageData } from "./scraper.js";

export async function getSimcardUsage(req, res, next) {
  try {
    const dashboardId = req.query.dashboardId || "335";
    const msisdn = req.query.msisdn || "";

    console.log(`[SIMCARD CONTROLLER] Fetching usage data for dashboardId=${dashboardId}, msisdn=${msisdn}`);
    const data = await getUsageData(dashboardId, msisdn);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    next(error);
  }
}
