import { prisma } from "../../core/database.js";

export const approvalRepository = {
  processApproval: async ({ requestId, actorId, action, note, nextStatus, ipAddress }) => {
    return prisma.$transaction(async (tx) => {
      // 1. Update the request status
      const request = await tx.request.update({
        where: { id: requestId },
        data: { status: nextStatus }
      });

      // 2. Add an approval log
      const log = await tx.approvalLog.create({
        data: {
          requestId,
          actorId,
          action,
          note
        }
      });

      // 3. Create an audit log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          module: "APPROVALS",
          action,
          target: request.code,
          ipAddress
        }
      });

      // 4. Create workflow notifications
      if (nextStatus === "APPROVED_BY_SUPERVISOR") {
        const financeAndAdmins = await tx.user.findMany({
          where: {
            role: {
              name: { in: ["finance", "admin"] }
            },
            active: true
          }
        });
        if (financeAndAdmins.length > 0) {
          await tx.notification.createMany({
            data: financeAndAdmins.map(u => ({
              userId: u.id,
              title: "Pengajuan Menunggu Verifikasi Finance",
              message: `Pengajuan ${request.code} - "${request.title}" disetujui oleh Supervisor dan kini menunggu tindakan Finance.`,
              read: false
            }))
          });
        }
      } else if (nextStatus === "APPROVED_BY_FINANCE") {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: "Pengajuan Disetujui",
            message: `Pengajuan ${request.code} - "${request.title}" Anda telah disetujui oleh Finance/Admin.`,
            read: false
          }
        });
      } else if (nextStatus === "REJECTED") {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: "Pengajuan Ditolak",
            message: `Pengajuan ${request.code} - "${request.title}" Anda telah ditolak. Catatan: ${note || "-"}`,
            read: false
          }
        });
      } else if (nextStatus === "NEED_REVISION") {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: "Pengajuan Memerlukan Revisi",
            message: `Pengajuan ${request.code} - "${request.title}" Anda memerlukan revisi. Catatan: ${note || "-"}`,
            read: false
          }
        });
      }

      return { request, log };
    });
  }
};
