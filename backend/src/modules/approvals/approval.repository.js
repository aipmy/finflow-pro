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

      return { request, log };
    });
  }
};
