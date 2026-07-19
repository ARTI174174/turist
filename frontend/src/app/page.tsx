'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MapView } from '@/components/map/MapView';
import { POICard } from '@/components/map/POICard';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { api } from '@/lib/api';
import { Poi } from '@/types';

export default function MapHomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { position, error: geoError } = useGeolocation();
  const selectedPoi = usePlayerStore((s) => s.selectedPoi);
  const selectPoi = usePlayerStore((s) => s.selectPoi);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const { data: pois = [] } = useQuery<Poi[]>({
    queryKey: ['poi', 'list'],
    queryFn: () => api.get<Poi[]>('/poi'),
    enabled: !!user,
  });

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-forest-dark">
      <MapView pois={pois} position={position} onSelectPoi={selectPoi} />
      <TopHud />

      {geoError && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
          <p className="pointer-events-auto rounded-full bg-danger/90 px-4 py-2 text-center text-xs text-parchment shadow-lg">
            {geoError}
          </p>
        </div>
      )}

      {selectedPoi && (
        <POICard poi={selectedPoi} position={position} onClose={() => selectPoi(null)} />
      )}

      {!selectedPoi && <BottomNav />}
    </main>
  );
}
