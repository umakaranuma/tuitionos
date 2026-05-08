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

// ── Dashboard ──
export const getDashboardStats = () => api.get("/api/dashboard").then((r) => r.data);

// ── Subjects ──
export const getSubjects = () => api.get("/api/academics/subjects").then((r) => r.data);
export const createSubject = (data: any) => api.post("/api/academics/subjects", data).then((r) => r.data);
export const updateSubject = (id: number, data: any) => api.patch(`/api/academics/subjects/${id}`, data).then((r) => r.data);
export const deleteSubject = (id: number) => api.delete(`/api/academics/subjects/${id}`);

// ── Teachers ──
export const getTeachers = () => api.get("/api/academics/teachers").then((r) => r.data);
export const createTeacher = (data: any) => api.post("/api/academics/teachers", data).then((r) => r.data);
export const updateTeacher = (id: number, data: any) => api.patch(`/api/academics/teachers/${id}`, data).then((r) => r.data);
export const deleteTeacher = (id: number) => api.delete(`/api/academics/teachers/${id}`);

// ── Batches ──
export const getBatches = () => api.get("/api/academics/batches").then((r) => r.data);
export const createBatch = (data: any) => api.post("/api/academics/batches", data).then((r) => r.data);
export const updateBatch = (id: number, data: any) => api.patch(`/api/academics/batches/${id}`, data).then((r) => r.data);
export const deleteBatch = (id: number) => api.delete(`/api/academics/batches/${id}`);

// ── Students ──
export const getStudents = () => api.get("/api/students/students").then((r) => r.data);
export const createStudent = (data: any) => api.post("/api/students/students", data).then((r) => r.data);
export const updateStudent = (id: number, data: any) => api.patch(`/api/students/students/${id}`, data).then((r) => r.data);
export const deleteStudent = (id: number) => api.delete(`/api/students/students/${id}`);
export const enrollStudent = (id: number, data: { batch: number; academic_year: number }) =>
  api.post(`/api/students/students/${id}/enroll`, data).then((r) => r.data);

// ── Enrollments ──
export const getEnrollments = () => api.get("/api/students/enrollments").then((r) => r.data);

// ── Fees ──
export const getFees = (params?: Record<string, string>) =>
  api.get("/api/fees/", { params }).then((r) => r.data);
export const markFeePaid = (id: number) =>
  api.post(`/api/fees/${id}/mark_paid`).then((r) => r.data);
export const generateFees = (batch: number, month: string) =>
  api.post("/api/fees/generate", { batch, month }).then((r) => r.data);

// ── Attendance ──
export const getAttendance = (params?: Record<string, string>) =>
  api.get("/api/attendance/", { params }).then((r) => r.data);
export const markAttendance = (data: { batch: number; subject: number; date: string; records: { student: number; is_present: boolean }[] }) =>
  api.post("/api/attendance/mark", data).then((r) => r.data);

// ── Timetable ──
export const getTimetable = () => api.get("/api/timetable/").then((r) => r.data);
export const createTimetableSlot = (data: any) => api.post("/api/timetable/", data).then((r) => r.data);
export const updateTimetableSlot = (id: number, data: any) => api.patch(`/api/timetable/${id}`, data).then((r) => r.data);
export const deleteTimetableSlot = (id: number) => api.delete(`/api/timetable/${id}`);

// ── Exams ──
export const getExams = () => api.get("/api/academics/exams").then((r) => r.data);
export const createExam = (data: any) => api.post("/api/academics/exams", data).then((r) => r.data);
export const getExamMarks = (examId: number) =>
  api.get(`/api/academics/exams/${examId}/marks`).then((r) => r.data);
export const saveExamMarks = (examId: number, records: any[]) =>
  api.post(`/api/academics/exams/${examId}/marks`, { records }).then((r) => r.data);

// ── Teacher Payments ──
export const getTeacherPayments = (params?: Record<string, string>) =>
  api.get("/api/academics/teacher-payments", { params }).then((r) => r.data);
export const markTeacherPaymentPaid = (id: number, data?: any) =>
  api.post(`/api/academics/teacher-payments/${id}/mark_paid`, data).then((r) => r.data);

// ── Teacher Advances ──
export const getTeacherAdvances = () =>
  api.get("/api/academics/teacher-advances").then((r) => r.data);
export const createTeacherAdvance = (data: any) =>
  api.post("/api/academics/teacher-advances", data).then((r) => r.data);

// ── Notifications ──
export const getNotifications = (params?: Record<string, string>) =>
  api.get("/api/notifications/", { params }).then((r) => r.data);

// ── Promotions ──
export const getPromotionMaps = () => api.get("/api/promotion/").then((r) => r.data);
export const executePromotion = (id: number) =>
  api.post(`/api/promotion/${id}/execute`).then((r) => r.data);

// ── Transactions (Accounts) ──
export const getTransactions = (params?: Record<string, string>) =>
  api.get("/api/billing/transactions", { params }).then((r) => r.data);
export const createTransaction = (data: any) =>
  api.post("/api/billing/transactions", data).then((r) => r.data);
