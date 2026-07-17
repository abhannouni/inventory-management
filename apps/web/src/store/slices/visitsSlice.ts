import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { visitsApi } from '../../api/visits.api';
import type { CheckinPayload, CheckoutPayload, FindVisitsParams, SubmitReportPayload } from '../../api/visits.api';
import type { Visit } from '../../types';

interface VisitsState {
  items: Visit[];
  selected: Visit | null;
  /** The caller's open visit, rehydrated from the server so the timer resumes after a refresh. */
  active: Visit | null;
  loading: boolean;
  error: string | null;
}

const initialState: VisitsState = {
  items: [],
  selected: null,
  active: null,
  loading: false,
  error: null,
};

export const checkin = createAsyncThunk('visits/checkin', async (payload: CheckinPayload, { rejectWithValue }) => {
  try { return await visitsApi.checkin(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const checkout = createAsyncThunk('visits/checkout', async (payload: CheckoutPayload, { rejectWithValue }) => {
  try { return await visitsApi.checkout(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const submitVisitReport = createAsyncThunk(
  'visits/submitReport',
  async ({ visitId, payload }: { visitId: string; payload: SubmitReportPayload }, { rejectWithValue }) => {
    try { return await visitsApi.submitReport(visitId, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchVisits = createAsyncThunk('visits/fetchAll', async (params: FindVisitsParams | undefined, { rejectWithValue }) => {
  try { return await visitsApi.findAll(params); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchVisit = createAsyncThunk('visits/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return await visitsApi.findOne(id); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchActiveVisit = createAsyncThunk('visits/fetchActive', async (_, { rejectWithValue }) => {
  try { return await visitsApi.findActive(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const visitsSlice = createSlice({
  name: 'visits',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisits.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVisits.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchVisits.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchVisit.pending, (state) => { state.loading = true; })
      .addCase(fetchVisit.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload; })
      .addCase(fetchVisit.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchActiveVisit.fulfilled, (state, action) => { state.active = action.payload; })
      .addCase(checkin.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(checkin.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        // Check-in starts the clock: this payload is the timer's first baseline.
        state.active = action.payload;
      })
      .addCase(checkin.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(submitVisitReport.fulfilled, (state, action) => {
        // The visit is still open — just refresh the local copy with the saved report.
        if (state.active?.id === action.payload.id) state.active = action.payload;
      })
      .addCase(checkout.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(checkout.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((v) => v.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
        // Check-out stops the clock.
        if (state.active?.id === action.payload.id) state.active = null;
      })
      .addCase(checkout.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearSelected, clearError } = visitsSlice.actions;
export default visitsSlice.reducer;
