import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  },
);

// Tai file (Excel...) tu API co dang nhap: lay blob roi kich hoat tai ve voi ten file server dat.
export async function taiFile(url, params) {
  const r = await api.get(url, { params, responseType: 'blob' });
  const ten = /filename\*=UTF-8''([^;]+)/.exec(r.headers['content-disposition'] || '')?.[1];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(r.data);
  a.download = ten ? decodeURIComponent(ten) : 'du-lieu.xlsx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const loiCua = (err) => err.response?.data?.message || 'Không kết nối được máy chủ';
