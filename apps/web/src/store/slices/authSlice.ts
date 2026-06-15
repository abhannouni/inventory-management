import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.api';
import type { LoginPayload, RegisterPayload } from '../../api/auth.api';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('access_token'),
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (payload: LoginPayload, { rejectWithValue }) => {
  try {
    const data = await authApi.login(payload);
    localStorage.setItem('access_token', data.access_token);
    return data.access_token;
  } catch (err) {
    return rejectWithValue((err as Error).message);
  }
});

export const register = createAsyncThunk('auth/register', async (payload: RegisterPayload, { rejectWithValue }) => {
  try {
    return await authApi.register(payload);
  } catch (err) {
    return rejectWithValue((err as Error).message);
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (err) {
    return rejectWithValue((err as Error).message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('access_token');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(register.fulfilled, (state) => { state.loading = false; })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMe.pending, (state) => { state.loading = true; })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('access_token');
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
