import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { regionsApi } from '../../api/regions.api';
import type { RegionPayload } from '../../api/regions.api';
import type { Region } from '../../types';

interface RegionsState {
  items: Region[];
  loading: boolean;
  error: string | null;
}

const initialState: RegionsState = { items: [], loading: false, error: null };

export const fetchRegions = createAsyncThunk('regions/fetchAll', async (_, { rejectWithValue }) => {
  try { return await regionsApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createRegion = createAsyncThunk('regions/create', async (payload: RegionPayload, { rejectWithValue }) => {
  try { return await regionsApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateRegion = createAsyncThunk('regions/update', async ({ id, payload }: { id: string; payload: RegionPayload }, { rejectWithValue }) => {
  try { return await regionsApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteRegion = createAsyncThunk('regions/delete', async (id: string, { rejectWithValue }) => {
  try { await regionsApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const regionsSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegions.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRegions.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchRegions.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createRegion.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateRegion.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteRegion.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      });
  },
});

export const { clearError } = regionsSlice.actions;
export default regionsSlice.reducer;
