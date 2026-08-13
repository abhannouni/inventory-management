import { api } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  findAll: (unreadOnly?: boolean) =>
    api.get<Notification[]>('/notifications', unreadOnly ? { unread_only: 'true' } : undefined),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ success: boolean }>('/notifications/read-all'),
};
