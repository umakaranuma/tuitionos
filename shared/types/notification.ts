export type NotificationChannel = 'whatsapp' | 'sms';
export type NotificationType = 'attendance' | 'fee_reminder' | 'fee_receipt' | 'timetable' | 'annual_pdf';
export interface NotificationLog { id: number; instituteId: number; studentId: number | null; channel: NotificationChannel; notificationType: NotificationType; recipientMobile: string; messagePreview: string; isDelivered: boolean; sentAt: string; errorMessage: string; }
