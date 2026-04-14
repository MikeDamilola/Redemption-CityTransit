export type UserRole = 'passenger' | 'driver';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: number; // in units/tokens
  createdAt: number;
  photoURL?: string;
  // Driver specific
  vehicleNumber?: string;
  qrCodeData?: string;
}

export interface Transaction {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  type: 'purchase' | 'payment' | 'transfer';
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface TokenPackage {
  id: string;
  units: number;
  priceNaira: number;
}
