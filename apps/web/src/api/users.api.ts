import { api } from './client';
import type { User } from '../types';

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role: string;
  region_id?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  role?: string;
  region_id?: string;
}

export const usersApi = {
  findAll: () => api.get<User[]>('/users'),
  findOne: (id: string) => api.get<User>(`/users/${id}`),
  create: (payload: CreateUserPayload) => api.post<User>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) => api.patch<User>(`/users/${id}`, payload),
  remove: (id: string) => api.delete<User>(`/users/${id}`),
  assignStores: (id: string, store_ids: string[]) =>
    api.post<User>(`/users/${id}/stores`, { store_ids }),
};
