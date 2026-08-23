import { api } from "./api";

// ── Auth ──
export async function login(email: string, password: string) {
  const { data } = await api.post("/api/login", { email, password });
  if (data.token && typeof window !== "undefined") {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

export async function logout() {
  try { await api.post("/api/logout"); } catch {}
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

export async function getMe() {
  return api.get("/api/me").then((r) => r.data);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

// ── Admin Dashboard ──
export const getAdminDashboard = () => api.get("/api/admin/dashboard").then((r) => r.data);

// ── Institutes ──
export const getInstitutes = () => api.get("/api/institutes").then((r) => r.data);
export const getInstituteDetail = (id: number) =>
  api.get(`/api/admin/institutes/${id}`).then((r) => r.data);
export const updateInstitute = (id: number, data: any) =>
  api.patch(`/api/admin/institutes/${id}`, data).then((r) => r.data);
export const createInstitute = (data: any) =>
  api.post("/api/institutes", data).then((r) => r.data);

// ── Invoices ──
export const getInvoices = () => api.get("/api/admin/billing/invoices").then((r) => r.data);

// ── Platform Settings ──
export const getPlatformSettings = () => api.get("/api/admin/settings").then((r) => r.data);
export const updatePlatformSettings = (data: any) =>
  api.put("/api/admin/settings", data).then((r) => r.data);
