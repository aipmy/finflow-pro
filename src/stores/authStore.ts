import { useEffect, useState } from "react";
import { users } from "@/data/mockData";
import type { Role } from "@/data/mockData";

const KEY = "finapp:user";
const listeners = new Set<() => void>();
let current: typeof users[0] | null = null;

const init = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw);
  } catch {}
};
init();

export const authStore = {
  get user() { return current; },
  login(userId: string) {
    const u = users.find(x => x.id === userId);
    if (u) {
      current = u;
      localStorage.setItem(KEY, JSON.stringify(u));
      listeners.forEach(l => l());
    }
  },
  logout() {
    current = null;
    localStorage.removeItem(KEY);
    listeners.forEach(l => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAuth() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = authStore.subscribe(() => setTick(t => t + 1));
    return () => { unsub; };
  }, []);
  return { user: authStore.user, login: authStore.login.bind(authStore), logout: authStore.logout.bind(authStore) };
}

export const can = (role: Role | undefined, perm: string): boolean => {
  if (!role) return false;
  const map: Record<string, Role[]> = {
    "users.manage": ["admin"],
    "settings.manage": ["admin"],
    "request.create": ["admin", "staff", "supervisor", "manager", "finance"],
    "request.approve": ["supervisor", "manager", "admin"],
    "finance.realize": ["finance", "admin"],
    "audit.view": ["admin", "auditor", "finance"],
    "reports.view": ["admin", "finance", "manager", "supervisor", "auditor"],
    "inventory.manage": ["admin", "staff", "finance"],
  };
  return map[perm]?.includes(role) ?? true;
};
