/**
 * lib/api.ts – typed API client for the Argon REST API.
 * Supports Bearer token injection, RFC 7807 error parsing, and full HTTP verbs.
 */
import { getToken } from './auth';
import type { ApiError } from '@argon/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiRequestError extends Error implements ApiError {
  public statusCode: number;
  public error: string;
  public details?: unknown;

  constructor(statusCode: number, error: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (typeof options.body === 'string' || options.body instanceof FormData || options.body instanceof Blob) {
      body = options.body as BodyInit;
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(options.body);
    }
  }

  const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = (await res.json()) as Record<string, unknown>;
    } catch {
      // not JSON
    }

    const statusCode =
      (typeof parsed.statusCode === 'number' ? parsed.statusCode : undefined) ??
      (typeof parsed.status === 'number' ? parsed.status : undefined) ??
      res.status;
    const error =
      (typeof parsed.error === 'string' ? parsed.error : undefined) ??
      (typeof parsed.title === 'string' ? parsed.title : undefined) ??
      res.statusText ??
      'API Error';
    const message =
      (typeof parsed.message === 'string' ? parsed.message : undefined) ??
      (typeof parsed.detail === 'string' ? parsed.detail : undefined) ??
      `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;

    throw new ApiRequestError(statusCode, error, message, parsed.details);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  return res.text() as unknown as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  request,
};
