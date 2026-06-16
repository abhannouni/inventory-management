import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { schedulesApi } from '../../api/schedules.api';
import type { CreateSchedulePayload, FindSchedulesParams, UpdateSchedulePayload } from '../../api/schedules.api';
import type { Schedule } from '../../types';

interface SchedulesState {
  items: Schedule[];
  loading: boolean;
  error: string | null;
}

const initialState: SchedulesState = { items: [], loading: false, error: null };

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchAll',
  async (params: FindSchedulesParams | undefined, { rejectWithValue }) => {
    try { return await schedulesApi.findAll(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const createSchedule = createAsyncThunk(
  'schedules/create',
  async (payload: CreateSchedulePayload, { rejectWithValue }) => {
    try { return await schedulesApi.create(payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const updateSchedule = createAsyncThunk(
  'schedules/update',
  async ({ id, payload }: { id: string; payload: UpdateSchedulePayload }, { rejectWithValue }) => {
    try { return await schedulesApi.update(id, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const deleteSchedule = createAsyncThunk(
  'schedules/delete',
  async (id: string, { rejectWithValue }) => {
    try { await schedulesApi.remove(id); return id; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSchedules.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createSchedule.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      });
  },
});

export const { clearError } = schedulesSlice.actions;
export default schedulesSlice.reducer;
