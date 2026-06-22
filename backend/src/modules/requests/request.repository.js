import { prisma } from "../../core/database.js";

export const requestRepository = {
  list: async (filters, user) => {
    const where = {};

    // Apply basic filters
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.departmentId) where.departmentId = filters.departmentId;

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { title: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    // Role-based data scoping
    // Admin, Finance, and Auditor can see all requests
    if (user.role !== "admin" && user.role !== "finance" && user.role !== "auditor") {
      // Supervisor can see requests from their Site
      if (user.role === "supervisor") {
        where.siteId = user.siteId || "non-existent-id";
      }
      // Manager can see requests from their Department
      else if (user.role === "manager") {
        where.departmentId = user.departmentId || "non-existent-id";
      }
      // Staff/Teknisi can only see their own requests
      else {
        where.requesterId = user.userId;
      }
    }

    return prisma.request.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        department: true,
        site: true,
        category: true,
        vendor: true,
        financeRealization: true,
        items: {
          include: {
            category: true,
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        realizationProofs: {
          include: {
            uploadedBy: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  get: async (id) => {
    return prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        department: true,
        site: true,
        category: true,
        vendor: true,
        items: {
          include: {
            item: true,
            unit: true,
            category: true,
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        attachments: true,
        approvalLogs: {
          include: {
            actor: { select: { id: true, name: true, email: true, role: { select: { name: true } } } }
          },
          orderBy: { createdAt: "asc" }
        },
        financeRealization: true,
        realizationProofs: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
            requestItem: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: "asc" }
        },
      }
    });
  },

  getNextCode: async () => {
    const currentYear = new Date().getFullYear();
    
    // Find the latest request for the current year
    const latest = await prisma.request.findFirst({
      where: {
        code: { startsWith: `REQ-${currentYear}-` }
      },
      orderBy: { code: "desc" }
    });

    let nextNum = 1;
    if (latest) {
      const parts = latest.code.split("-");
      const currentNum = parseInt(parts[2], 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    const paddedNum = String(nextNum).padStart(3, "0");
    return `REQ-${currentYear}-${paddedNum}`;
  },

  create: async (data, items, attachments, userId, ipAddress) => {
    return prisma.$transaction(async (tx) => {
      // 1. Generate request code
      const currentYear = new Date().getFullYear();
      const latest = await tx.request.findFirst({
        where: { code: { startsWith: `REQ-${currentYear}-` } },
        orderBy: { code: "desc" }
      });
      let nextNum = 1;
      if (latest) {
        const parts = latest.code.split("-");
        const currentNum = parseInt(parts[2], 10);
        if (!isNaN(currentNum)) nextNum = currentNum + 1;
      }
      const code = `REQ-${currentYear}-${String(nextNum).padStart(3, "0")}`;

      // 2. Create the main request record
      const request = await tx.request.create({
        data: {
          code,
          type: data.type,
          title: data.title,
          description: data.description,
          requesterId: userId,
          departmentId: data.departmentId,
          siteId: data.siteId,
          categoryId: data.categoryId,
          vendorId: data.vendorId || null,
          amount: data.amount,
          status: data.status || "DRAFT",
          departureDate: data.departureDate ? new Date(data.departureDate) : null,
          returnDate: data.returnDate ? new Date(data.returnDate) : null
        }
      });

      // 3. Create items
      if (items && items.length > 0) {
        const now = Date.now();
        await tx.requestItem.createMany({
          data: items.map((item, index) => ({
            requestId: request.id,
            itemId: item.itemId || null,
            name: item.name,
            qty: item.qty,
            unitId: item.unitId || null,
            price: item.price,
            categoryId: item.categoryId || null,
            createdAt: new Date(now + index * 1000)
          }))
        });
      }

      // 4. Create attachments
      if (attachments && attachments.length > 0) {
        await tx.requestAttachment.createMany({
          data: attachments.map(att => ({
            requestId: request.id,
            name: att.name,
            url: att.url,
            size: att.size || null
          }))
        });
      }

      // 5. Add initial approval log if it is submitted immediately
      if (request.status === "SUBMITTED") {
        await tx.approvalLog.create({
          data: {
            requestId: request.id,
            actorId: userId,
            action: "SUBMIT",
            note: "Request submitted"
          }
        });
      }

      // 6. Add audit log
      await tx.auditLog.create({
        data: {
          userId,
          module: "REQUESTS",
          action: "CREATE",
          target: request.code,
          ipAddress
        }
      });

      return request;
    });
  },

  update: async (id, data, items, attachments, userId, ipAddress) => {
    return prisma.$transaction(async (tx) => {
      // 1. Update the request main fields
      const request = await tx.request.update({
        where: { id },
        data: {
          type: data.type,
          title: data.title,
          description: data.description,
          departmentId: data.departmentId,
          siteId: data.siteId,
          categoryId: data.categoryId,
          vendorId: data.vendorId || null,
          amount: data.amount,
          status: data.status, // Keep status if updating draft, or set to SUBMITTED if user submits it
          departureDate: data.departureDate ? new Date(data.departureDate) : null,
          returnDate: data.returnDate ? new Date(data.returnDate) : null
        }
      });

      // 2. Sync items (delete existing, write new)
      await tx.requestItem.deleteMany({ where: { requestId: id } });
      if (items && items.length > 0) {
        const now = Date.now();
        await tx.requestItem.createMany({
          data: items.map((item, index) => ({
            requestId: id,
            itemId: item.itemId || null,
            name: item.name,
            qty: item.qty,
            unitId: item.unitId || null,
            price: item.price,
            categoryId: item.categoryId || null,
            createdAt: new Date(now + index * 1000)
          }))
        });
      }

      // 3. Sync attachments (delete existing, write new)
      await tx.requestAttachment.deleteMany({ where: { requestId: id } });
      if (attachments && attachments.length > 0) {
        await tx.requestAttachment.createMany({
          data: attachments.map(att => ({
            requestId: id,
            name: att.name,
            url: att.url,
            size: att.size || null
          }))
        });
      }

      // 4. Log actions
      if (data.status === "SUBMITTED") {
        await tx.approvalLog.create({
          data: {
            requestId: id,
            actorId: userId,
            action: "SUBMIT",
            note: "Request submitted"
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          module: "REQUESTS",
          action: "UPDATE",
          target: request.code,
          ipAddress
        }
      });

      return request;
    });
  },

  delete: async (id, userId, ipAddress) => {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return null;

    await prisma.$transaction(async (tx) => {
      await tx.request.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          module: "REQUESTS",
          action: "DELETE",
          target: request.code,
          ipAddress
        }
      });
    });

    return request;
  }
};
