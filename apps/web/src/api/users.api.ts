import { api } from './client';
import type { Paginated, User } from '../types';

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role: string;
  role_id?: string;
  region_id?: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  password?: string;
  role?: string;
  role_id?: string;
  region_id?: string;
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  region_id?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export const usersApi = {
  findAll: (query: ListUsersQuery = {}) =>
    api.get<Paginated<User>>('/users', {
      ...query,
      // The client drops undefined params; a boolean must be stringified to survive.
      is_active: query.is_active === undefined ? undefined : String(query.is_active),
    }),
  findOne: (id: string) => api.get<User>(`/users/${id}`),
  create: (payload: CreateUserPayload) => api.post<User>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) => api.patch<User>(`/users/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/users/${id}`),
  activate: (id: string) => api.patch<User>(`/users/${id}/activate`),
  deactivate: (id: string) => api.patch<User>(`/users/${id}/deactivate`),
  assignStores: (id: string, store_ids: string[]) =>
    api.post<User>(`/users/${id}/stores`, { store_ids }),
};
