import { prisma } from "../../core/database.js";

export const auditService = {
  log: async ({ userId, module, action, target, ipAddress }) => {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: userId || null,
          module,
          action,
          target: target ? String(target) : null,
          ipAddress: ipAddress || null,
        }
      });
    } catch (err) {
      // Don't throw to prevent blocking main flow due to logging errors
      console.error("Failed to write audit log:", err);
    }
  },

  list: async ({ limit = 50, offset = 0 } = {}) => {
    return prisma.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } }
          }
        }
      }
    });
  }
};
