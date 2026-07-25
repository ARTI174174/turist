'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapView, MapViewHandle } from '@/components/map/MapView';
import { POICard } from '@/components/map/POICard';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { api, ApiError } from '@/lib/api';
import { Poi, Crystal } from '@/types';

export default function MapPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { position, error: geoError } = useGeolocation();
  const selectedPoi = usePlayerStore((s) => s.selectedPoi);
  const selectPoi = usePlayerStore((s) => s.selectPoi);
  const [hydrated, setHydrated] = useState(false);
  const [crystalMsg, setCrystalMsg] = useState<string | null>(null);
  const [collectingCrystal, setCollectingCrystal] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);
  const queryClient = useQueryClient();

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const { data: pois = [] } = useQuery<Poi[]>({
    queryKey: ['poi', 'list'],
    queryFn: () => api.get<Poi[]>('/poi'),
    enabled: !!user,
  });

  // Округляем позицию до ~100 м для ключа запроса — не дёргаем сервер на каждый метр GPS-шума
  const posKey = position ? `${position.lat.toFixed(3)},${position.lng.toFixed(3)}` : null;

  const { data: crystals = [] } = useQuery<Crystal[]>({
    queryKey: ['crystals', 'nearby', posKey],
    queryFn: () => api.get<Crystal[]>(`/crystals/nearby?lat=${position!.lat}&lng=${position!.lng}`),
    enabled: !!user && !!position,
    refetchInterval: 15_000,
  });

  async function handleSelectCrystal(crystal: Crystal) {
    if (!position || collectingCrystal) return;
    setCollectingCrystal(true);
    setCrystalMsg(null);
    try {
      const res = await api.post<{ success: boolean; reward: number }>(`/crystals/${crystal.id}/collect`, {
        lat: position.lat,
        lng: position.lng,
      });
      setCrystalMsg(`+${res.reward} 💎`);
      if (user) {
        updateUser({ wallet: { ...user.wallet, crystalsBalance: user.wallet.crystalsBalance + res.reward } });
      }
      queryClient.invalidateQueries({ queryKey: ['crystals', 'nearby'] });
    } catch (e) {
      setCrystalMsg(e instanceof ApiError ? e.message : 'Не удалось забрать кристалл');
    } finally {
      setCollectingCrystal(false);
      setTimeout(() => setCrystalMsg(null), 3000);
    }
  }

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <MapView
        ref={mapRef}
        pois={pois}
        crystals={crystals}
        position={position}
        onSelectPoi={selectPoi}
        onSelectCrystal={handleSelectCrystal}
      />
      <TopHud />

      {geoError && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}>
          <p className="pointer-events-auto rounded-full bg-danger/90 px-4 py-2 text-center text-xs text-parchment shadow-lg">
            {geoError}
          </p>
        </div>
      )}

      {crystalMsg && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}>
          <p className="flex items-center gap-1 rounded-full bg-forest px-4 py-2 text-center text-xs text-parchment shadow-lg">
            <img src="/assets/icons/diamond.png" alt="" className="h-4 w-4" /> {crystalMsg}
          </p>
        </div>
      )}

      {/* Управление картой: приблизить / отдалить / вернуться на себя */}
      {!selectedPoi && (
        <div className="pointer-events-none absolute bottom-24 right-3 z-20 flex flex-col gap-2">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Приблизить карту"
            className="pointer-events-auto"
          >
            <img src="/assets/icons/zoom-in.png" alt="" className="h-12 w-12" />
          </button>
          {position && (
            <button
              onClick={() => mapRef.current?.recenterOnUser()}
              aria-label="Вернуться на мою позицию"
              className="pointer-events-auto"
            >
              <img src="/assets/icons/recenter.png" alt="" className="h-12 w-12" />
            </button>
          )}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Отдалить карту"
            className="pointer-events-auto"
          >
            <img src="/assets/icons/zoom-out.png" alt="" className="h-12 w-12" />
          </button>
        </div>
      )}

      {selectedPoi && (
        <POICard poi={selectedPoi} position={position} onClose={() => selectPoi(null)} />
      )}

      {!selectedPoi && <BottomNav />}
    </main>
  );
}
