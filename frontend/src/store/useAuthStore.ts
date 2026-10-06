import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'turist-auth',
      version: 1,
      partialize: (state) => ({ user: state.user }) as AuthState,
      migrate: (persisted) => {
        const legacy = persisted as Partial<AuthState> | undefined;
        return { user: legacy?.user ?? null, accessToken: null } as AuthState;
      },
    },
  ),
);
