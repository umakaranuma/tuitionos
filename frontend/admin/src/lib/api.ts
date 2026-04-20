import axios from "axios";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    return Promise.reject(error);
  }
);
