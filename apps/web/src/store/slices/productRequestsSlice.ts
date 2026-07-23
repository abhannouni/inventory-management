import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { productRequestsApi } from '../../api/product-requests.api';
import type { CreateProductRequestPayload } from '../../api/product-requests.api';
import type { ProductRequest } from '../../types';

interface ProductRequestsState {
  items: ProductRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductRequestsState = { items: [], loading: false, error: null };

export const fetchProductRequests = createAsyncThunk(
  'productRequests/fetchAll',
  async (params: { store_id?: string } | undefined, { rejectWithValue }) => {
    try { return await productRequestsApi.findAll(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const createProductRequest = createAsyncThunk(
  'productRequests/create',
  async (payload: CreateProductRequestPayload, { rejectWithValue }) => {
    try { return await productRequestsApi.create(payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const updateProductRequest = createAsyncThunk(
  'productRequests/update',
  async ({ id, payload }: { id: string; payload: Partial<CreateProductRequestPayload> }, { rejectWithValue }) => {
    try { return await productRequestsApi.update(id, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const deleteProductRequest = createAsyncThunk(
  'productRequests/delete',
  async (id: string, { rejectWithValue }) => {
    try { await productRequestsApi.remove(id); return id; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const productRequestsSlice = createSlice({
  name: 'productRequests',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductRequests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProductRequests.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchProductRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createProductRequest.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateProductRequest.fulfilled, (state, action) => {
        const idx = state.items.findIndex((pr) => pr.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteProductRequest.fulfilled, (state, action) => {
        state.items = state.items.filter((pr) => pr.id !== action.payload);
      });
  },
});

export const { clearError } = productRequestsSlice.actions;
export default productRequestsSlice.reducer;
