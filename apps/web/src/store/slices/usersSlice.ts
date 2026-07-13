import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { usersApi } from '../../api/users.api';
import type { CreateUserPayload, ListUsersQuery, UpdateUserPayload } from '../../api/users.api';
import type { PageMeta, User } from '../../types';

interface UsersState {
  items: User[];
  meta: PageMeta;
  selected: User | null;
  loading: boolean;
  error: string | null;
}

const emptyMeta: PageMeta = {
  total: 0,
  page: 1,
  limit: 20,
  total_pages: 1,
  has_next: false,
  has_prev: false,
};

const initialState: UsersState = {
  items: [],
  meta: emptyMeta,
  selected: null,
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (query: ListUsersQuery | undefined, { rejectWithValue }) => {
    try { return await usersApi.findAll(query ?? {}); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

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

export const setUserActive = createAsyncThunk(
  'users/setActive',
  async ({ id, active }: { id: string; active: boolean }, { rejectWithValue }) => {
    try {
      return active ? await usersApi.activate(id) : await usersApi.deactivate(id);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const assignStores = createAsyncThunk('users/assignStores', async ({ id, store_ids }: { id: string; store_ids: string[] }, { rejectWithValue }) => {
  try { return await usersApi.assignStores(id, store_ids); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

/** Replace a user in the list in place, preserving the current sort/page. */
function upsert(state: UsersState, user: User) {
  const idx = state.items.findIndex((u) => u.id === user.id);
  if (idx !== -1) state.items[idx] = { ...state.items[idx], ...user };
  if (state.selected?.id === user.id) state.selected = user;
}

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
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.meta = action.payload.meta;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUser.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.meta.total += 1;
      })
      .addCase(updateUser.fulfilled, (state, action) => { upsert(state, action.payload); })
      .addCase(setUserActive.fulfilled, (state, action) => { upsert(state, action.payload); })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload);
        state.meta.total = Math.max(0, state.meta.total - 1);
      });
  },
});

export const { clearSelected, clearError } = usersSlice.actions;
export default usersSlice.reducer;
