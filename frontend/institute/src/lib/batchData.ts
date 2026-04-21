// Shared batch + student data used across Students, Attendance and Fee Tracking pages
export const BATCHES = [
  { id: "g7a",  label: "Grade 7",   name: "Grade 7 — Batch A",      color: "#2a5fa8", colorL: "#d8e6fa", subjects: ["Mathematics","Science","English","Tamil"] },
  { id: "g8a",  label: "Grade 8",   name: "Grade 8 — Batch A",      color: "#2d7a5a", colorL: "#d4ede3", subjects: ["Mathematics","Physics","English","Tamil"] },
  { id: "g9a",  label: "Grade 9",   name: "Grade 9 — Batch A",      color: "#6b3ea8", colorL: "#ede8fc", subjects: ["Mathematics","Physics","Chemistry","English"] },
  { id: "g10",  label: "Grade 10",  name: "Grade 10 — O/L Batch",   color: "#c07b1a", colorL: "#fef3d7", subjects: ["Mathematics","Physics","Chemistry","English"] },
  { id: "g11",  label: "Grade 11",  name: "Grade 11 — A/L Science", color: "#b83030", colorL: "#fceaea", subjects: ["Physics","Chemistry","Combined Maths","Biology"] },
] as const;

export type BatchId = typeof BATCHES[number]["id"];

const P: [string,string][] = [
  ["#d4ede3","#1a5040"],["#d8e6fa","#2a5fa8"],["#fceaea","#b83030"],
  ["#fef3d7","#6b3e20"],["#ede8fc","#6b3ea8"],
];

export type Student = {
  id: number; batch: BatchId; initials: string; name: string;
  guardian: string; mobile: string;
  fee: "paid" | "due" | "overdue"; feeAmount: number; feeMonth: string;
  attPct: number; // 0-100
  joinDate: string;
  bg: string; fg: string;
  isFree?: boolean;
};

function s(id:number, batch:BatchId, name:string, guardian:string, mobile:string, fee:Student["fee"], feeAmt:number, att:number, joinDate:string): Student {
  const [bg,fg] = P[id % P.length];
  const ini = name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
  return { id, batch, name, initials: ini, guardian, mobile, fee, feeAmount: feeAmt, feeMonth:"April 2026", attPct: att, joinDate, bg, fg };
}

/* prettier-ignore */
/* ── TEACHER DATA ── */
export type Teacher = {
  id: number; initials: string; name: string; subject: string;
  mobile: string; email: string; batchIds: BatchId[];
  monthlySalary: number; joinDate: string;
  bg: string; fg: string;
};

export type PaymentEdit = {
  editDate: string;
  field: string;
  oldValue: string;
  newValue: string;
};

export type TeacherPayment = {
  teacherId: number; month: string; amount: number;
  status: "paid" | "pending" | "overdue";
  paidDate: string | null; method: string | null; referenceNo: string | null;
  payslipFile: string | null; notes: string | null;
  type: "salary" | "advance" | "bonus";
  advanceDeduction: number;
  editHistory: PaymentEdit[];
};

export type TeacherAdvance = {
  id: number; teacherId: number;
  amount: number; requestDate: string; reason: string;
  status: "active" | "repaid" | "partial";
  disbursedDate: string | null; method: string | null;
  repaidAmount: number; // how much has been repaid so far
};

const TP: [string,string][] = [
  ["#d4ede3","#1a5040"],["#d8e6fa","#2a5fa8"],["#fceaea","#b83030"],
  ["#fef3d7","#6b3e20"],["#ede8fc","#6b3ea8"],
];

function t(id:number, name:string, subject:string, mobile:string, email:string, batchIds:BatchId[], salary:number, joinDate:string): Teacher {
  const [bg,fg] = TP[id % TP.length];
  const ini = name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
  return { id, name, initials: ini, subject, mobile, email, batchIds, monthlySalary: salary, joinDate, bg, fg };
}

export const TEACHERS: Teacher[] = [
  t(1,"Mr. Rajan Nair","Mathematics","+94 77 234 5678","rajan@stpatricks.lk",["g10","g9a","g7a"],45000,"2020-03-15"),
  t(2,"Ms. Geetha S.","Physics","+94 77 345 6789","geetha@stpatricks.lk",["g10","g11"],38000,"2021-06-01"),
  t(3,"Mr. Arjun K.","Chemistry","+94 77 456 7890","arjun@stpatricks.lk",["g9a","g11"],40000,"2019-01-10"),
  t(4,"Ms. Ramya M.","English","+94 77 567 8901","ramya@stpatricks.lk",["g7a","g8a","g9a","g10"],42000,"2018-07-22"),
  t(5,"Ms. Valli F.","Tamil Literature","+94 77 678 9012","valli@stpatricks.lk",["g7a","g8a","g9a"],35000,"2022-01-05"),
  t(6,"Ms. Anitha N.","Biology","+94 77 789 0123","anitha@stpatricks.lk",["g11"],30000,"2023-09-01"),
];

const MONTHS = ["April 2026","March 2026","February 2026","January 2026","December 2025","November 2025"];

function genPayments(): TeacherPayment[] {
  const records: TeacherPayment[] = [];
  TEACHERS.forEach(teacher => {
    MONTHS.forEach((month, mi) => {
      // Current month (April) — some pending/overdue, rest paid
      if (mi === 0) {
        const isPaid = [1, 3, 5].includes(teacher.id);
        const isOverdue = teacher.id === 6;
        records.push({
          teacherId: teacher.id, month, amount: teacher.monthlySalary,
          status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
          paidDate: isPaid ? "2026-04-05" : null,
          method: isPaid ? "Bank transfer" : null,
          referenceNo: isPaid ? `SAL-${teacher.id}04-26` : null,
          payslipFile: isPaid ? `payslip_${teacher.id}_apr26.pdf` : null,
          notes: null, type: "salary", advanceDeduction: 0, editHistory: [],
        });
      } else {
        // Past months — all paid
        const day = String(3 + mi).padStart(2,"0");
        const monthNum = 4 - mi;
        const year = monthNum > 0 ? "2026" : "2025";
        const mn = monthNum > 0 ? String(monthNum).padStart(2,"0") : String(12 + monthNum).padStart(2,"0");
        records.push({
          teacherId: teacher.id, month, amount: teacher.monthlySalary,
          status: "paid",
          paidDate: `${year}-${mn}-${day}`,
          method: teacher.id % 2 === 0 ? "Cash" : "Bank transfer",
          referenceNo: `SAL-${teacher.id}${mn}-${year.slice(2)}`,
          payslipFile: `payslip_${teacher.id}_${mn}${year.slice(2)}.pdf`,
          notes: null, type: "salary",
          advanceDeduction: teacher.id === 2 && mi >= 1 && mi <= 3 ? 5000 : 0,
          editHistory: [],
        });
      }
    });
  });
  return records;
}

export const INIT_TEACHER_PAYMENTS: TeacherPayment[] = genPayments();

export const INIT_TEACHER_ADVANCES: TeacherAdvance[] = [
  {
    id: 1, teacherId: 2, amount: 20000,
    requestDate: "2026-01-15", reason: "Medical emergency — hospital bills",
    status: "partial", disbursedDate: "2026-01-16", method: "Bank transfer",
    repaidAmount: 15000, // 5000 x 3 months deducted
  },
  {
    id: 2, teacherId: 4, amount: 10000,
    requestDate: "2026-03-20", reason: "Family function expenses",
    status: "active", disbursedDate: "2026-03-21", method: "Cash",
    repaidAmount: 0,
  },
];

/* ── STUDENT DATA ── */
export const ALL_STUDENTS: Student[] = [
  // Grade 7
  s(1,"g7a","Kavitha M.","Meena S.",  "+94 77 456 7890","paid",3000,99,"2025-01-06"),
  s(2,"g7a","Nithya V.", "Valli P.",  "+94 77 678 9012","paid",3000,96,"2025-01-06"),
  s(3,"g7a","Arun P.",   "Prabhu A.", "+94 77 100 1001","due", 3000,88,"2025-01-06"),
  s(4,"g7a","Deepa J.",  "James D.",  "+94 77 100 1002","paid",3000,92,"2025-01-06"),
  s(5,"g7a","Sanjay L.", "Latha S.",  "+94 77 100 1003","paid",3000,95,"2025-01-06"),
  s(6,"g7a","Meena C.",  "Chitra M.", "+94 77 100 1004","due", 3000,77,"2025-01-08"),
  s(7,"g7a","Rajan N.",  "Nair R.",   "+94 77 100 1005","paid",3000,97,"2025-01-06"),
  s(8,"g7a","Anitha B.", "Bala A.",   "+94 77 100 1006","paid",3000,91,"2025-01-06"),
  // Grade 8
  s(9, "g8a","Ramesh A.","Arjun R.",  "+94 77 200 2001","paid",3000,94,"2024-01-08"),
  s(10,"g8a","Geetha B.","Balan G.",  "+94 77 200 2002","paid",3000,91,"2024-01-08"),
  s(11,"g8a","Suresh C.","Chandra S.","+94 77 200 2003","due", 3000,87,"2024-01-08"),
  s(12,"g8a","Kamala D.","Devi K.",   "+94 77 200 2004","paid",3000,98,"2024-01-08"),
  s(13,"g8a","Prabhu E.","Elan P.",   "+94 77 200 2005","overdue",3000,76,"2024-01-10"),
  s(14,"g8a","Valli F.", "Fathima V.","+94 77 200 2006","paid",3000,93,"2024-01-08"),
  s(15,"g8a","Arjun G.", "Geetha A.", "+94 77 200 2007","paid",3000,95,"2024-01-08"),
  // Grade 9
  s(16,"g9a","Abhi A.",  "Anna A.",   "+94 77 300 3001","paid",4500,95,"2023-09-01"),
  s(17,"g9a","Brinda B.","Banu B.",   "+94 77 300 3002","paid",4500,92,"2023-09-01"),
  s(18,"g9a","Dharani D.","Devi D.",  "+94 77 300 3003","due", 4500,97,"2023-09-01"),
  s(19,"g9a","Elan E.",  "Elsa E.",   "+94 77 300 3004","paid",4500,91,"2023-09-01"),
  s(20,"g9a","Fabia F.", "Faith F.",  "+94 77 300 3005","paid",4500,94,"2023-09-01"),
  s(21,"g9a","Gobi G.",  "Gopi G.",   "+94 77 300 3006","overdue",4500,79,"2023-09-03"),
  // Grade 10
  s(22,"g10","Aarav Kumar","Raj Kumar", "+94 77 123 4567","paid",5500,94,"2022-01-10"),
  s(23,"g10","Priya Selvan","Selvan M.","+94 77 234 5678","due",  5500,81,"2022-01-10"),
  s(24,"g10","Dinesh Raj","Raj D.",     "+94 77 345 6789","paid",5500,97,"2022-01-10"),
  s(25,"g10","Surya T.", "Thilaga R.", "+94 77 567 8901","due",  5500,72,"2022-01-12"),
  s(26,"g10","Meena J.", "Jaya M.",    "+94 77 890 1234","paid",5500,78,"2022-01-10"),
  s(27,"g10","Ramesh A.","Asha R.",    "+94 77 100 4001","paid",5500,93,"2022-01-10"),
  // Grade 11
  s(28,"g11","Abhi R.",  "Rajan A.",  "+94 77 400 4001","paid",7000,97,"2021-09-01"),
  s(29,"g11","Brinda S.","Sita B.",   "+94 77 400 4002","paid",7000,94,"2021-09-01"),
  s(30,"g11","Dharani U.","Uma D.",   "+94 77 400 4003","due", 7000,88,"2021-09-01"),
  s(31,"g11","Elan V.",  "Vasu E.",   "+94 77 400 4004","paid",7000,95,"2021-09-01"),
  s(32,"g11","Fabia W.", "Wills F.",  "+94 77 400 4005","paid",7000,92,"2021-09-01"),
];

/* ── TIMETABLE DATA ── */
export type TimetableSession = {
  id: number;
  type?: "class" | "leave";
  batchId?: BatchId;
  teacherId?: number;
  subject?: string;
  day: string;
  timeStr: string;
  leaveLabel?: string;
  leaveColor?: string;
};

export const INIT_TIMESLOTS = ["8:00 – 9:30 AM", "10:00 – 11:30 AM", "2:00 – 3:30 PM", "4:00 – 5:30 PM"];

// Based on the former static 'slots' from timetable page
export const INIT_TIMETABLE: TimetableSession[] = [
  // g10 batch
  { id: 1, batchId: "g10", teacherId: 1, subject: "Mathematics", day: "Monday",    timeStr: "8:00 – 9:30 AM" },
  { id: 2, batchId: "g10", teacherId: 2, subject: "Physics",     day: "Tuesday",   timeStr: "8:00 – 9:30 AM" },
  { id: 3, batchId: "g10", teacherId: 3, subject: "Chemistry",   day: "Thursday",  timeStr: "8:00 – 9:30 AM" },
  
  { id: 4, batchId: "g10", teacherId: 1, subject: "Mathematics", day: "Monday",    timeStr: "10:00 – 11:30 AM" },
  { id: 5, batchId: "g10", teacherId: 4, subject: "English",     day: "Tuesday",   timeStr: "10:00 – 11:30 AM" },
  { id: 6, batchId: "g10", teacherId: 2, subject: "Physics",     day: "Thursday",  timeStr: "10:00 – 11:30 AM" },
  
  { id: 7, batchId: "g10", teacherId: 3, subject: "Chemistry",   day: "Wednesday", timeStr: "2:00 – 3:30 PM" },
  { id: 8, batchId: "g10", teacherId: 4, subject: "English",     day: "Friday",    timeStr: "2:00 – 3:30 PM" },
  
  { id: 9, type: "class", batchId: "g10", teacherId: 5, subject: "Tamil Literature", day: "Mon", timeStr: "4:00 – 5:30 PM" },
];

/* ── GLOBAL FEE STATE ── */
export type FeeStatus = "paid" | "partial" | "due" | "overdue" | "waived";

export type StudentFeeRecord = {
  status: FeeStatus;
  paidAmount: number;
  credits: number;
  receiptNo?: string;
  paidDate?: string;
  method?: string;
};

export type GlobalFeeState = Record<number, StudentFeeRecord>;

export const INIT_FEE_STATE: GlobalFeeState = {};

// History logic
export type FeeHistoryRecord = { month: string; amount: number; status: FeeStatus; date?: string; receipt?: string; };
export const INIT_FEE_HISTORY: Record<number, FeeHistoryRecord[]> = {};

ALL_STUDENTS.forEach(s => {
  INIT_FEE_STATE[s.id] = {
    status: s.fee === "paid" ? "paid" : s.fee === "overdue" ? "overdue" : "due",
    paidAmount: s.fee === "paid" ? s.feeAmount : 0,
    credits: 0,
    receiptNo: s.fee === "paid" ? `RCP-${100 + s.id}` : undefined,
    paidDate: s.fee === "paid" ? "2026-04-05" : undefined,
    method: s.fee === "paid" ? "Bank transfer" : undefined,
  };

  INIT_FEE_HISTORY[s.id] = [
    { month: "March 2026", amount: s.feeAmount, status: "paid", date: "02-Mar-2026", receipt: `RCP-${80 + s.id}` },
    { month: "February 2026", amount: s.feeAmount, status: "paid", date: "04-Feb-2026", receipt: `RCP-${60 + s.id}` },
    { month: "January 2026", amount: s.feeAmount, status: "paid", date: "08-Jan-2026", receipt: `RCP-${40 + s.id}` },
  ];
});

export const INIT_TIMETABLE_EXT: TimetableSession[] = [
  { id: 10, batchId: "g10", teacherId: 5, subject: "Tamil Literature", day: "Friday", timeStr: "4:00 – 5:30 PM" },
  
  // Example extra slot for g7a
  { id: 11, batchId: "g7a", teacherId: 1, subject: "Mathematics", day: "Wednesday", timeStr: "8:00 – 9:30 AM" },
];

/* ── ACCOUNTS GLOBAL DATA ── */
export type InstituteTransaction = {
  id: number;
  month: string;
  type: "income" | "expense";
  category: "Utility Bill" | "Staff Salary" | "Rent" | "Maintenance" | "Sponsorship" | "Other Income" | "Other";
  label: string;
  amount: number;
  date: string;
};

export const INIT_TRANSACTIONS: InstituteTransaction[] = [
  { id: 1, month: "April 2026", type: "expense", category: "Utility Bill", label: "Electricity Board", amount: 15000, date: "2026-04-10" },
  { id: 2, month: "April 2026", type: "expense", category: "Staff Salary", label: "Cleaning Staff (Ravi)", amount: 25000, date: "2026-04-05" },
  { id: 3, month: "March 2026", type: "expense", category: "Rent", label: "Building Rent", amount: 60000, date: "2026-03-01" },
  { id: 4, month: "March 2026", type: "expense", category: "Utility Bill", label: "Water & Internet", amount: 8500, date: "2026-03-12" },
  { id: 5, month: "March 2026", type: "income", category: "Sponsorship", label: "Local Business Grant", amount: 20000, date: "2026-03-15" }
];
