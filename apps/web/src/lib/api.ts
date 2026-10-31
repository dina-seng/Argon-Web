/**
 * Axios client for the Argon REST API.
 * Adds the current tab's Bearer token and clears expired sessions on 401.
 */
import axios, { type AxiosError } from 'axios';
import { clearAccessToken, clearToken, getToken } from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, headers: { Accept: 'application/json' } });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      if (error.config?.url === '/auth/refresh') clearToken();
      else clearAccessToken();
    }
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message;
      return Promise.reject(new Error(`API error ${status}${message ? `: ${message}` : ''}`));
    }
    return Promise.reject(new TypeError("Can't reach the server. Check your connection and try again."));
  },
);

export const api = {
  get: async <T>(path: string): Promise<T> => (await client.get<T>(path)).data,
  post: async <T>(path: string, body: unknown): Promise<T> => (await client.post<T>(path, body)).data,
};
