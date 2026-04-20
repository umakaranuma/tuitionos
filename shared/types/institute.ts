export interface Institute {
  id: number; name: string; subdomain: string; ownerName: string;
  ownerEmail: string; ownerMobile: string; plan: 'basic' | 'premium';
  status: 'trial' | 'active' | 'suspended'; isActive: boolean;
  trialEndsAt: string | null; createdAt: string; updatedAt: string;
}
export interface PlatformSettings {
  monthlyFeeBasic: number; monthlyFeePremium: number;
  trialDays: number; suspensionGraceDays: number;
}
