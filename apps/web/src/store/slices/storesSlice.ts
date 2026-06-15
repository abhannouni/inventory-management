import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { storesApi } from '../../api/stores.api';
import type { StorePayload } from '../../api/stores.api';
import type { Store } from '../../types';

interface StoresState {
  items: Store[];
  selected: Store | null;
  loading: boolean;
  error: string | null;
}

const initialState: StoresState = { items: [], selected: null, loading: false, error: null };

export const fetchStores = createAsyncThunk('stores/fetchAll', async (_, { rejectWithValue }) => {
  try { return await storesApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchStore = createAsyncThunk('stores/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return await storesApi.findOne(id); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createStore = createAsyncThunk('stores/create', async (payload: StorePayload, { rejectWithValue }) => {
  try { return await storesApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateStore = createAsyncThunk('stores/update', async ({ id, payload }: { id: string; payload: Partial<StorePayload> }, { rejectWithValue }) => {
  try { return await storesApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteStore = createAsyncThunk('stores/delete', async (id: string, { rejectWithValue }) => {
  try { await storesApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const storesSlice = createSlice({
  name: 'stores',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStores.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStores.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchStores.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchStore.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createStore.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateStore.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
      })
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      });
  },
});

export const { clearSelected, clearError } = storesSlice.actions;
export default storesSlice.reducer;
