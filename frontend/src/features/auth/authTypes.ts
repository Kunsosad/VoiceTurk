export type UserRole = 'buyer' | 'contributor';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}
