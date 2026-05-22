export type UserRole = 'passenger' | 'driver';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: number; // in units/tokens
  createdAt: number;
  photoURL?: string;
  phoneNumber?: string;
  // Driver specific
  vehicleNumber?: string;
  qrCodeData?: string;
  isAvailable?: boolean;
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

export type RideStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone?: string;
  status: RideStatus;
  pickup: string;
  destination: string;
  fare: number;
  timestamp: number;
  acceptedAt?: number;
  startedAt?: number; // When driver picks up
  completedAt?: number;
  estimatedArrival?: number; // minutes
}
