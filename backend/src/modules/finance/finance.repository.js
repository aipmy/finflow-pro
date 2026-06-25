import { prisma } from "../../core/database.js";

export const financeRepository = {
  createRealization: async ({ requestId, realizedAmount, receiptUrl, notes, userId, ipAddress }) => {
    return prisma.$transaction(async (tx) => {
      // 1. Get the request details to check type and code
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });
      if (!request) throw new Error("Request not found");

      // 2. Create the realization record
      const realization = await tx.financeRealization.create({
        data: {
          requestId,
          realizedAmount,
          receiptUrl,
          status: "PAID",
          notes
        }
      });

      // 3. Update request status to REALIZED (or CLOSED)
      await tx.request.update({
        where: { id: requestId },
        data: { status: "REALIZED" }
      });

      // 4. If request type is PETTY_CASH, record OUT transaction. If TOP_UP_PETTY_CASH, record IN transaction.
      if (request.type === "PETTY_CASH") {
        await tx.pettyCashTransaction.create({
          data: {
            amount: realizedAmount,
            type: "OUT",
            description: `Realisasi untuk pengajuan ${request.code}: ${request.title}`,
            refRequestId: request.code
          }
        });
      } else if (request.type === "TOP_UP_PETTY_CASH") {
        await tx.pettyCashTransaction.create({
          data: {
            amount: realizedAmount,
            type: "IN",
            description: `Top Up Petty Cash via pengajuan ${request.code}: ${request.title}`,
            refRequestId: request.code
          }
        });
      }

      // 5. Create approval log for the realization action
      await tx.approvalLog.create({
        data: {
          requestId,
          actorId: userId,
          action: "APPROVE", // Mark as realization approval
          note: `Realized amount: ${realizedAmount}. Notes: ${notes || "No notes"}`
        }
      });

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          module: "FINANCE",
          action: "REALIZE",
          target: request.code,
          ipAddress
        }
      });

      // 7. Notify requester
      await tx.notification.create({
        data: {
          userId: request.requesterId,
          title: "Dana Pengajuan Direalisasikan",
          message: `Dana untuk pengajuan ${request.code} - "${request.title}" senilai Rp ${Number(realizedAmount).toLocaleString('id-ID')} telah direalisasikan/dibayarkan.`,
          read: false
        }
      });

      return realization;
    });
  },

  getPettyCashData: async () => {
    const transactions = await prisma.pettyCashTransaction.findMany({
      orderBy: { createdAt: "desc" }
    });

    const requestCodes = transactions.map(t => t.refRequestId).filter(Boolean);
    const requests = await prisma.request.findMany({
      where: { code: { in: requestCodes } },
      include: {
        department: true,
        requester: true,
        items: {
          include: {
            unit: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    const requestMap = {};
    requests.forEach(r => {
      requestMap[r.code] = {
        id: r.id,
        title: r.title,
        department: r.department?.name,
        requester: r.requester?.name,
        items: r.items.map(it => ({
          name: it.name,
          qty: it.qty,
          price: Number(it.price),
          unit: it.unit?.name
        }))
      };
    });

    const enrichedTransactions = transactions.map(t => ({
      ...t,
      request: t.refRequestId ? (requestMap[t.refRequestId] || null) : null
    }));

    const initial = transactions
      .filter(t => t.type === "IN")
      .reduce((acc, t) => acc + Number(t.amount), 0);
    
    // Calculate balance: 0 + IN - OUT
    const balance = transactions.reduce((acc, tx) => {
      const amt = Number(tx.amount);
      if (tx.type === "IN") return acc + amt;
      if (tx.type === "OUT") return acc - amt;
      return acc;
    }, 0);

    return {
      initial,
      balance,
      transactions: enrichedTransactions
    };
  },

  createPettyCashTransaction: async ({ amount, type, description, date }) => {
    return prisma.pettyCashTransaction.create({
      data: {
        amount,
        type,
        description,
        ...(date && { date })
      }
    });
  },

  getPettyCashTransaction: async (id) => {
    return prisma.pettyCashTransaction.findUnique({
      where: { id }
    });
  },

  updatePettyCashTransaction: async ({ id, amount, type, description, date }) => {
    return prisma.pettyCashTransaction.update({
      where: { id },
      data: {
        amount,
        type,
        description,
        ...(date && { date })
      }
    });
  },

  deletePettyCashTransaction: async (id) => {
    return prisma.pettyCashTransaction.delete({
      where: { id }
    });
  },

  submitProof: async ({ requestId, proofs, actualAmount, userId, ipAddress }) => {
    return prisma.$transaction(async (tx) => {
      // Create proof records
      for (const proof of proofs) {
        await tx.realizationProof.create({
          data: {
            requestId,
            fileUrl: proof.fileUrl,
            fileName: proof.fileName,
            description: proof.description || null,
            uploadedById: userId,
            requestItemId: proof.requestItemId || null,
            isRefundProof: proof.isRefundProof || false
          }
        });
      }

      // Update request status to WAITING_VERIFICATION and set actualAmount
      await tx.request.update({
        where: { id: requestId },
        data: { 
          status: "WAITING_VERIFICATION",
          actualAmount: actualAmount !== undefined ? actualAmount : null
        }
      });

      // Create approval log
      await tx.approvalLog.create({
        data: {
          requestId,
          actorId: userId,
          action: "SUBMIT_PROOF",
          note: `Uploaded ${proofs.length} proof file(s)`
        }
      });

      // Audit log
      const request = await tx.request.findUnique({ where: { id: requestId } });
      await tx.auditLog.create({
        data: {
          userId,
          module: "FINANCE",
          action: "SUBMIT_PROOF",
          target: request?.code || requestId,
          ipAddress
        }
      });

      // Notify Finance & Admin
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
            title: "Bukti Pertanggungjawaban Baru",
            message: `Bukti pertanggungjawaban diunggah untuk pengajuan ${request?.code || ''} - "${request?.title || ''}" dan menunggu verifikasi.`,
            read: false
          }))
        });
      }

      return { success: true };
    });
  },

  verifyRealization: async ({ requestId, note, userId, ipAddress }) => {
    return prisma.$transaction(async (tx) => {
      // Update request status to CLOSED
      await tx.request.update({
        where: { id: requestId },
        data: { status: "CLOSED" }
      });

      // Create approval log
      await tx.approvalLog.create({
        data: {
          requestId,
          actorId: userId,
          action: "VERIFY",
          note: note || "Bukti pertanggungjawaban diverifikasi"
        }
      });

      // Audit log
      const request = await tx.request.findUnique({ where: { id: requestId } });
      await tx.auditLog.create({
        data: {
          userId,
          module: "FINANCE",
          action: "VERIFY_REALIZATION",
          target: request?.code || requestId,
          ipAddress
        }
      });

      // Notify requester
      if (request) {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: "Pertanggungjawaban Terverifikasi",
            message: `Bukti pertanggungjawaban untuk pengajuan ${request.code} - "${request.title}" telah diverifikasi dan pengajuan ditutup (Closed).`,
            read: false
          }
        });
      }

      return { success: true };
    });
  },

  rejectVerification: async ({ requestId, note, userId, ipAddress }) => {
    return prisma.$transaction(async (tx) => {
      // Delete existing proofs so requester must re-upload
      await tx.realizationProof.deleteMany({
        where: { requestId }
      });

      // Revert status back to REALIZED
      await tx.request.update({
        where: { id: requestId },
        data: { status: "REALIZED" }
      });

      // Create approval log
      await tx.approvalLog.create({
        data: {
          requestId,
          actorId: userId,
          action: "REJECT_PROOF",
          note: note || "Bukti pertanggungjawaban ditolak, upload ulang"
        }
      });

      // Audit log
      const request = await tx.request.findUnique({ where: { id: requestId } });
      await tx.auditLog.create({
        data: {
          userId,
          module: "FINANCE",
          action: "REJECT_VERIFICATION",
          target: request?.code || requestId,
          ipAddress
        }
      });

      // Notify requester
      if (request) {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: "Bukti Pertanggungjawaban Ditolak",
            message: `Bukti pertanggungjawaban untuk pengajuan ${request.code} - "${request.title}" ditolak. Silakan unggah bukti yang benar. Catatan: ${note || "-"}`,
            read: false
          }
        });
      }

      return { success: true };
    });
  }
};
