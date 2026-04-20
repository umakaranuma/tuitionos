export interface Student {
  id: number; name: string; parentMobile: string; hasWhatsapp: boolean;
  grade: string; instituteId: number; isActive: boolean; createdAt: string;
}
export interface StudentBatchEnrollment {
  studentId: number; batchId: number;
  status: 'active' | 'archived' | 'deactivated';
  academicYear: number; promotedAt: string | null; enrolledAt: string;
}
export type PromotionAction = 'promote' | 'retain' | 'remove';
