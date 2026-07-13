import { api } from './client';
import type { PermissionGroup, RoleRecord } from '../types';

export interface CreateRolePayload {
  name: string;
  label: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRolePayload {
  label?: string;
  description?: string;
}

export const rolesApi = {
  findAll: () => api.get<RoleRecord[]>('/roles'),
  findOne: (id: string) => api.get<RoleRecord>(`/roles/${id}`),
  catalogue: () => api.get<PermissionGroup[]>('/permissions'),
  create: (payload: CreateRolePayload) => api.post<RoleRecord>('/roles', payload),
  update: (id: string, payload: UpdateRolePayload) =>
    api.patch<RoleRecord>(`/roles/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/roles/${id}`),
  setPermissions: (id: string, permissions: string[]) =>
    api.put<RoleRecord>(`/roles/${id}/permissions`, { permissions }),
};
