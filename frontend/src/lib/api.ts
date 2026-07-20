import { useAuthStore } from '@/store/useAuthStore';
import { AuthResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  code: string;
  details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Пытается обновить access-токен по refresh-токену.
 * Возвращает true при успехе. При неудаче — очищает сессию
 * (чтобы UI не оставался в "молчаливо сломанном" состоянии, SRS п.13.1).
 * Несколько параллельных 401 схлопываются в один запрос обновления.
 */
function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const data: AuthResponse = await res.json();
      useAuthStore.getState().setSession(data.user, data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // Access-токен истёк (живёт 15 мин) — пробуем один раз тихо обновить его
  // и повторить запрос, вместо того чтобы UI молча оставался без данных.
  if (res.status === 401 && allowRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    // Обновить не удалось — сессия действительно недействительна,
    // возвращаем пользователя на экран входа.
    useAuthStore.getState().clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError('SESSION_EXPIRED', 'Сессия истекла, требуется повторный вход');
  }

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* без тела ответа */
    }
    const err = body?.error;
    throw new ApiError(err?.code ?? 'UNKNOWN_ERROR', err?.message ?? 'Ошибка запроса', err?.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
