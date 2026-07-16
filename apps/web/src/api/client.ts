const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const AUTH_PATHS_WITHOUT_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function setToken(token: string) {
  localStorage.setItem('access_token', token);
}

function clearToken() {
  localStorage.removeItem('access_token');
}

function unwrap<T>(json: unknown): T {
  return (json as { data?: T }).data !== undefined ? (json as { data: T }).data : (json as T);
}

// The access token is short-lived (15m) so it can be revoked quickly if
// compromised. Sessions stay alive across that expiry via the httpOnly
// refresh cookie: a single in-flight refresh is shared by every request that
// hits a 401 at the same time, so a page with several parallel data fetches
// doesn't fire a refresh per request or race writes to localStorage.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        if (!text) return null;
        const data = unwrap<{ access_token: string }>(JSON.parse(text));
        return data.access_token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function notifySessionExpired() {
  clearToken();
  window.dispatchEvent(new Event('auth:session-expired'));
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined | null>;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) url += `?${query}`;
  }

  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...init, headers, credentials: 'include' });

  if (response.status === 401 && !isRetry && !AUTH_PATHS_WITHOUT_RETRY.includes(path)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setToken(newToken);
      return request<T>(path, options, true);
    }
    notifySessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return unwrap<T>(JSON.parse(text));
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
