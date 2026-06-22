import { requestRepository } from "../requests/request.repository.js";
import { approvalRepository } from "./approval.repository.js";

export const approvalService = {
  approve: async ({ requestId, note, user, ipAddress }) => {
    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    let nextStatus = "";

    // Workflow check
    if (request.status === "SUBMITTED") {
      // Supervisor, Manager, or Admin can approve SUBMITTED
      if (user.role !== "supervisor" && user.role !== "manager" && user.role !== "admin") {
        throw { status: 403, message: "Forbidden: You are not authorized to perform supervisor/manager approvals" };
      }
      nextStatus = "APPROVED_BY_SUPERVISOR";
    } else if (request.status === "APPROVED_BY_SUPERVISOR") {
      // Finance or Admin can approve APPROVED_BY_SUPERVISOR
      if (user.role !== "finance" && user.role !== "admin") {
        throw { status: 403, message: "Forbidden: You are not authorized to perform finance approvals" };
      }
      nextStatus = "APPROVED_BY_FINANCE";
    } else {
      throw { status: 400, message: `Cannot approve request in current status: ${request.status}` };
    }

    return approvalRepository.processApproval({
      requestId,
      actorId: user.userId,
      action: "APPROVE",
      note: note || "Approved",
      nextStatus,
      ipAddress
    });
  },

  reject: async ({ requestId, note, user, ipAddress }) => {
    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Reject can be done on SUBMITTED or APPROVED_BY_SUPERVISOR
    if (request.status !== "SUBMITTED" && request.status !== "APPROVED_BY_SUPERVISOR") {
      throw { status: 400, message: `Cannot reject request in current status: ${request.status}` };
    }

    if (request.status === "SUBMITTED" && user.role !== "supervisor" && user.role !== "manager" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Not authorized" };
    }

    if (request.status === "APPROVED_BY_SUPERVISOR" && user.role !== "finance" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Not authorized" };
    }

    return approvalRepository.processApproval({
      requestId,
      actorId: user.userId,
      action: "REJECT",
      note: note || "Rejected",
      nextStatus: "REJECTED",
      ipAddress
    });
  },

  revise: async ({ requestId, note, user, ipAddress }) => {
    const request = await requestRepository.get(requestId);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Revise can be done on SUBMITTED or APPROVED_BY_SUPERVISOR
    if (request.status !== "SUBMITTED" && request.status !== "APPROVED_BY_SUPERVISOR") {
      throw { status: 400, message: `Cannot request revision in current status: ${request.status}` };
    }

    if (request.status === "SUBMITTED" && user.role !== "supervisor" && user.role !== "manager" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Not authorized" };
    }

    if (request.status === "APPROVED_BY_SUPERVISOR" && user.role !== "finance" && user.role !== "admin") {
      throw { status: 403, message: "Forbidden: Not authorized" };
    }

    return approvalRepository.processApproval({
      requestId,
      actorId: user.userId,
      action: "REVISE",
      note: note || "Revision requested",
      nextStatus: "NEED_REVISION",
      ipAddress
    });
  }
};
