import { api } from './client';
import type { PlannedVisit, Role, User, VisitPlan, VisitPlanStatus } from '../types';

/** One day on a month plan, as sent to the API. */
export interface PlanVisitPayload {
  date: string;
  store_id: string;
  /** `HH:mm`, 24-hour. Omit when only the day matters. */
  time?: string;
  notes?: string;
}

export interface UpdatePlannedVisitPayload {
  date?: string;
  store_id?: string;
  /** Send null to clear the time. */
  time?: string | null;
  notes?: string;
}

export interface PlannablePerson {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  supervisor_id: string | null;
}

/**
 * A planned visit as it comes back for the reviewer's all-people calendar. The
 * endpoint selects a slim `user` rather than the full record, so that field is
 * narrowed here instead of inherited.
 */
export interface PlannedVisitRow extends Omit<PlannedVisit, 'user'> {
  user?: PlannablePerson;
  plan?: { id: string; status: VisitPlanStatus } | null;
}

export interface FindAllPlannedParams {
  year: number;
  month: number;
  role?: Extract<Role, 'supervisor' | 'merchandiser'>;
  supervisor_id?: string;
  user_id?: string;
  search?: string;
}

export interface AddVisitsPayload {
  visits: PlanVisitPayload[];
  note?: string;
}

export interface FindPlansParams {
  status?: VisitPlanStatus;
  user_id?: string;
  role?: Extract<Role, 'supervisor' | 'merchandiser'>;
  year?: number;
  month?: number;
  search?: string;
}

export interface ReviewPlanPayload {
  action: 'approve' | 'decline';
  note?: string;
}

/** A reviewer writing someone's whole month — adjust, or fill in from scratch. */
export interface SetMonthPayload {
  year: number;
  month: number;
  visits: PlanVisitPayload[];
  note?: string;
}

/** Someone with no plan for the selected month yet. */
export interface MissingPlanUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

export const visitPlansApi = {
  getMine: (year: number, month: number) =>
    api.get<VisitPlan | null>('/visits/plans/mine', { year, month }),
  /** Planned visits from today forward — what the check-in screen offers. */
  upcoming: () => api.get<PlannedVisit[]>('/visits/plans/mine/upcoming'),
  planVisit: (payload: PlanVisitPayload) =>
    api.post<VisitPlan>('/visits/plans/mine', payload),
  updatePlannedVisit: (visitId: string, payload: UpdatePlannedVisitPayload) =>
    api.patch<VisitPlan>(`/visits/plans/mine/${visitId}`, payload),
  removePlannedVisit: (visitId: string) =>
    api.delete<VisitPlan>(`/visits/plans/mine/${visitId}`),
  submit: (year: number, month: number) =>
    api.post<VisitPlan>('/visits/plans/mine/submit', { year, month }),

  findAll: (params?: FindPlansParams) =>
    api.get<{ plans: VisitPlan[]; missing: MissingPlanUser[] }>(
      '/visits/plans',
      params as Record<string, string | number | undefined>,
    ),
  findOne: (id: string) => api.get<VisitPlan>(`/visits/plans/${id}`),
  /** Everyone's planned visits for a month, plus the people the filters cover. */
  findAllPlanned: (params: FindAllPlannedParams) =>
    api.get<{ visits: PlannedVisitRow[]; people: PlannablePerson[] }>(
      '/visits/plans/all',
      params as unknown as Record<string, string | number | undefined>,
    ),
  /** Adds days to someone's month without rewriting it — approved on the spot. */
  addVisitsForUser: (userId: string, payload: AddVisitsPayload) =>
    api.post<VisitPlan>(`/visits/plans/user/${userId}/visits`, payload),
  /** Opens one person's month — `plan` is null when nothing is planned yet. */
  findForUser: (userId: string, year: number, month: number) =>
    api.get<{ user: Pick<User, 'id' | 'full_name' | 'email' | 'role'>; plan: VisitPlan | null }>(
      `/visits/plans/user/${userId}`,
      { year, month },
    ),
  review: (id: string, payload: ReviewPlanPayload) =>
    api.post<VisitPlan>(`/visits/plans/${id}/review`, payload),
  setMonth: (userId: string, payload: SetMonthPayload) =>
    api.put<VisitPlan>(`/visits/plans/user/${userId}`, payload),
};
