export type StaffRole = 'receptionist' | 'hygienist' | 'dentist' | 'admin';

export interface StaffSession {
  userId: string;
  email: string;
  role: StaffRole;
}
