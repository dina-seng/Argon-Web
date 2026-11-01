/**
 * Typed Axios client for the Argon REST API.
 * Adds the current tab's access token and clears expired sessions on 401.
 */
import axios, { type AxiosError } from 'axios';
import { clearAccessToken, clearToken, getToken } from './auth';

import type { ApiError } from '@argon/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, headers: { Accept: 'application/json' } });

/** Thrown for non-2xx responses. `status` is the HTTP status code. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

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
      const { status, data } = error.response;
      return Promise.reject(new ApiRequestError(status, data?.message ?? `API error ${status}`));
    }

    return Promise.reject(new TypeError("Can't reach the server. Check your connection and try again."));
  },
);

export const api = {
  get: async <T>(path: string): Promise<T> => (await client.get<T>(path)).data,
  post: async <T>(path: string, body: unknown): Promise<T> => (await client.post<T>(path, body)).data,
  patch: async <T>(path: string, body: unknown): Promise<T> => (await client.patch<T>(path, body)).data,
};
