import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { reportsApi } from '../../api/reports.api';
import type { ReportFilters } from '../../api/reports.api';
import type { VisitReport, StoreReport, ProductReport } from '../../types';

interface ReportsState {
  visitsReport: VisitReport[];
  storeReport: StoreReport | null;
  productReport: ProductReport | null;
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  visitsReport: [],
  storeReport: null,
  productReport: null,
  loading: false,
  error: null,
};

export const fetchVisitsReport = createAsyncThunk('reports/visits', async (filters: ReportFilters | undefined, { rejectWithValue }) => {
  try { return await reportsApi.visitsReport(filters); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchStoreReport = createAsyncThunk('reports/store', async ({ id, filters }: { id: string; filters?: ReportFilters }, { rejectWithValue }) => {
  try { return await reportsApi.storeReport(id, filters); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchProductReport = createAsyncThunk('reports/product', async ({ id, filters }: { id: string; filters?: ReportFilters }, { rejectWithValue }) => {
  try { return await reportsApi.productReport(id, filters); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisitsReport.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVisitsReport.fulfilled, (state, action) => { state.loading = false; state.visitsReport = action.payload; })
      .addCase(fetchVisitsReport.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchStoreReport.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStoreReport.fulfilled, (state, action) => { state.loading = false; state.storeReport = action.payload; })
      .addCase(fetchStoreReport.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchProductReport.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProductReport.fulfilled, (state, action) => { state.loading = false; state.productReport = action.payload; })
      .addCase(fetchProductReport.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
