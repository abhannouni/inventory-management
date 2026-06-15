import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { usersApi } from '../../api/users.api';
import type { CreateUserPayload, UpdateUserPayload } from '../../api/users.api';
import type { User } from '../../types';

interface UsersState {
  items: User[];
  selected: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
  try { return await usersApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchUser = createAsyncThunk('users/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return await usersApi.findOne(id); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const createUser = createAsyncThunk('users/create', async (payload: CreateUserPayload, { rejectWithValue }) => {
  try { return await usersApi.create(payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const updateUser = createAsyncThunk('users/update', async ({ id, payload }: { id: string; payload: UpdateUserPayload }, { rejectWithValue }) => {
  try { return await usersApi.update(id, payload); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const deleteUser = createAsyncThunk('users/delete', async (id: string, { rejectWithValue }) => {
  try { await usersApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const assignStores = createAsyncThunk('users/assignStores', async ({ id, store_ids }: { id: string; store_ids: string[] }, { rejectWithValue }) => {
  try { return await usersApi.assignStores(id, store_ids); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchUsers.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchUser.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createUser.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload);
      });
  },
});

export const { clearSelected, clearError } = usersSlice.actions;
export default usersSlice.reducer;
