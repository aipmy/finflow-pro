// Mock API client structured to mirror a NestJS-style backend.
// Swap the in-memory implementations for fetch() calls when wiring a real API.

import {
  requests as _requests, users as _users, items as _items,
  pettyCash as _pettyCash, auditLogs as _auditLogs,
  approvalLogs as _approvalLogs, inventoryMovements as _inventoryMovements,
  categories, departments, sites, monthlyTrend
} from "@/data/mockData";

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

export const apiClient = {
  // mirrors backend/src/modules/requests
  requests: {
    list: async () => { await delay(); return _requests; },
    get: async (id: string) => { await delay(); return _requests.find(r => r.id === id); },
    approve: async (_id: string, _note: string) => { await delay(); return { ok: true }; },
    reject: async (_id: string, _note: string) => { await delay(); return { ok: true }; },
    revise: async (_id: string, _note: string) => { await delay(); return { ok: true }; },
  },
  users: { list: async () => { await delay(); return _users; } },
  inventory: { list: async () => { await delay(); return _items; }, movements: async () => { await delay(); return _inventoryMovements; } },
  finance: { realize: async (_id: string, _amount: number) => { await delay(); return { ok: true }; } },
  pettyCash: { get: async () => { await delay(); return _pettyCash; } },
  audit: { list: async () => { await delay(); return _auditLogs; } },
  approvals: { list: async () => { await delay(); return _approvalLogs; } },
  meta: { categories, departments, sites, monthlyTrend },
};
