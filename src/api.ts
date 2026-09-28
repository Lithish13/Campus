import { ApiErrorResponse, ApiSuccessResponse } from './types';

const ENV_API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '';

let currentCsrfToken: string | undefined;
let currentBearerToken: string | undefined;

export function setAuthTokens(csrfToken?: string, bearerToken?: string): void {
  if (csrfToken !== undefined) currentCsrfToken = csrfToken;
  if (bearerToken !== undefined) {
    currentBearerToken = bearerToken;
    if (bearerToken) {
      localStorage.setItem('crx_session_token', bearerToken);
    } else {
      localStorage.removeItem('crx_session_token');
    }
  }
}

export function clearAuthTokens(): void {
  currentCsrfToken = undefined;
  currentBearerToken = undefined;
  localStorage.removeItem('crx_session_token');
}

export function getStoredBearerToken(): string | undefined {
  if (currentBearerToken) return currentBearerToken;
  const saved = localStorage.getItem('crx_session_token');
  if (saved) {
    currentBearerToken = saved;
    return saved;
  }
  return undefined;
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanBase = ENV_API_BASE.replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}${path}` : path;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredBearerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (currentCsrfToken) {
    headers['X-CSRF-Token'] = currentCsrfToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(resolveApiUrl(path), {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    let json: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
    try {
      json = (await res.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
    } catch {
      json = null;
    }

    if (!res.ok || !json || !json.success) {
      if (json && !json.success && json.error?.message) {
        throw new Error(json.error.message);
      }
      switch (res.status) {
        case 401:
          throw new Error('Authentication is required. Please sign in with your college account.');
        case 403:
          throw new Error('You do not have permission to perform this action.');
        case 404:
          throw new Error('The requested resource or endpoint could not be found.');
        case 413:
          throw new Error('The uploaded file exceeds the maximum allowed size limit.');
        case 429:
          throw new Error('Rate limit reached. Please wait a moment before trying again.');
        default:
          throw new Error('A server error occurred while processing your request.');
      }
    }

    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your network connection and try again.');
    }
    if (err instanceof TypeError) {
      throw new Error('Network connection failed. Unable to reach the campus server.');
    }
    throw err;
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function formatDateShort(iso?: string): string {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
