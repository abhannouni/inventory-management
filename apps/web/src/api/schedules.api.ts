import { api } from './client';
import type { Schedule, ScheduleStatus } from '../types';

export interface CreateSchedulePayload {
  user_id: string;
  store_id: string;
  scheduled_at: string;
  notes?: string;
}

export interface UpdateSchedulePayload {
  store_id?: string;
  scheduled_at?: string;
  notes?: string;
  status?: ScheduleStatus;
}

export interface FindSchedulesParams {
  month?: string;
  status?: ScheduleStatus;
  user_id?: string;
}

export const schedulesApi = {
  findAll: (params?: FindSchedulesParams) =>
    api.get<Schedule[]>('/schedules', params as Record<string, string | undefined>),
  create: (payload: CreateSchedulePayload) =>
    api.post<Schedule>('/schedules', payload),
  update: (id: string, payload: UpdateSchedulePayload) =>
    api.patch<Schedule>(`/schedules/${id}`, payload),
  remove: (id: string) =>
    api.delete<{ id: string }>(`/schedules/${id}`),
};
