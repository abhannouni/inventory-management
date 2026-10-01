import { api } from './client';
import type { PageMeta, Role } from '../types';

export type WorkStatus = 'completed' | 'short' | 'missing' | 'in_progress' | 'not_started' | 'no_schedule';
export type ScheduleSource = 'custom' | 'role' | 'none';
export type AssignMode = 'custom' | 'role_default' | 'none';

export interface ScheduleDay {
  start: string;
  end: string;
  break_minutes: number;
}

/** Seven entries, Monday first; null = day off. */
export type WeekDays = (ScheduleDay | null)[];

export interface HrEmployee {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  role_id: string | null;
  role_name: string;
  role_label: string;
  role_is_system: boolean;
  region: { id: string; name: string } | null;
  supervisor: { id: string; full_name: string } | null;
}

export interface EmployeeWithSchedule extends HrEmployee {
  schedule: {
    source: ScheduleSource;
    days: WeekDays | null;
    weekly_minutes: number;
    next_change_from: string | null;
  };
}

interface DayFields {
  date: string;
  planned: ScheduleDay | null;
  assigned_seconds: number;
  worked_seconds: number;
  remaining_seconds: number;
  overtime_seconds: number;
  status: WorkStatus;
  is_working: boolean;
  needs_review: boolean;
  first_in: string | null;
  last_out: string | null;
}

export interface TrackingRow extends HrEmployee, DayFields {
  schedule_source: ScheduleSource;
  session_count: number;
}

export interface TrackingSummary {
  total: number;
  completed: number;
  short: number;
  missing: number;
  in_progress: number;
  not_started: number;
  no_schedule: number;
  working_now: number;
  needs_review: number;
  assigned_seconds: number;
  worked_seconds: number;
}

export interface TrackingResponse {
  date: string;
  today: string;
  generated_at: string;
  summary: TrackingSummary;
  items: TrackingRow[];
  meta: PageMeta;
}

export interface WorkSessionRecord {
  id: string;
  clock_in: string;
  clock_out: string | null;
  source: 'clock' | 'manual';
  note: string | null;
  is_open: boolean;
  is_stale: boolean;
  duration_seconds: number;
}

export interface EmployeeDay extends DayFields {
  schedule_source: ScheduleSource;
  sessions: WorkSessionRecord[];
}

export interface ScheduleHistoryEntry {
  id: string;
  scope: 'employee' | 'role';
  kind: 'custom' | 'none' | 'role_default' | 'role_schedule' | 'removed';
  days: WeekDays | null;
  weekly_minutes: number;
  effective_from: string;
  note: string | null;
  created_at: string;
  created_by: { id: string; full_name: string } | null;
  is_current: boolean;
  is_upcoming: boolean;
}

export interface EmployeeHoursDetail {
  employee: HrEmployee;
  today: string;
  from: string;
  to: string;
  schedule: { source: ScheduleSource; days: WeekDays | null; weekly_minutes: number };
  role_default: { days: WeekDays | null; weekly_minutes: number };
  totals: {
    assigned_seconds: number;
    worked_seconds: number;
    remaining_seconds: number;
    overtime_seconds: number;
  };
  days: EmployeeDay[];
  history: ScheduleHistoryEntry[];
}

export interface RoleSchedule {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
  employee_count: number;
  days: WeekDays | null;
  weekly_minutes: number;
  effective_from: string | null;
  upcoming: { days: WeekDays | null; weekly_minutes: number; effective_from: string } | null;
}

export interface HrFilters {
  roles: { id: string; name: string; label: string; is_system: boolean }[];
  regions: { id: string; name: string }[];
  supervisors: { id: string; full_name: string }[];
}

export interface MyToday extends DayFields {
  enabled: boolean;
  server_now: string;
  schedule_source: ScheduleSource;
  sessions: WorkSessionRecord[];
  open_session: WorkSessionRecord | null;
}

export interface EmployeeQuery {
  search?: string;
  role_id?: string;
  region_id?: string;
  supervisor_id?: string;
}

export interface TrackingQuery extends EmployeeQuery {
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface ScheduleChange {
  effective_from?: string;
  note?: string;
}

export const hrApi = {
  // Own time clock
  myToday: () => api.get<MyToday>('/hr/me/today'),
  clockIn: () => api.post<MyToday>('/hr/me/clock-in'),
  clockOut: () => api.post<MyToday>('/hr/me/clock-out'),

  // Tracking
  filters: () => api.get<HrFilters>('/hr/filters'),
  tracking: (query: TrackingQuery) => api.get<TrackingResponse>('/hr/tracking', { ...query }),
  employees: (query: EmployeeQuery = {}) => api.get<EmployeeWithSchedule[]>('/hr/employees', { ...query }),
  employee: (id: string, range: { from?: string; to?: string } = {}) =>
    api.get<EmployeeHoursDetail>(`/hr/employees/${id}`, range),

  // Schedules
  roleSchedules: () => api.get<RoleSchedule[]>('/hr/role-schedules'),
  setRoleSchedule: (roleId: string, payload: ScheduleChange & { days: WeekDays | null }) =>
    api.put<unknown>(`/hr/role-schedules/${roleId}`, payload),
  assign: (payload: ScheduleChange & { user_ids: string[]; mode: AssignMode; days?: WeekDays }) =>
    api.post<{ updated: number; mode: AssignMode; effective_from: string }>('/hr/schedules/assign', payload),

  // Time records
  createSession: (payload: { user_id: string; clock_in: string; clock_out?: string | null; note?: string }) =>
    api.post<WorkSessionRecord>('/hr/sessions', payload),
  updateSession: (id: string, payload: { clock_in?: string; clock_out?: string | null; note?: string }) =>
    api.patch<WorkSessionRecord>(`/hr/sessions/${id}`, payload),
  removeSession: (id: string) => api.delete<void>(`/hr/sessions/${id}`),
};
