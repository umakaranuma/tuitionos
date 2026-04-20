import { api } from "./api";
export async function login(email: string, password: string) {
  return api.post("/api/auth/login/", { email, password }).then(r => r.data);
}
export async function logout() {
  await api.post("/api/auth/logout/");
  if (typeof window !== "undefined") window.location.href = "/login";
}
