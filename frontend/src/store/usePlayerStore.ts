import { create } from 'zustand';
import { Poi, VisitAttemptStart } from '@/types';

interface PlayerState {
  selectedPoi: Poi | null;
  activeAttempt: VisitAttemptStart | null;
  dwellSeconds: number;
  selectPoi: (poi: Poi | null) => void;
  setActiveAttempt: (attempt: VisitAttemptStart | null) => void;
  setDwellSeconds: (s: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  selectedPoi: null,
  activeAttempt: null,
  dwellSeconds: 0,
  selectPoi: (poi) => set({ selectedPoi: poi }),
  setActiveAttempt: (attempt) => set({ activeAttempt: attempt, dwellSeconds: 0 }),
  setDwellSeconds: (s) => set({ dwellSeconds: s }),
  reset: () => set({ selectedPoi: null, activeAttempt: null, dwellSeconds: 0 }),
}));
