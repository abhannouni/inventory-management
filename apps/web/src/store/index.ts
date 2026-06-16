import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import regionsReducer from './slices/regionsSlice';
import storesReducer from './slices/storesSlice';
import productsReducer from './slices/productsSlice';
import productStoresReducer from './slices/productStoresSlice';
import visitsReducer from './slices/visitsSlice';
import auditItemsReducer from './slices/auditItemsSlice';
import reportsReducer from './slices/reportsSlice';
import schedulesReducer from './slices/schedulesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    regions: regionsReducer,
    stores: storesReducer,
    products: productsReducer,
    productStores: productStoresReducer,
    visits: visitsReducer,
    auditItems: auditItemsReducer,
    reports: reportsReducer,
    schedules: schedulesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
