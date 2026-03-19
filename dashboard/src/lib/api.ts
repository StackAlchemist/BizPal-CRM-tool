/**
 * API CLIENT
 * ----------
 * A single Axios instance shared across the whole app.
 * - Reads the base URL from the environment variable VITE_API_URL
 * - Automatically attaches the JWT from localStorage to every request
 * - On 401 responses, clears the token and redirects to login
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach token ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle 401 globally ─────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, businessName: string) =>
    api.post("/auth/register", { email, password, businessName }),
  me:       () => api.get("/auth/me"),
};

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────
export const customersApi = {
  list:   (params?: { search?: string; tag?: string }) =>
    api.get("/customers", { params }),
  get:    (id: string) => api.get(`/customers/${id}`),
  create: (data: { name: string; phone: string; tags?: string[]; notes?: string }) =>
    api.post("/customers", data),
  update: (id: string, data: Partial<{ name: string; phone: string; tags: string[]; notes: string }>) =>
    api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────
export const ordersApi = {
  list:         (params?: { status?: string; customerId?: string }) =>
    api.get("/orders", { params }),
  get:          (id: string) => api.get(`/orders/${id}`),
  create:       (data: { customerId: string; productName: string; amount: number; status?: string; notes?: string }) =>
    api.post("/orders", data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  delete:       (id: string) => api.delete(`/orders/${id}`),
  stats:        () => api.get("/orders/stats"),
};
