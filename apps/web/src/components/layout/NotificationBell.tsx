import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../store/slices/notificationsSlice';
import { formatDate } from '../../utils/format';
import type { Notification } from '../../types';

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const { t, i18n } = useTranslation('notifications');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, unreadCount } = useAppSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => dispatch(fetchUnreadCount()), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) dispatch(fetchNotifications());
  };

  const handleItemClick = (n: Notification) => {
    if (!n.is_read) dispatch(markNotificationRead(n.id));
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  // Prefer the live translation over the stored English snapshot, so a
  // language switch updates already-fetched notifications too. Metadata
  // (actorName, year, month, note…) is spread in as interpolation values —
  // types with no metadata (e.g. promo_created) just ignore the extra keys.
  const notifTitle = (n: Notification) => t(`types.${n.type}.title`, { defaultValue: n.title, ...(n.metadata || {}) });
  /**
   * Empty on purpose for the types that say everything in their title.
   *
   * i18n runs with `returnEmptyString: false`, so a `defaultValue` of `''`
   * makes i18next fall back to printing the raw key — hence the explicit
   * `exists` check rather than leaning on the default.
   */
  const notifBody = (n: Notification) => {
    const key = `types.${n.type}.body`;
    if (i18n.exists(key, { ns: 'notifications' })) return t(key, { ...(n.metadata || {}) });
    return n.body || '';
  };

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="header-icon-btn" title={t('title')} onClick={handleToggle} style={{ position: 'relative' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8,
              background: 'var(--danger, #dc2626)', color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="user-menu-dropdown notification-dropdown"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <strong style={{ fontSize: 13 }}>{t('title')}</strong>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(markAllNotificationsRead())}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}
                >
                  {t('markAllRead')}
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>{t('empty')}</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: n.is_read ? 'transparent' : 'rgba(29,106,222,0.06)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700 }}>{notifTitle(n)}</div>
                  {notifBody(n) && (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{notifBody(n)}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{formatDate(n.created_at, i18n.language)}</div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
