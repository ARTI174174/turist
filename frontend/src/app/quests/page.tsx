'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPinned, X } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { api, ApiError } from '@/lib/api';

interface Milestone {
  count: number;
  reward: number;
  crystalReward: number;
  achieved: boolean;
  claimed: boolean;
  progress: number;
}

export default function QuestsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['quests', 'milestones'],
    queryFn: () => api.get<Milestone[]>('/quests/milestones'),
    enabled: !!user,
  });

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <TopHud />

      <div
        className="h-full overflow-y-auto bg-topo px-4 pb-28"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
      >
        <h1 className="mb-1 font-display text-xl text-ink">Задания</h1>
        <p className="mb-5 text-sm text-stone">Посещай новые места и получай баллы за вехи</p>

        <div className="space-y-3">
          {milestones.map((m) => (
            <MilestoneCard key={m.count} milestone={m} />
          ))}
          {milestones.length === 0 && (
            <p className="text-sm text-stone">Загрузка заданий…</p>
          )}
        </div>

        <button
          onClick={() => setSuggestOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-forest/40 py-3 font-display text-sm text-forest"
        >
          <MapPinned size={18} /> Предложить точку
        </button>
      </div>

      <BottomNav />

      {suggestOpen && <SuggestPointModal onClose={() => setSuggestOpen(false)} />}
    </main>
  );
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const pct = Math.round((milestone.progress / milestone.count) * 100);
  return (
    <div className="rounded-2xl bg-white/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm text-ink">Посетить {milestone.count} мест</span>
        {milestone.claimed ? (
          <CheckCircle2 size={18} className="text-forest" />
        ) : (
          <span className="font-mono text-xs text-amber-dark">
            +{milestone.reward} баллов · +{milestone.crystalReward} 💎
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-amber transition-all"
          style={{ width: `${milestone.claimed ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-[11px] text-stone">
        {milestone.progress}/{milestone.count}
      </p>
    </div>
  );
}

function SuggestPointModal({ onClose }: { onClose: () => void }) {
  const { position } = useGeolocation({ watch: false });
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const trimmedLength = description.trim().length;
  const canSubmit = trimmedLength >= 10 && trimmedLength <= 50 && !!position;

  async function handleSubmit() {
    if (!canSubmit || !position) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/poi-submissions/quick', {
        description: description.trim(),
        lat: position.lat,
        lng: position.lng,
      });
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['quests', 'milestones'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось отправить предложение');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-parchment p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Предложить точку</h2>
          <button onClick={onClose} aria-label="Закрыть" className="text-ink/50">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-forest" />
            <p className="text-sm text-ink/80">Спасибо! Точка отправлена на рассмотрение.</p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-forest py-2.5 font-display text-parchment"
            >
              Готово
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-stone">
              Опиши, что это за место (10–50 символов). Координаты возьмём из твоего текущего
              местоположения — предложение нужно отправлять, находясь на месте.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 50))}
              rows={3}
              placeholder="Например: красивый родник у старой мельницы"
              className="w-full resize-none rounded-xl border border-stone/30 bg-white/70 p-3 text-sm text-ink outline-none focus:border-forest"
            />
            <div className="mt-1 flex justify-between text-[11px] text-stone">
              <span>{!position ? 'Определяем ваше местоположение…' : ' '}</span>
              <span>{trimmedLength}/50</span>
            </div>

            {error && <p className="mt-2 rounded-xl bg-danger/10 p-2 text-xs text-danger">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="mt-4 w-full rounded-full bg-forest py-3 font-display text-parchment disabled:opacity-40"
            >
              {loading ? 'Отправляем…' : 'Отправить на рассмотрение'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
