import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearSession: () => void;
}

// Примечание: для продакшена рекомендуется хранить refreshToken в httpOnly cookie,
// а не в localStorage (снижение риска кражи токена через XSS, см. SRS п.13.1).
// Здесь — упрощённый вариант для MVP/SSR-less клиента.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'turist-auth' },
  ),
);
