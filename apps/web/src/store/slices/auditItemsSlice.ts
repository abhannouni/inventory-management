import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { auditItemsApi } from '../../api/audit-items.api';
import type { AuditItemPayload, BulkAuditPayload } from '../../api/audit-items.api';
import type { AuditItem } from '../../types';

interface AuditItemsState {
  items: AuditItem[];
  loading: boolean;
  error: string | null;
}

const initialState: AuditItemsState = { items: [], loading: false, error: null };

export const fetchAuditItems = createAsyncThunk('auditItems/fetchAll', async (params: { visit_id?: string } | undefined, { rejectWithValue }) => {
  try { return await auditItemsApi.findAll(params); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createAuditItem = createAsyncThunk('auditItems/create', async (payload: AuditItemPayload, { rejectWithValue }) => {
  try { return await auditItemsApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const bulkUpsertAuditItems = createAsyncThunk('auditItems/bulkUpsert', async (payload: BulkAuditPayload, { rejectWithValue }) => {
  try { return await auditItemsApi.bulkUpsert(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateAuditItem = createAsyncThunk('auditItems/update', async ({ id, payload }: { id: string; payload: Partial<AuditItemPayload> }, { rejectWithValue }) => {
  try { return await auditItemsApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteAuditItem = createAsyncThunk('auditItems/delete', async (id: string, { rejectWithValue }) => {
  try { await auditItemsApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const auditItemsSlice = createSlice({
  name: 'auditItems',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditItems.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAuditItems.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchAuditItems.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createAuditItem.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(bulkUpsertAuditItems.fulfilled, (state, action) => {
        const newIds = new Set(action.payload.map((i) => i.id));
        state.items = [...state.items.filter((i) => !newIds.has(i.id)), ...action.payload];
      })
      .addCase(updateAuditItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteAuditItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});

export const { clearError } = auditItemsSlice.actions;
export default auditItemsSlice.reducer;
