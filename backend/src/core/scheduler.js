import cron from "node-cron";
import { recurringRepository } from "../modules/recurring/recurring.repository.js";
import { requestRepository } from "../modules/requests/request.repository.js";
import { prisma } from "./database.js";

export const initScheduler = () => {
  // Run every day at 00:01 AM
  cron.schedule("1 0 * * *", async () => {
    console.log("[SCHEDULER] Running daily recurring requests generator...");
    try {
      await generateRecurringRequests();
    } catch (err) {
      console.error("[SCHEDULER] Error generating recurring requests:", err);
    }
  });

  console.log("[SCHEDULER] Scheduler initialized.");
};

export const generateRecurringRequests = async (targetDay = null, targetDayOfWeek = null) => {
  const now = new Date();
  const dayOfMonth = targetDay !== null ? targetDay : now.getDate();
  
  let dayOfWeek = targetDayOfWeek !== null ? targetDayOfWeek : now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7; // Map Sunday (0) to 7

  console.log(`[SCHEDULER] Finding active templates for day of month: ${dayOfMonth}, day of week: ${dayOfWeek}`);

  const activeTemplates = await recurringRepository.listAllActiveForSchedule(dayOfMonth, dayOfWeek);
  console.log(`[SCHEDULER] Found ${activeTemplates.length} active templates to process.`);

  for (const template of activeTemplates) {
    try {
      console.log(`[SCHEDULER] Processing template: "${template.title}" for user: ${template.creator.name}`);
      
      const requestData = {
        type: template.type,
        title: template.title,
        description: template.description || `Pengajuan rutin otomatis untuk ${template.title}`,
        departmentId: template.departmentId || template.creator.departmentId,
        siteId: template.siteId || template.creator.siteId,
        amount: template.amount,
        status: template.autoSubmit ? "SUBMITTED" : "DRAFT"
      };

      const items = template.items.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        itemId: null,
        unitId: null,
      }));

      const newRequest = await requestRepository.create(
        requestData,
        items,
        [], // no attachments
        template.creatorId,
        "127.0.0.1"
      );

      // Create a notification for the creator
      await prisma.notification.create({
        data: {
          userId: template.creatorId,
          title: template.autoSubmit ? "Pengajuan Rutin Terkirim" : "Pengajuan Rutin Berhasil Dibuat",
          message: template.autoSubmit
            ? `Pengajuan otomatis "${template.title}" dengan kode ${newRequest.code} telah diajukan langsung ke supervisor.`
            : `Pengajuan otomatis "${template.title}" dengan kode ${newRequest.code} telah berhasil dibuat sebagai DRAFT. Silakan periksa dan kirimkan.`,
          read: false
        }
      });

      console.log(`[SCHEDULER] Request generated successfully with code: ${newRequest.code}`);
    } catch (err) {
      console.error(`[SCHEDULER] Failed to process template "${template.title}" (ID: ${template.id}):`, err);
    }
  }
};
