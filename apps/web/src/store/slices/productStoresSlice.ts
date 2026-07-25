import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { productStoresApi } from '../../api/product-stores.api';
import type { ProductAssignmentItem, ProductStorePayload } from '../../api/product-stores.api';
import type { ProductStore } from '../../types';

interface ProductStoresState {
  items: ProductStore[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductStoresState = { items: [], loading: false, error: null };

export const fetchProductStores = createAsyncThunk(
  'productStores/fetchAll',
  async (params: { store_id?: string; product_id?: string } | undefined, { rejectWithValue }) => {
    try { return await productStoresApi.findAll(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const createProductStore = createAsyncThunk('productStores/create', async (payload: ProductStorePayload, { rejectWithValue }) => {
  try { return await productStoresApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateProductStore = createAsyncThunk('productStores/update', async ({ id, payload }: { id: string; payload: Partial<ProductStorePayload> }, { rejectWithValue }) => {
  try { return await productStoresApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteProductStore = createAsyncThunk('productStores/delete', async (id: string, { rejectWithValue }) => {
  try { await productStoresApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const bulkAssignProductStores = createAsyncThunk(
  'productStores/bulkAssign',
  async ({ store_id, items }: { store_id: string; items: ProductAssignmentItem[] }, { rejectWithValue }) => {
    try { return { store_id, items: await productStoresApi.bulkAssign(store_id, items) }; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const productStoresSlice = createSlice({
  name: 'productStores',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductStores.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProductStores.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchProductStores.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createProductStore.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateProductStore.fulfilled, (state, action) => {
        const idx = state.items.findIndex((ps) => ps.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteProductStore.fulfilled, (state, action) => {
        state.items = state.items.filter((ps) => ps.id !== action.payload);
      })
      .addCase(bulkAssignProductStores.fulfilled, (state, action) => {
        const { store_id, items } = action.payload;
        state.items = [...state.items.filter((ps) => ps.store_id !== store_id), ...items];
      });
  },
});

export const { clearError } = productStoresSlice.actions;
export default productStoresSlice.reducer;
