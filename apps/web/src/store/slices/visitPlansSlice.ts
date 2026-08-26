import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { visitPlansApi } from '../../api/visit-plans.api';
import type {
  AddVisitsPayload,
  FindAllPlannedParams,
  FindPlansParams,
  PlannablePerson,
  PlannedVisitRow,
  MissingPlanUser,
  PlanVisitPayload,
  ReviewPlanPayload,
  SetMonthPayload,
  UpdatePlannedVisitPayload,
} from '../../api/visit-plans.api';
import type { PlannedVisit, User, VisitPlan } from '../../types';

interface VisitPlansState {
  /** The caller's own month — read-write for a supervisor, read-only for a merchandiser. */
  mine: VisitPlan | null;
  mineLoading: boolean;
  /** The caller's next planned visits — drives the check-in screen's shortcuts. */
  upcoming: PlannedVisit[];
  /** Every planned visit for the reviewer's month-at-a-glance, and who it covers. */
  allPlanned: PlannedVisitRow[];
  people: PlannablePerson[];
  allLoading: boolean;
  /** Reviewer list of everyone's months for the selected period. */
  plans: VisitPlan[];
  missing: MissingPlanUser[];
  listLoading: boolean;
  /** The month open in the review drawer, and whose it is. */
  current: VisitPlan | null;
  currentUser: Pick<User, 'id' | 'full_name' | 'email' | 'role'> | null;
  saving: boolean;
  error: string | null;
}

const initialState: VisitPlansState = {
  mine: null,
  mineLoading: false,
  upcoming: [],
  allPlanned: [],
  people: [],
  allLoading: false,
  plans: [],
  missing: [],
  listLoading: false,
  current: null,
  currentUser: null,
  saving: false,
  error: null,
};

export const fetchMinePlan = createAsyncThunk(
  'visitPlans/fetchMine',
  async ({ year, month }: { year: number; month: number }, { rejectWithValue }) => {
    try { return await visitPlansApi.getMine(year, month); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchUpcomingPlanned = createAsyncThunk(
  'visitPlans/fetchUpcoming',
  async (_: void, { rejectWithValue }) => {
    try { return await visitPlansApi.upcoming(); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const planVisit = createAsyncThunk(
  'visitPlans/planVisit',
  async (payload: PlanVisitPayload, { rejectWithValue }) => {
    try { return await visitPlansApi.planVisit(payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const updatePlannedVisit = createAsyncThunk(
  'visitPlans/updatePlannedVisit',
  async ({ visitId, payload }: { visitId: string; payload: UpdatePlannedVisitPayload }, { rejectWithValue }) => {
    try { return await visitPlansApi.updatePlannedVisit(visitId, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const removePlannedVisit = createAsyncThunk(
  'visitPlans/removePlannedVisit',
  async (visitId: string, { rejectWithValue }) => {
    try { return await visitPlansApi.removePlannedVisit(visitId); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const submitMinePlan = createAsyncThunk(
  'visitPlans/submit',
  async ({ year, month }: { year: number; month: number }, { rejectWithValue }) => {
    try { return await visitPlansApi.submit(year, month); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchAllPlanned = createAsyncThunk(
  'visitPlans/fetchAllPlanned',
  async (params: FindAllPlannedParams, { rejectWithValue }) => {
    try { return await visitPlansApi.findAllPlanned(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const addVisitsForUser = createAsyncThunk(
  'visitPlans/addVisitsForUser',
  async ({ userId, payload }: { userId: string; payload: AddVisitsPayload }, { rejectWithValue }) => {
    try { return await visitPlansApi.addVisitsForUser(userId, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchAllPlans = createAsyncThunk(
  'visitPlans/fetchAll',
  async (params: FindPlansParams | undefined, { rejectWithValue }) => {
    try { return await visitPlansApi.findAll(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchOnePlan = createAsyncThunk(
  'visitPlans/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try { return await visitPlansApi.findOne(id); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

/** Opens somebody's month in the drawer, including people with nothing planned yet. */
export const fetchPlanForUser = createAsyncThunk(
  'visitPlans/fetchForUser',
  async ({ userId, year, month }: { userId: string; year: number; month: number }, { rejectWithValue }) => {
    try { return await visitPlansApi.findForUser(userId, year, month); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const reviewPlan = createAsyncThunk(
  'visitPlans/review',
  async ({ id, payload }: { id: string; payload: ReviewPlanPayload }, { rejectWithValue }) => {
    try { return await visitPlansApi.review(id, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const setMonthPlan = createAsyncThunk(
  'visitPlans/setMonth',
  async ({ userId, payload }: { userId: string; payload: SetMonthPayload }, { rejectWithValue }) => {
    try { return await visitPlansApi.setMonth(userId, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

function upsertInList(list: VisitPlan[], plan: VisitPlan) {
  const idx = list.findIndex((p) => p.id === plan.id);
  if (idx !== -1) list[idx] = plan;
  else list.unshift(plan);
}

const visitPlansSlice = createSlice({
  name: 'visitPlans',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearCurrent(state) { state.current = null; state.currentUser = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMinePlan.pending, (state) => { state.mineLoading = true; state.error = null; })
      .addCase(fetchMinePlan.fulfilled, (state, action) => { state.mineLoading = false; state.mine = action.payload; })
      .addCase(fetchMinePlan.rejected, (state, action) => { state.mineLoading = false; state.error = action.payload as string; })

      .addCase(fetchUpcomingPlanned.fulfilled, (state, action) => { state.upcoming = action.payload; })

      .addCase(planVisit.fulfilled, (state, action) => { state.mine = action.payload; })
      .addCase(planVisit.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(updatePlannedVisit.fulfilled, (state, action) => { state.mine = action.payload; })
      .addCase(updatePlannedVisit.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(removePlannedVisit.fulfilled, (state, action) => { state.mine = action.payload; })
      .addCase(removePlannedVisit.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(submitMinePlan.fulfilled, (state, action) => { state.mine = action.payload; })
      .addCase(submitMinePlan.rejected, (state, action) => { state.error = action.payload as string; })

      .addCase(fetchAllPlanned.pending, (state) => { state.allLoading = true; state.error = null; })
      .addCase(fetchAllPlanned.fulfilled, (state, action) => {
        state.allLoading = false;
        state.allPlanned = action.payload.visits;
        state.people = action.payload.people;
      })
      .addCase(fetchAllPlanned.rejected, (state, action) => { state.allLoading = false; state.error = action.payload as string; })

      .addCase(addVisitsForUser.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(addVisitsForUser.fulfilled, (state) => { state.saving = false; })
      .addCase(addVisitsForUser.rejected, (state, action) => { state.saving = false; state.error = action.payload as string; })

      .addCase(fetchAllPlans.pending, (state) => { state.listLoading = true; state.error = null; })
      .addCase(fetchAllPlans.fulfilled, (state, action) => {
        state.listLoading = false;
        state.plans = action.payload.plans;
        state.missing = action.payload.missing;
      })
      .addCase(fetchAllPlans.rejected, (state, action) => { state.listLoading = false; state.error = action.payload as string; })

      .addCase(fetchOnePlan.fulfilled, (state, action) => {
        state.current = action.payload;
        state.currentUser = action.payload.user ?? null;
      })
      .addCase(fetchPlanForUser.fulfilled, (state, action) => {
        state.current = action.payload.plan;
        state.currentUser = action.payload.user;
      })

      .addCase(reviewPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(reviewPlan.fulfilled, (state, action) => {
        state.saving = false;
        state.current = action.payload;
        upsertInList(state.plans, action.payload);
      })
      .addCase(reviewPlan.rejected, (state, action) => { state.saving = false; state.error = action.payload as string; })

      .addCase(setMonthPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(setMonthPlan.fulfilled, (state, action) => {
        state.saving = false;
        state.current = action.payload;
        upsertInList(state.plans, action.payload);
        // Whoever this month belongs to is no longer "missing" for the period.
        state.missing = state.missing.filter((m) => m.id !== action.payload.user_id);
      })
      .addCase(setMonthPlan.rejected, (state, action) => { state.saving = false; state.error = action.payload as string; });
  },
});

export const { clearError, clearCurrent } = visitPlansSlice.actions;
export default visitPlansSlice.reducer;
