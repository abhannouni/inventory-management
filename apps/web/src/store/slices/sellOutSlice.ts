import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { sellOutApi } from '../../api/sellOut.api';
import type { SellOutPayload } from '../../api/sellOut.api';
import type { SellOut } from '../../types';

interface SellOutState {
  items: SellOut[];
  loading: boolean;
  error: string | null;
}

const initialState: SellOutState = { items: [], loading: false, error: null };

export const fetchSellOuts = createAsyncThunk('sellOut/fetchAll', async (_, { rejectWithValue }) => {
  try { return await sellOutApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createSellOut = createAsyncThunk('sellOut/create', async (payload: SellOutPayload, { rejectWithValue }) => {
  try { return await sellOutApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const sellOutSlice = createSlice({
  name: 'sellOut',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellOuts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSellOuts.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchSellOuts.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createSellOut.fulfilled, (state, action) => { state.items.unshift(action.payload); });
  },
});

export const { clearError } = sellOutSlice.actions;
export default sellOutSlice.reducer;
