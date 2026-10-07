'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapView, MapViewHandle } from '@/components/map/MapView';
import { POICard } from '@/components/map/POICard';
import { TopHud } from '@/components/hud/TopHud';
import { QuestsShopLauncher } from '@/components/hud/QuestsShopLauncher';
import { BottomNav } from '@/components/nav/BottomNav';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { api, ApiError } from '@/lib/api';
import { Poi, Crystal } from '@/types';
import { Magnet } from 'lucide-react';

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

  // Фокусируем камеру на выбранной точке, не перемещая маркер игрока.
  useEffect(() => {
    if (selectedPoi) mapRef.current?.focusOnPoi(selectedPoi);
  }, [selectedPoi]);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  // Округляем позицию до ~100 м для ключа запроса — не дёргаем сервер на каждый метр GPS-шума
  const posKey = position ? `${position.lat.toFixed(3)},${position.lng.toFixed(3)}` : null;

  const { data: pois = [] } = useQuery<Poi[]>({
    queryKey: ['poi', 'list', posKey],
    queryFn: () => api.get<Poi[]>(position ? `/poi?lat=${position.lat}&lng=${position.lng}` : '/poi'),
    enabled: !!user,
  });
  const { data: welcome } = useQuery<{ completed: boolean; pointFound: boolean }>({ queryKey: ['game', 'welcome', user?.id], queryFn: () => api.get('/game/welcome'), enabled: !!user });
  const tutorialFocusPoi = welcome && !welcome.completed && !welcome.pointFound
    ? pois.find((poi) => poi.title === 'Открыть Челябинскую область') ?? null
    : null;
  const { data: secretPois = [] } = useQuery<Poi[]>({
    queryKey: ['game', 'secrets', 'nearby', posKey],
    queryFn: () => api.get<Poi[]>(`/game/secrets/nearby?lat=${position!.lat}&lng=${position!.lng}`),
    enabled: !!user && !!position && !!welcome?.completed,
    refetchInterval: 15_000,
  });

  const { data: crystals = [] } = useQuery<Crystal[]>({
    queryKey: ['crystals', 'nearby', posKey],
    queryFn: () => api.get<Crystal[]>(`/crystals/nearby?lat=${position!.lat}&lng=${position!.lng}`),
    enabled: !!user && !!position && !!welcome?.completed,
    refetchInterval: 15_000,
  });
  const { data: magnet } = useQuery<{ owned: boolean; ready: boolean; readyAt: string | null; cooldownMinutes: number }>({ queryKey: ['crystals', 'magnet-status'], queryFn: () => api.get('/crystals/magnet/status'), enabled: !!user, refetchInterval: 20_000 });
  const { data: compass } = useQuery<{ enabled: boolean; distanceMeters: number | null }>({ queryKey: ['game', 'secret-compass', posKey], queryFn: () => api.get(`/game/secrets/compass?lat=${position!.lat}&lng=${position!.lng}`), enabled: !!user && !!position, refetchInterval: 15_000 });

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

  async function handleMagnet() {
    if (!position || !magnet?.owned || !magnet.ready) return;
    try {
      const result = await api.post<{ count: number; reward: number }>('/crystals/magnet/collect', { lat: position.lat, lng: position.lng });
      if (user) updateUser({ wallet: { ...user.wallet, crystalsBalance: user.wallet.crystalsBalance + result.reward } });
      queryClient.invalidateQueries({ queryKey: ['crystals', 'nearby'] });
      queryClient.invalidateQueries({ queryKey: ['crystals', 'magnet-status'] });
      setCrystalMsg(`Магнит собрал ${result.count} бриллиантов · +${result.reward} 💎`);
      setTimeout(() => setCrystalMsg(null), 3500);
    } catch (error) {
      setCrystalMsg(error instanceof ApiError ? error.message : 'Не удалось включить магнит');
      setTimeout(() => setCrystalMsg(null), 3500);
    }
  }

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <MapView
        ref={mapRef}
        pois={[...pois, ...secretPois]}
        selectedPoi={selectedPoi}
        tutorialFocusPoi={tutorialFocusPoi}
        crystals={crystals}
        position={position}
        userAvatar={user.character?.avatarEmoji ?? '🙂'}
        onSelectPoi={selectPoi}
        onSelectCrystal={handleSelectCrystal}
      />
      <TopHud />
      {compass?.enabled && compass.distanceMeters != null && <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+76px)] z-20 -translate-x-1/2 rounded-full border border-brass/40 bg-black/65 px-3 py-1 text-[10px] text-parchment shadow-lg backdrop-blur"><span className="text-brass">Компас</span> · до секретной точки {compass.distanceMeters >= 1000 ? `${(compass.distanceMeters / 1000).toFixed(1)} км` : `${compass.distanceMeters} м`}</div>}
      {!selectedPoi && <QuestsShopLauncher showLeaderboard />}

      {!selectedPoi && secretPois[0] && (
        <button
          onClick={() => { mapRef.current?.focusOnPoi(secretPois[0]); selectPoi(secretPois[0]); }}
          className="hud-panel absolute left-3 z-20 flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-parchment shadow-lg backdrop-blur"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 296px)' }}
          aria-label={`Секретная точка, ${Math.round(secretPois[0].distanceMeters ?? 0)} метров`}
        >
          <img src="/assets/poi-markers/6.png" alt="" className="h-8 w-8 object-contain" />
          <span><span className="block text-xs">Секретная точка</span><span className="block font-mono text-[10px] text-parchment/70">{secretPois[0].distanceMeters! >= 1000 ? `${(secretPois[0].distanceMeters! / 1000).toFixed(1)} км` : `${Math.round(secretPois[0].distanceMeters!)} м`}</span></span>
        </button>
      )}

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
        <div className="pointer-events-none absolute bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))] right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Приблизить карту"
            className="pointer-events-auto"
          >
            <img src="/assets/icons/zoom-in.png" alt="" className="h-[43px] w-[43px]" />
          </button>
          {position && (
            <button
              onClick={() => mapRef.current?.recenterOnUser()}
              aria-label="Вернуться на мою позицию"
              className="pointer-events-auto"
            >
              <img src="/assets/icons/recenter.png" alt="" className="h-[43px] w-[43px]" />
            </button>
          )}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Отдалить карту"
            className="pointer-events-auto"
          >
            <img src="/assets/icons/zoom-out.png" alt="" className="h-[43px] w-[43px]" />
          </button>
        </div>
      )}

      {!selectedPoi && magnet?.owned && <button onClick={() => void handleMagnet()} disabled={!magnet.ready || !position} title={magnet.ready ? 'Собрать видимые бриллианты магнитом' : 'Магнит перезаряжается'} className="hud-panel absolute bottom-[calc(10.75rem+env(safe-area-inset-bottom,0px))] left-3 z-20 rounded-full p-3 text-sky-200 shadow-lg disabled:opacity-40"><Magnet size={21} /></button>}

      {selectedPoi && (
        <POICard
          poi={selectedPoi}
          position={position}
          onClose={() => selectPoi(null)}
          onShowOnMap={() => { mapRef.current?.focusOnPoi(selectedPoi); selectPoi(null); }}
        />
      )}

      {!selectedPoi && <BottomNav />}
    </main>
  );
}
