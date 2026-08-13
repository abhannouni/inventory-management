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

// Revokes the refresh token server-side before clearing local state, so a
// signed-out session can't be reused even if the httpOnly cookie were
// somehow replayed. Best-effort: local state is cleared either way.
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    // Ignore - the user is logging out regardless of whether the server call succeeds.
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clears local session state without calling the server. Used when a
    // request tells us the refresh token is already invalid/expired, so
    // there is nothing left to revoke.
    clearSession(state) {
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
      // Does NOT clear user/token here: a rejection can be a transient
      // network/server error, not just an expired session, and clearing on
      // every failure logged users out on blips that a retry would have
      // survived. A genuinely invalid/expired token already triggers
      // clearSession via the 'auth:session-expired' event (see store/index.ts),
      // which is the single source of truth for forcing a logout.
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        localStorage.removeItem('access_token');
      });
  },
});

export const { clearSession, clearError } = authSlice.actions;
export default authSlice.reducer;
