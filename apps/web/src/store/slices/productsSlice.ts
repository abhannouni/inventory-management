import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { productsApi } from '../../api/products.api';
import type { ProductPayload } from '../../api/products.api';
import type { Product } from '../../types';

interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = { items: [], loading: false, error: null };

export const fetchProducts = createAsyncThunk('products/fetchAll', async (_, { rejectWithValue }) => {
  try { return await productsApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createProduct = createAsyncThunk('products/create', async (payload: ProductPayload, { rejectWithValue }) => {
  try { return await productsApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateProduct = createAsyncThunk('products/update', async ({ id, payload }: { id: string; payload: Partial<ProductPayload> }, { rejectWithValue }) => {
  try { return await productsApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteProduct = createAsyncThunk('products/delete', async (id: string, { rejectWithValue }) => {
  try { await productsApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const bulkImportProducts = createAsyncThunk('products/bulkImport', async (file: File, { dispatch, rejectWithValue }) => {
  try {
    const result = await productsApi.bulkImport(file);
    if (result.created > 0) dispatch(fetchProducts());
    return result;
  } catch (err) {
    return rejectWithValue((err as Error).message);
  }
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createProduct.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      });
  },
});

export const { clearError } = productsSlice.actions;
export default productsSlice.reducer;
