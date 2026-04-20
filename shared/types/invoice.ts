export interface Invoice { id: number; instituteId: number; amount: number; month: string; status: 'pending' | 'paid' | 'overdue'; paidAt: string | null; dueDate: string; createdAt: string; }
