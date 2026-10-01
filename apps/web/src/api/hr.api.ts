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
  /** Their attendance policy checks where they clock — send a position. */
  location_check: boolean;
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

// ─── Location-checked attendance ──────────────────────────────────────────────

export type VisitScope = 'visit_period' | 'visit_day';
export type PlaceKind = 'work_location' | 'visit_store' | 'assigned_store';
export type SessionVerdict = 'verified' | 'off_site' | 'unverified' | 'manual' | 'not_checked';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface WorkLocationRow extends WorkLocation {
  employee_count: number;
}

export interface WorkLocationInput {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface AttendancePolicyRules {
  enabled: boolean;
  allow_work_locations: boolean;
  allow_visit_stores: boolean;
  allow_assigned_stores: boolean;
  visit_scope: VisitScope;
  visit_margin_minutes: number;
  store_radius_meters: number;
  count_off_site: boolean;
  count_unverified: boolean;
}

export interface AttendancePolicyInput extends AttendancePolicyRules {
  work_location_ids: string[];
  note?: string;
}

export interface AttendancePolicyView extends AttendancePolicyRules {
  configured: boolean;
  work_locations: WorkLocation[];
  note: string | null;
  updated_at: string | null;
  updated_by: { id: string; full_name: string } | null;
}

export interface AttendancePolicy extends AttendancePolicyView {
  assigned_stores: { total: number; without_coordinates: number };
}

export interface PointCheck {
  status: 'at_location' | 'off_site' | 'no_position';
  place: { kind: PlaceKind; id: string; name: string; distance_meters: number } | null;
}

export interface CalculatedSession {
  id: string;
  clock_in: string;
  clock_out: string | null;
  is_open: boolean;
  source: 'clock' | 'manual';
  note: string | null;
  /** Seconds inside the calculated range. */
  seconds: number;
  verdict: SessionVerdict;
  counts: boolean;
  checks: { clock_in: PointCheck | null; clock_out: PointCheck | null };
}

export interface CalculatedDay {
  date: string;
  planned: ScheduleDay | null;
  assigned_seconds: number;
  recorded_seconds: number;
  counted_seconds: number;
  excluded_seconds: number;
  verified_seconds: number;
  off_site_seconds: number;
  unverified_seconds: number;
  manual_seconds: number;
  status: WorkStatus;
  is_working: boolean;
  visit_count: number;
  visit_seconds: number;
}

export interface CalculatedVisit {
  id: string;
  status: 'planned' | 'open' | 'completed';
  store: { id: string; name: string };
  planned_date: string | null;
  planned_time: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  duration_seconds: number;
}

export interface WorkingHoursCalculation {
  employee: HrEmployee;
  from: string;
  to: string;
  today: string;
  generated_at: string;
  policy: AttendancePolicyView;
  working_hours: {
    assigned_seconds: number;
    recorded_seconds: number;
    counted_seconds: number;
    excluded_seconds: number;
    verified_seconds: number;
    off_site_seconds: number;
    unverified_seconds: number;
    manual_seconds: number;
    remaining_seconds: number;
    overtime_seconds: number;
    session_count: number;
  };
  visits: {
    performed: number;
    completed: number;
    open: number;
    not_started: number;
    total_seconds: number;
  };
  days: CalculatedDay[];
  sessions: CalculatedSession[];
  visit_list: CalculatedVisit[];
}

export const hrApi = {
  // Own time clock
  myToday: () => api.get<MyToday>('/hr/me/today'),
  clockIn: (position?: GeoPoint | null) => api.post<MyToday>('/hr/me/clock-in', position ?? {}),
  clockOut: (position?: GeoPoint | null) => api.post<MyToday>('/hr/me/clock-out', position ?? {}),

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

  // Working-hours calculation & location rules
  calculate: (id: string, range: { from: string; to: string }) =>
    api.get<WorkingHoursCalculation>(`/hr/employees/${id}/working-hours`, range),
  policy: (id: string) => api.get<AttendancePolicy>(`/hr/employees/${id}/attendance-policy`),
  setPolicy: (id: string, payload: AttendancePolicyInput) =>
    api.put<AttendancePolicy>(`/hr/employees/${id}/attendance-policy`, payload),
  locations: () => api.get<WorkLocationRow[]>('/hr/work-locations'),
  createLocation: (payload: WorkLocationInput) => api.post<WorkLocation>('/hr/work-locations', payload),
  updateLocation: (id: string, payload: Partial<WorkLocationInput>) =>
    api.patch<WorkLocation>(`/hr/work-locations/${id}`, payload),
  removeLocation: (id: string) => api.delete<void>(`/hr/work-locations/${id}`),
};
