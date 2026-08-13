import { configureStore } from '@reduxjs/toolkit';
import authReducer, { clearSession } from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import rolesReducer from './slices/rolesSlice';
import regionsReducer from './slices/regionsSlice';
import storesReducer from './slices/storesSlice';
import productsReducer from './slices/productsSlice';
import productStoresReducer from './slices/productStoresSlice';
import visitsReducer from './slices/visitsSlice';
import auditItemsReducer from './slices/auditItemsSlice';
import reportsReducer from './slices/reportsSlice';
import schedulesReducer from './slices/schedulesSlice';
import sellOutReducer from './slices/sellOutSlice';
import settingsReducer from './slices/settingsSlice';
import productRequestsReducer from './slices/productRequestsSlice';
import promosReducer from './slices/promosSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    roles: rolesReducer,
    regions: regionsReducer,
    stores: storesReducer,
    products: productsReducer,
    productStores: productStoresReducer,
    visits: visitsReducer,
    auditItems: auditItemsReducer,
    reports: reportsReducer,
    schedules: schedulesReducer,
    sellOut: sellOutReducer,
    settings: settingsReducer,
    productRequests: productRequestsReducer,
    promos: promosReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Fired by the fetch client when a request's 401 can't be resolved by a
// silent token refresh (refresh cookie missing, expired, or revoked). This
// is the only path that should force a logout mid-session - everywhere else
// the user stays on the page with their in-progress data intact.
window.addEventListener('auth:session-expired', () => {
  store.dispatch(clearSession());
});
