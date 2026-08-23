import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Token ${token}`;
    
    const academicYear = localStorage.getItem("academic_year") || new Date().getFullYear();
    config.headers["X-Academic-Year"] = academicYear;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Redirect on *every* 401, not just ones where a (now-invalid) token
    // existed — a request with no token at all is just as unauthenticated,
    // and used to fall through here silently, leaving whoever's looking at
    // a protected page stuck on it instead of bounced to /login.
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
