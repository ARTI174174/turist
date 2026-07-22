'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { Poi, VisitAttemptStart, VisitCompleteResult } from '@/types';
import { GeoPosition } from '@/hooks/useGeolocation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

interface POICardProps {
  poi: Poi;
  position: GeoPosition | null;
  onClose: () => void;
}

type FlowState = 'idle' | 'walking' | 'dwelling' | 'ready' | 'submitting' | 'success' | 'review' | 'error';

export function POICard({ poi, position, onClose }: POICardProps) {
  const [flow, setFlow] = useState<FlowState>('idle');
  const [attempt, setAttempt] = useState<VisitAttemptStart | null>(null);
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reward, setReward] = useState<VisitCompleteResult | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef = useRef(position);
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Держим актуальную позицию в ref, чтобы обновления GPS (которые приходят очень
  // часто) не пересоздавали интервал heartbeat ниже — раньше именно из-за этого
  // 5-секундный таймер почти никогда не успевал сработать и точка "зависала".
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const distanceMeters = position
    ? haversine(position.lat, position.lng, poi.lat, poi.lng)
    : null;
  const withinGeofence = distanceMeters !== null && distanceMeters <= poi.geofenceRadiusM;

  async function handleStartExplore() {
    if (!position) return;
    try {
      setErrorMsg(null);
      const res = await api.post<VisitAttemptStart>('/visits/attempt', {
        poiId: poi.id,
        lat: position.lat,
        lng: position.lng,
        accuracyM: position.accuracyM,
      });
      setAttempt(res);
      setFlow(res.withinGeofence ? 'dwelling' : 'walking');
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Не удалось начать исследование точки');
      setFlow('error');
    }
  }

  // Периодический heartbeat, пока идёт отсчёт dwell-time (SRS FR-EXP-01/07, п.12.1 уровень 2)
  useEffect(() => {
    if (flow !== 'dwelling' || !attempt) return;

    heartbeatTimer.current = setInterval(async () => {
      const currentPosition = positionRef.current;
      if (!currentPosition) return;
      try {
        const res = await api.post<{ dwellSeconds: number; withinGeofence: boolean; dwellComplete?: boolean }>(
          `/visits/${attempt.attemptId}/heartbeat`,
          { lat: currentPosition.lat, lng: currentPosition.lng, accuracyM: currentPosition.accuracyM },
        );
        setDwellSeconds(res.dwellSeconds);
        if (res.dwellComplete) {
          setFlow('ready');
          if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        }
      } catch {
        /* сетевой сбой heartbeat не критичен — попробуем на следующем тике,
           при длительном отсутствии сети действие уйдёт в офлайн-очередь (см. lib/offline-queue) */
      }
    }, 5_000);

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [flow, attempt]);

  async function handleComplete() {
    if (!attempt) return;
    setFlow('submitting');
    try {
      const res = await api.post<VisitCompleteResult>(`/visits/${attempt.attemptId}/complete`);
      setReward(res);
      if (res.status === 'verified') {
        setFlow('success');
        if (res.xpAwarded && user) {
          updateUser({
            progress: { xp: user.progress.xp + res.xpAwarded, rankCode: user.progress.rankCode },
            wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance + (res.coinsAwarded ?? 0) },
          });
        }
        // Точка исчезает с карты сразу — сервер больше не отдаёт уже открытые этим игроком места
        queryClient.invalidateQueries({ queryKey: ['poi', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['quests', 'milestones'] });
      } else {
        setFlow('review');
      }
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Не удалось подтвердить посещение');
      setFlow('error');
    }
  }

  const alreadyKnownAsVisited = flow === 'success';

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-topo shadow-2xl"
      role="dialog"
      aria-label={poi.title}
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-stone/20 bg-parchment/95 px-4 py-3 backdrop-blur">
        <div>
          <span
            className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment"
            style={{ backgroundColor: poi.category.colorHex }}
          >
            {poi.category.title}
          </span>
          <h2 className="font-display text-lg text-ink">{poi.title}</h2>
        </div>
        <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-2 text-ink/60 hover:bg-black/5">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center gap-2 font-mono text-xs text-stone">
          <MapPin size={14} />
          {distanceMeters !== null ? `${Math.round(distanceMeters)} м от вас` : 'Определяем расстояние…'}
          <span className="ml-auto">Открыли: {poi.visitCount} игроков</span>
        </div>

        {poi.descriptionHistory && (
          <p className="text-sm leading-relaxed text-ink/80">{poi.descriptionHistory}</p>
        )}

        {poi.interestingFacts?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {poi.interestingFacts.map((fact, i) => (
              <span key={i} className="rounded-stamp border border-stone/30 bg-white/40 px-2 py-1 text-xs text-ink/70">
                {fact}
              </span>
            ))}
          </div>
        )}

        <ExploreControls
          flow={flow}
          withinGeofence={withinGeofence}
          requiredDwell={attempt?.requiredDwellSeconds ?? 20}
          dwellSeconds={dwellSeconds}
          reward={reward}
          errorMsg={errorMsg}
          geofenceRadiusM={poi.geofenceRadiusM}
          onStart={handleStartExplore}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}

function ExploreControls({
  flow,
  withinGeofence,
  requiredDwell,
  dwellSeconds,
  reward,
  errorMsg,
  geofenceRadiusM,
  onStart,
  onComplete,
}: {
  flow: FlowState;
  withinGeofence: boolean;
  requiredDwell: number;
  dwellSeconds: number;
  reward: VisitCompleteResult | null;
  errorMsg: string | null;
  geofenceRadiusM: number;
  onStart: () => void;
  onComplete: () => void;
}) {
  if (flow === 'success' && reward) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-forest/10 py-6 text-center">
        <Sparkles className="text-amber" size={28} />
        <p className="font-display text-lg text-forest">Точка открыта!</p>
        <p className="font-mono text-sm text-ink/70">
          +{reward.xpAwarded} баллов · +{reward.coinsAwarded} монет
        </p>
        {reward.newMilestones && reward.newMilestones.length > 0 && (
          <div className="mt-1 space-y-1">
            {reward.newMilestones.map((m) => (
              <p key={m.count} className="font-mono text-xs text-amber-dark">
                🏅 Веха «{m.count} мест» — ещё +{m.reward} баллов
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (flow === 'review') {
    return (
      <div className="rounded-2xl bg-amber/10 p-4 text-center text-sm text-ink/80">
        {reward?.message ?? 'Посещение отправлено на дополнительную проверку.'}
      </div>
    );
  }

  if (flow === 'error') {
    return (
      <div className="space-y-2">
        <p className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{errorMsg}</p>
        <button onClick={onStart} className="w-full rounded-full bg-forest py-3 font-display text-parchment">
          Попробовать снова
        </button>
      </div>
    );
  }

  if (flow === 'idle') {
    return (
      <button
        onClick={onStart}
        disabled={!withinGeofence}
        className="w-full rounded-full bg-forest py-3 font-display text-parchment disabled:opacity-40"
      >
        {withinGeofence ? 'Исследовать' : `Подойдите ближе (< ${geofenceRadiusM} м)`}
      </button>
    );
  }

  if (flow === 'walking' || flow === 'dwelling' || flow === 'submitting') {
    const progress = Math.min(100, Math.round((dwellSeconds / requiredDwell) * 100));
    return (
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div className="h-full bg-amber transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center font-mono text-xs text-ink/60">
          {flow === 'submitting' ? 'Подтверждаем…' : `Оставайтесь на месте: ${dwellSeconds}/${requiredDwell} сек.`}
        </p>
      </div>
    );
  }

  if (flow === 'ready') {
    return (
      <button
        onClick={onComplete}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-amber py-3 font-display text-ink"
      >
        <CheckCircle2 size={18} /> Исследовать
      </button>
    );
  }

  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
