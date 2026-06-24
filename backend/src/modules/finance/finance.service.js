import { requestRepository } from "../requests/request.repository.js";
import { financeRepository } from "./finance.repository.js";

export const financeService = {
  realize: async ({ requestId, realizedAmount, receiptUrl, notes, user, ipAddress }) => {
    // Only finance, admin, or supervisor can realize requests
    if (user.role !== "finance" && user.role !== "admin" && user.role !== "supervisor") {
      throw { status: 403, message: "Forbidden: Only Finance, Admin, or Supervisor can process realizations" };
    }

    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Must be in APPROVED_BY_FINANCE status
    if (request.status !== "APPROVED_BY_FINANCE" && request.status !== "PURCHASED") {
      throw { status: 400, message: `Cannot realize request in current status: ${request.status}` };
    }

    if (!realizedAmount || realizedAmount <= 0) {
      throw { status: 400, message: "Invalid realized amount" };
    }

    return financeRepository.createRealization({
      requestId,
      realizedAmount,
      receiptUrl,
      notes,
      userId: user.userId,
      ipAddress
    });
  },

  getPettyCash: async (user) => {
    // All roles can view petty cash details
    return financeRepository.getPettyCashData();
  },

  topUpPettyCash: async ({ amount, description, type, date, user }) => {
    if (user.role !== "finance" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Only Finance or Admin can create petty cash transactions" };
    }

    if (!amount || amount <= 0) {
      throw { status: 400, message: "Invalid transaction amount" };
    }

    return financeRepository.createPettyCashTransaction({
      amount,
      type: type || "IN",
      description: description || (type === "OUT" ? "Operational cash expense" : "Top up petty cash"),
      date: date ? new Date(date) : undefined
    });
  },

  updatePettyCashTransaction: async ({ id, amount, description, type, date, user }) => {
    if (user.role !== "finance" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Only Finance or Admin can edit petty cash transactions" };
    }

    if (!amount || amount <= 0) {
      throw { status: 400, message: "Invalid transaction amount" };
    }

    const tx = await financeRepository.getPettyCashTransaction(id);
    if (!tx) {
      throw { status: 404, message: "Transaction not found" };
    }

    if (tx.refRequestId && tx.refRequestId !== "-") {
      throw { status: 400, message: "Cannot edit request-based transactions" };
    }

    return financeRepository.updatePettyCashTransaction({
      id,
      amount,
      type: type || tx.type,
      description: description || tx.description,
      date: date ? new Date(date) : undefined
    });
  },

  deletePettyCashTransaction: async ({ id, user }) => {
    if (user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Only Admin can delete petty cash transactions" };
    }

    const tx = await financeRepository.getPettyCashTransaction(id);
    if (!tx) {
      throw { status: 404, message: "Transaction not found" };
    }

    if (tx.refRequestId && tx.refRequestId !== "-") {
      throw { status: 400, message: "Cannot delete request-based transactions" };
    }

    return financeRepository.deletePettyCashTransaction(id);
  },

  submitProof: async ({ requestId, proofs, actualAmount, user, ipAddress }) => {
    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Only the original requester can upload proof
    if (request.requesterId !== user.userId && user.role !== "admin") {
      throw { status: 403, message: "Hanya pengaju yang bisa upload bukti pertanggungjawaban" };
    }

    // Must be in REALIZED status
    if (request.status !== "REALIZED") {
      throw { status: 400, message: `Tidak bisa upload bukti pada status: ${request.status}` };
    }

    return financeRepository.submitProof({
      requestId,
      proofs: proofs || [],
      actualAmount,
      userId: user.userId,
      ipAddress
    });
  },

  verifyRealization: async ({ requestId, note, user, ipAddress }) => {
    if (user.role !== "finance" && user.role !== "admin" && user.role !== "supervisor") {
      throw { status: 403, message: "Forbidden: Hanya Finance, Admin, atau Supervisor yang bisa memverifikasi" };
    }

    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    if (request.status !== "WAITING_VERIFICATION") {
      throw { status: 400, message: `Tidak bisa verifikasi pada status: ${request.status}` };
    }

    return financeRepository.verifyRealization({
      requestId,
      note,
      userId: user.userId,
      ipAddress
    });
  },

  rejectVerification: async ({ requestId, note, user, ipAddress }) => {
    if (user.role !== "finance" && user.role !== "admin" && user.role !== "supervisor") {
      throw { status: 403, message: "Forbidden: Hanya Finance, Admin, atau Supervisor yang bisa menolak bukti" };
    }

    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    if (request.status !== "WAITING_VERIFICATION") {
      throw { status: 400, message: `Tidak bisa menolak bukti pada status: ${request.status}` };
    }

    if (!note) {
      throw { status: 400, message: "Catatan alasan penolakan wajib diisi" };
    }

    return financeRepository.rejectVerification({
      requestId,
      note,
      userId: user.userId,
      ipAddress
    });
  }
};
