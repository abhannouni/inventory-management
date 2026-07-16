import { api } from './client';
import type { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: string;
  region_id?: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ access_token: string }>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    api.post<User>('/auth/register', payload),

  me: () => api.get<User>('/auth/me'),

  refresh: () => api.post<{ access_token: string }>('/auth/refresh'),

  logout: () => api.post<{ success: boolean }>('/auth/logout'),
};
