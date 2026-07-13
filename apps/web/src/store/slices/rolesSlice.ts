import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { rolesApi } from '../../api/roles.api';
import type { CreateRolePayload, UpdateRolePayload } from '../../api/roles.api';
import type { PermissionGroup, RoleRecord } from '../../types';

interface RolesState {
  items: RoleRecord[];
  catalogue: PermissionGroup[];
  selected: RoleRecord | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: RolesState = {
  items: [],
  catalogue: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchRoles = createAsyncThunk('roles/fetchAll', async (_, { rejectWithValue }) => {
  try { return await rolesApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchRole = createAsyncThunk('roles/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return await rolesApi.findOne(id); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchPermissionCatalogue = createAsyncThunk(
  'roles/catalogue',
  async (_, { rejectWithValue }) => {
    try { return await rolesApi.catalogue(); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const createRole = createAsyncThunk(
  'roles/create',
  async (payload: CreateRolePayload, { rejectWithValue }) => {
    try { return await rolesApi.create(payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const updateRole = createAsyncThunk(
  'roles/update',
  async ({ id, payload }: { id: string; payload: UpdateRolePayload }, { rejectWithValue }) => {
    try { return await rolesApi.update(id, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const deleteRole = createAsyncThunk('roles/delete', async (id: string, { rejectWithValue }) => {
  try { await rolesApi.remove(id); return id; }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const setRolePermissions = createAsyncThunk(
  'roles/setPermissions',
  async ({ id, permissions }: { id: string; permissions: string[] }, { rejectWithValue }) => {
    try { return await rolesApi.setPermissions(id, permissions); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

/** Merge a fresh role into the list without dropping the counts the list view shows. */
function upsert(state: RolesState, role: RoleRecord) {
  const idx = state.items.findIndex((r) => r.id === role.id);
  if (idx !== -1) state.items[idx] = { ...state.items[idx], ...role };
  if (state.selected?.id === role.id) state.selected = role;
}

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPermissionCatalogue.fulfilled, (state, action) => {
        state.catalogue = action.payload;
      })
      .addCase(fetchRole.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createRole.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(updateRole.fulfilled, (state, action) => { upsert(state, action.payload); })
      .addCase(setRolePermissions.pending, (state) => { state.saving = true; })
      .addCase(setRolePermissions.fulfilled, (state, action) => {
        state.saving = false;
        upsert(state, action.payload);
        // The list shows a permission count; keep it in step with the new grants.
        const idx = state.items.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx].permission_count = action.payload.permissions?.length ?? 0;
        }
      })
      .addCase(setRolePermissions.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      });
  },
});

export const { clearSelected, clearError } = rolesSlice.actions;
export default rolesSlice.reducer;
