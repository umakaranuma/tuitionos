export interface Institute {
  id: number; name: string; subdomain: string; ownerName: string;
  ownerEmail: string; ownerMobile: string; plan: 'solo' | 'institute' | 'institute_pro';
  status: 'trial' | 'active' | 'suspended'; isActive: boolean;
  trialEndsAt: string | null; createdAt: string; updatedAt: string;
}
export interface PlatformSettings {
  monthlyFeeSolo: number; monthlyFeeInstitute: number; monthlyFeeInstitutePro: number;
  trialDays: number; suspensionGraceDays: number;
}
