import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { promosApi } from '../../api/promos.api';
import type {
  CreatePromoPayload,
  FindPromosParams,
  UpdatePromoItemPayload,
} from '../../api/promos.api';
import type { Promo, PromoItem, PromoPictureUploadersResponse, PromoUserPictureView } from '../../types';

interface PromosState {
  current: Promo | null;
  /** The batch being viewed — equals `current` unless a Super Admin picked an older one from the filters. */
  viewed: Promo | null;
  batches: Promo[];
  pictureUploaders: PromoPictureUploadersResponse | null;
  userPictureView: PromoUserPictureView | null;
  loading: boolean;
  batchesLoading: boolean;
  error: string | null;
}

const initialState: PromosState = {
  current: null,
  viewed: null,
  batches: [],
  pictureUploaders: null,
  userPictureView: null,
  loading: false,
  batchesLoading: false,
  error: null,
};

export const fetchCurrentPromo = createAsyncThunk('promos/fetchCurrent', async (_, { rejectWithValue }) => {
  try { return await promosApi.getCurrent(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchPromoBatch = createAsyncThunk('promos/fetchBatch', async (id: string, { rejectWithValue }) => {
  try { return await promosApi.getBatch(id); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchPromoBatches = createAsyncThunk(
  'promos/fetchBatches',
  async (params: FindPromosParams | undefined, { rejectWithValue }) => {
    try { return await promosApi.listBatches(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const createPromo = createAsyncThunk(
  'promos/create',
  async (payload: CreatePromoPayload, { rejectWithValue }) => {
    try { return await promosApi.create(payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const importPromoFile = createAsyncThunk(
  'promos/import',
  async (file: File, { rejectWithValue }) => {
    try { return await promosApi.importFromFile(file); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const updatePromoItem = createAsyncThunk(
  'promos/updateItem',
  async ({ itemId, payload }: { itemId: string; payload: UpdatePromoItemPayload }, { rejectWithValue }) => {
    try { return await promosApi.updateItem(itemId, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const removePromoItem = createAsyncThunk(
  'promos/removeItem',
  async (itemId: string, { rejectWithValue }) => {
    try { await promosApi.removeItem(itemId); return itemId; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const removePromoBatch = createAsyncThunk(
  'promos/removeBatch',
  async (id: string, { rejectWithValue }) => {
    try { await promosApi.removeBatch(id); return id; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const uploadPromoPicture = createAsyncThunk(
  'promos/uploadPicture',
  async ({ itemId, url }: { itemId: string; url: string }, { rejectWithValue }) => {
    try { return await promosApi.uploadPicture(itemId, url); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const removePromoPicture = createAsyncThunk(
  'promos/removePicture',
  async (itemId: string, { rejectWithValue }) => {
    try { await promosApi.removePicture(itemId); return itemId; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchPromoPictureUploaders = createAsyncThunk(
  'promos/fetchPictureUploaders',
  async (promoId: string | undefined, { rejectWithValue }) => {
    try { return await promosApi.listPictureUploaders(promoId); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchUserPictureView = createAsyncThunk(
  'promos/fetchUserPictureView',
  async ({ userId, promoId }: { userId: string; promoId?: string }, { rejectWithValue }) => {
    try { return await promosApi.getUserPictureView(userId, promoId); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

function applyItemUpdate(promo: Promo | null, item: { id: string } & Partial<PromoItem>) {
  if (!promo) return;
  const idx = promo.items.findIndex((i) => i.id === item.id);
  if (idx !== -1) promo.items[idx] = { ...promo.items[idx], ...item };
}

const promosSlice = createSlice({
  name: 'promos',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearViewed(state) { state.viewed = state.current; },
    clearUserPictureView(state) { state.userPictureView = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentPromo.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCurrentPromo.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
        state.viewed = action.payload;
      })
      .addCase(fetchCurrentPromo.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(fetchPromoBatch.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPromoBatch.fulfilled, (state, action) => { state.loading = false; state.viewed = action.payload; })
      .addCase(fetchPromoBatch.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(fetchPromoBatches.pending, (state) => { state.batchesLoading = true; })
      .addCase(fetchPromoBatches.fulfilled, (state, action) => { state.batchesLoading = false; state.batches = action.payload; })
      .addCase(fetchPromoBatches.rejected, (state, action) => { state.batchesLoading = false; state.error = action.payload as string; })

      .addCase(createPromo.fulfilled, (state, action) => {
        state.current = action.payload;
        state.viewed = action.payload;
      })
      .addCase(importPromoFile.fulfilled, (state, action) => {
        if (action.payload.promo) {
          state.current = action.payload.promo;
          state.viewed = action.payload.promo;
        }
      })

      .addCase(updatePromoItem.fulfilled, (state, action) => {
        applyItemUpdate(state.current, action.payload);
        applyItemUpdate(state.viewed, action.payload);
      })
      .addCase(removePromoItem.fulfilled, (state, action) => {
        if (state.current) state.current.items = state.current.items.filter((i) => i.id !== action.payload);
        if (state.viewed) state.viewed.items = state.viewed.items.filter((i) => i.id !== action.payload);
      })
      .addCase(removePromoBatch.fulfilled, (state, action) => {
        state.batches = state.batches.filter((b) => b.id !== action.payload);
        if (state.current?.id === action.payload) state.current = null;
        if (state.viewed?.id === action.payload) state.viewed = state.current;
      })

      .addCase(uploadPromoPicture.fulfilled, (state, action) => {
        applyItemUpdate(state.current, { id: action.payload.promo_item_id, my_picture: action.payload });
        applyItemUpdate(state.viewed, { id: action.payload.promo_item_id, my_picture: action.payload });
      })
      .addCase(removePromoPicture.fulfilled, (state, action) => {
        applyItemUpdate(state.current, { id: action.payload, my_picture: null });
        applyItemUpdate(state.viewed, { id: action.payload, my_picture: null });
      })

      .addCase(fetchPromoPictureUploaders.fulfilled, (state, action) => { state.pictureUploaders = action.payload; })
      .addCase(fetchUserPictureView.fulfilled, (state, action) => { state.userPictureView = action.payload; });
  },
});

export const { clearError, clearViewed, clearUserPictureView } = promosSlice.actions;
export default promosSlice.reducer;
