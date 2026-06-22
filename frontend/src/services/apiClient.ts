const API_BASE = "/api";

// Helper to get local tokens
const getAccessToken = () => localStorage.getItem("finflow:access_token");
const getRefreshToken = () => localStorage.getItem("finflow:refresh_token");

const setTokens = (accessToken: string, refreshToken: string, user: any) => {
  localStorage.setItem("finflow:access_token", accessToken);
  localStorage.setItem("finflow:refresh_token", refreshToken);
  localStorage.setItem("finflow:user", JSON.stringify(user));
};

const clearTokens = () => {
  localStorage.removeItem("finflow:access_token");
  localStorage.removeItem("finflow:refresh_token");
  localStorage.removeItem("finflow:user");
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (accessToken: string) => {
  refreshSubscribers.forEach(callback => callback(accessToken));
  refreshSubscribers = [];
};

// Base fetch wrapper
async function request(url: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    const refreshTok = getRefreshToken();
    if (!refreshTok) {
      clearTokens();
      throw { status: 401, message: "Unauthorized access" };
    }

    if (!isRefreshing) {
      isRefreshing = true;
      fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTok })
      }).then(async (refreshResponse) => {
        isRefreshing = false;
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTokens(data.accessToken, data.refreshToken, data.user);
          onTokenRefreshed(data.accessToken);
        } else {
          clearTokens();
          window.location.href = "/login";
        }
      }).catch(() => {
        isRefreshing = false;
        clearTokens();
        window.location.href = "/login";
      });
    }

    // Return a promise that resolves with the retried request
    return new Promise((resolve, reject) => {
      addRefreshSubscriber((newToken) => {
        headers.set("Authorization", `Bearer ${newToken}`);
        fetch(`${API_BASE}${url}`, {
          ...options,
          headers
        }).then(async (retryResponse) => {
          if (!retryResponse.ok) {
            const errData = await retryResponse.json().catch(() => ({}));
            reject({ status: retryResponse.status, message: errData.error?.message || "Request failed" });
          } else {
            resolve(retryResponse.json());
          }
        }).catch(reject);
      });
    });
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw { status: response.status, message: errData.error?.message || "Request failed" };
  }

  // Handle empty responses
  if (response.status === 204) return null;
  return response.json();
}

export const apiClient = {
  auth: {
    login: async (email, password) => {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setTokens(data.accessToken, data.refreshToken, data.user);
      return data;
    },
    logout: async () => {
      const refreshTok = getRefreshToken();
      if (refreshTok) {
        await request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: refreshTok })
        }).catch(() => {});
      }
      clearTokens();
    },
    setupStatus: async () => {
      return request("/auth/setup-status");
    },
    setup: async (name, username, email, password) => {
      const data = await request("/auth/setup", {
        method: "POST",
        body: JSON.stringify({ name, username, email, password })
      });
      setTokens(data.accessToken, data.refreshToken, data.user);
      return data;
    },
    changePassword: async (currentPassword, newPassword) => {
      return request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
    }
  },

  requests: {
    list: async (filters: any = {}) => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      return request(`/requests${queryString}`);
    },
    get: async (id: string) => {
      return request(`/requests/${id}`);
    },
    create: async (data: any) => {
      return request("/requests", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, data: any) => {
      return request(`/requests/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (id: string) => {
      return request(`/requests/${id}`, {
        method: "DELETE"
      });
    },
    downloadExport: async (id: string, format: "pdf" | "excel") => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/requests/${id}/export/${format}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      return response.blob();
    }
  },

  inventory: {
    list: async (filters: any = {}) => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      return request(`/inventory${queryString}`);
    },
    movements: async (filters: any = {}) => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      return request(`/inventory/movements${queryString}`);
    },
    createMovement: async (data: any) => {
      return request("/inventory/movements", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    createItem: async (data: any) => {
      return request("/inventory", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    updateItem: async (id: string, data: any) => {
      return request(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    deleteItem: async (id: string) => {
      return request(`/inventory/${id}`, {
        method: "DELETE"
      });
    }
  },

  approvals: {
    approve: async (requestId: string, note: string) => {
      return request(`/approvals/${requestId}/approve`, {
        method: "POST",
        body: JSON.stringify({ note })
      });
    },
    reject: async (requestId: string, note: string) => {
      return request(`/approvals/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify({ note })
      });
    },
    revise: async (requestId: string, note: string) => {
      return request(`/approvals/${requestId}/revise`, {
        method: "POST",
        body: JSON.stringify({ note })
      });
    }
  },

  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/upload", {
      method: "POST",
      body: formData
    });
  },

  finance: {
    realize: async (requestId: string, realizedAmount: number, receiptUrl?: string, notes?: string) => {
      return request(`/finance/realizations/${requestId}`, {
        method: "POST",
        body: JSON.stringify({ realizedAmount, receiptUrl, notes })
      });
    },
    submitProof: async (requestId: string, proofs: { fileUrl: string; fileName: string; description?: string; requestItemId?: string; isRefundProof?: boolean }[], actualAmount?: number) => {
      return request(`/finance/realizations/${requestId}/proof`, {
        method: "POST",
        body: JSON.stringify({ proofs, actualAmount })
      });
    },
    verifyRealization: async (requestId: string, note?: string) => {
      return request(`/finance/realizations/${requestId}/verify`, {
        method: "POST",
        body: JSON.stringify({ note })
      });
    },
    rejectVerification: async (requestId: string, note: string) => {
      return request(`/finance/realizations/${requestId}/reject-verification`, {
        method: "POST",
        body: JSON.stringify({ note })
      });
    }
  },

  pettyCash: {
    get: async () => request("/finance/petty-cash"),
    topUp: async (amount: number, description?: string, type?: string) => {
      return request("/finance/petty-cash/top-up", {
        method: "POST",
        body: JSON.stringify({ amount, description, type })
      });
    },
    update: async (id: string, amount: number, description?: string, type?: string) => {
      return request(`/finance/petty-cash/${id}`, {
        method: "PUT",
        body: JSON.stringify({ amount, description, type })
      });
    }
  },

  reports: {
    getAggregates: async (filters: any = {}) => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      return request(`/reports/aggregates${queryString}`);
    },
    downloadExport: async (format: "excel" | "pdf" | "docx") => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/reports/export/${format}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      return response.blob();
    }
  },

  meta: {
    categories: async () => request("/meta/categories"),
    departments: async () => request("/meta/departments"),
    sites: async () => request("/meta/sites"),
    units: async () => request("/meta/units"),
    roles: async () => request("/meta/roles"),
    
    createDepartment: async (name: string) => {
      return request("/meta/departments", {
        method: "POST",
        body: JSON.stringify({ name })
      });
    },
    updateDepartment: async (id: string, name: string) => {
      return request(`/meta/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
    },
    deleteDepartment: async (id: string) => {
      return request(`/meta/departments/${id}`, {
        method: "DELETE"
      });
    },

    createSite: async (name: string) => {
      return request("/meta/sites", {
        method: "POST",
        body: JSON.stringify({ name })
      });
    },
    updateSite: async (id: string, name: string) => {
      return request(`/meta/sites/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
    },
    deleteSite: async (id: string) => {
      return request(`/meta/sites/${id}`, {
        method: "DELETE"
      });
    },

    createCategory: async (name: string, color?: string) => {
      return request("/meta/categories", {
        method: "POST",
        body: JSON.stringify({ name, color })
      });
    },
    updateCategory: async (id: string, name: string, color?: string) => {
      return request(`/meta/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, color })
      });
    },
    deleteCategory: async (id: string) => {
      return request(`/meta/categories/${id}`, {
        method: "DELETE"
      });
    }
  },

  users: {
    list: async () => request("/users"),
    create: async (data: any) => {
      return request("/users", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, data: any) => {
      return request(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (id: string) => {
      return request(`/users/${id}`, {
        method: "DELETE"
      });
    }
  },

  audit: {
    list: async (filters: any = {}) => {
      const params = new URLSearchParams();
      if (filters.limit) params.append("limit", filters.limit);
      if (filters.offset) params.append("offset", filters.offset);
      const queryString = params.toString() ? `?${params.toString()}` : "";
      return request(`/audit${queryString}`);
    }
  }
};
