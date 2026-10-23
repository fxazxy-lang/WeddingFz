import type { ApiError } from '../../shared/types';

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** fetch() wrapper: JSON in, JSON out, typed errors. status 0 means the network failed. */
export async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new RequestError(0, 'Network error');
  }
  const data = (await response.json().catch(() => ({}))) as T & Partial<ApiError>;
  if (!response.ok) {
    throw new RequestError(response.status, data.error ?? response.statusText, data.code, data.fieldErrors);
  }
  return data;
}
