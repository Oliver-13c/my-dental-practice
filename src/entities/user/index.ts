export interface User {
  id: string;
  email: string;
  role: 'patient' | 'staff';
  createdAt: string;
}
