import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { notificationsApi } from '../../api/notifications.api';
import type { Notification } from '../../types';

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationsState = { items: [], unreadCount: 0, loading: false };

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (_, { rejectWithValue }) => {
  try { return await notificationsApi.findAll(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async (_, { rejectWithValue }) => {
  try { return await notificationsApi.unreadCount(); }
  catch (err) { return rejectWithValue((err as Error).message); }
});

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try { return await notificationsApi.markRead(id); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try { await notificationsApi.markAllRead(); return true; }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.is_read).length;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = action.payload.count; })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        state.unreadCount = state.items.filter((n) => !n.is_read).length;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, is_read: true }));
        state.unreadCount = 0;
      });
  },
});

export default notificationsSlice.reducer;
