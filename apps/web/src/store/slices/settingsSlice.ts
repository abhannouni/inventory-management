import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { settingsApi } from '../../api/settings.api';
import type { FeatureFlag } from '../../api/settings.api';

interface SettingsState {
  flags: FeatureFlag[];
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = { flags: [], loading: false, error: null };

export const fetchFeatureFlags = createAsyncThunk('settings/fetchFlags', async (_, { rejectWithValue }) => {
  try { return await settingsApi.findAllFlags(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const setFeatureFlag = createAsyncThunk(
  'settings/setFlag',
  async ({ key, enabled }: { key: string; enabled: boolean }, { rejectWithValue }) => {
    try { return await settingsApi.setFlag(key, enabled); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatureFlags.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchFeatureFlags.fulfilled, (state, action) => { state.loading = false; state.flags = action.payload; })
      .addCase(fetchFeatureFlags.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(setFeatureFlag.fulfilled, (state, action) => {
        const idx = state.flags.findIndex((f) => f.key === action.payload.key);
        if (idx !== -1) state.flags[idx] = action.payload;
      });
  },
});

export default settingsSlice.reducer;
