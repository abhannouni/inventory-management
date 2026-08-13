import { api } from './client';
import type {
  Promo,
  PromoItem,
  PromoItemPicture,
  PromoPictureUploadersResponse,
  PromoUserPictureView,
} from '../types';

export interface PromoItemPayload {
  product_id: string;
  contenance: string;
  original_price: number;
  promo_price: number;
}

export interface CreatePromoPayload {
  title?: string;
  items: PromoItemPayload[];
}

export interface UpdatePromoItemPayload {
  contenance?: string;
  original_price?: number;
  promo_price?: number;
}

export interface PromoImportRowError {
  row: number;
  message: string;
}

export interface PromoImportResult {
  created: number;
  failed: number;
  errors: PromoImportRowError[];
  promo: Promo | null;
}

export interface FindPromosParams {
  from?: string;
  to?: string;
  search?: string;
  [key: string]: string | undefined;
}

export const promosApi = {
  getCurrent: () => api.get<Promo | null>('/promos/current'),
  listBatches: (params?: FindPromosParams) => api.get<Promo[]>('/promos', params),
  getBatch: (id: string) => api.get<Promo>(`/promos/${id}`),
  create: (payload: CreatePromoPayload) => api.post<Promo>('/promos', payload),
  importFromFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<PromoImportResult>('/promos/import', formData);
  },
  updateItem: (itemId: string, payload: UpdatePromoItemPayload) =>
    api.patch<PromoItem>(`/promos/items/${itemId}`, payload),
  removeItem: (itemId: string) => api.delete<void>(`/promos/items/${itemId}`),
  removeBatch: (id: string) => api.delete<void>(`/promos/${id}`),
  uploadPicture: (itemId: string, url: string) =>
    api.post<PromoItemPicture>(`/promos/items/${itemId}/picture`, { url }),
  removePicture: (itemId: string) => api.delete<void>(`/promos/items/${itemId}/picture`),
  listPictureUploaders: (promoId?: string) =>
    api.get<PromoPictureUploadersResponse>('/promos/pictures/users', { promo_id: promoId }),
  getUserPictureView: (userId: string, promoId?: string) =>
    api.get<PromoUserPictureView>(`/promos/pictures/users/${userId}`, { promo_id: promoId }),
};
