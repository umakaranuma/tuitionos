export interface Subject { id: number; instituteId: number; name: string; grade: string; isActive: boolean; }
export interface Teacher { id: number; instituteId: number; name: string; mobile: string; email: string; isActive: boolean; }
export interface Batch { id: number; instituteId: number; name: string; subjectId: number; teacherId: number | null; academicYear: number; monthlyFee: number; isActive: boolean; }
