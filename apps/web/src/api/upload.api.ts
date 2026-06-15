import { api } from './client';

export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ url: string }>('/upload', formData);
  },
};
