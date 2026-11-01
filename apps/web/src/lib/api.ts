/**
 * lib/api.ts – typed API client for the Argon REST API.
 * Attaches the Bearer token from session storage.
 * TODO: Handle 401 refresh once the auth module issues refresh tokens.
 * Axios client for the Argon REST API.
 * Adds the current tab's Bearer token and clears expired sessions on 401.
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<ApiError> | null;
    throw new ApiRequestError(res.status, body?.message ?? `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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
  patch: async <T>(path: string, body: unknown): Promise<T> => (await client.patch<T>(path, body)).data,
};
