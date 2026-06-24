import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

const USER_KEY = "finflow:user";
const listeners = new Set<() => void>();
let current: any = null;

const init = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) current = JSON.parse(raw);
  } catch {}
};
init();

export const authStore = {
  get user() { return current; },
  
  async login(email, password) {
    try {
      const data = await apiClient.auth.login(email, password);
      current = data.user;
      listeners.forEach(l => l());
      return data.user;
    } catch (err: any) {
      throw new Error(err.message || "Login failed");
    }
  },

  async setup(name, username, email, password) {
    try {
      const data = await apiClient.auth.setup(name, username, email, password);
      current = data.user;
      listeners.forEach(l => l());
      return data.user;
    } catch (err: any) {
      throw new Error(err.message || "Setup failed");
    }
  },

  async logout() {
    try {
      await apiClient.auth.logout();
    } catch {}
    current = null;
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
    return () => { unsub(); };
  }, []);
  
  return { 
    user: authStore.user, 
    login: authStore.login.bind(authStore), 
    setup: authStore.setup.bind(authStore), 
    logout: authStore.logout.bind(authStore) 
  };
}

export const can = (role: string | undefined, perm: string): boolean => {
  if (!role) return false;
  
  // Custom mapping of role names (lower cased) to permissions
  const map: Record<string, string[]> = {
    "users.manage": ["admin"],
    "settings.manage": ["admin"],
    "request.create": ["admin", "staff", "supervisor", "manager", "finance"],
    "request.approve": ["supervisor", "manager", "admin", "finance"],
    "finance.realize": ["finance", "admin", "supervisor"],
    "finance.verify": ["finance", "admin", "supervisor"],
    "audit.view": ["admin", "auditor", "finance"],
    "reports.view": ["admin", "finance", "manager", "supervisor", "auditor"],
    "inventory.manage": ["admin", "staff", "finance"],
  };
  
  return map[perm]?.includes(role.toLowerCase()) ?? true;
};
