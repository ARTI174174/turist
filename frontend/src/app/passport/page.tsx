'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { api } from '@/lib/api';
import { Poi } from '@/types';

interface PassportVisit {
  id: string;
  xpAwarded: number;
  coinsAwarded: number;
  note: string | null;
  visitedAt: string;
  poi: Poi;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  hard: 'Сложно',
  medium: 'Средне',
  easy: 'Легко',
};

export default function PassportPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const { data: visits = [] } = useQuery<PassportVisit[]>({
    queryKey: ['passport'],
    queryFn: () => api.get<PassportVisit[]>('/visits/passport'),
    enabled: !!user,
  });

  if (!hydrated || !user) return null;

  const xp = user.progress?.xp ?? 0;
  const { level } = resolveLevel(xp);
  const totalKm = 0; // placeholder — считать по факту переходов между точками, следующий шаг

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-forest-dark">
      <TopHud />

      <div
        className="h-full overflow-y-auto bg-topo px-4 pb-28"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="passport-stamp h-14 w-14 shrink-0 text-sm font-display">
            {user.nickname.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-lg text-ink">{user.nickname}</p>
            <p className="text-xs text-stone">Уровень {level} · {visits.length} мест открыто</p>
          </div>
        </div>

        <p className="mb-2 font-display text-sm text-ink">Посещённые места</p>
        <p className="mb-3 text-xs text-stone">Сначала самые сложные — так интереснее вспоминать поход</p>

        <div className="space-y-3">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} />
          ))}
          {visits.length === 0 && (
            <p className="rounded-2xl bg-white/40 p-4 text-center text-sm text-stone">
              Пока ни одного места — отправляйся в поход!
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function VisitCard({ visit }: { visit: PassportVisit }) {
  const [note, setNote] = useState(visit.note ?? '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  async function saveNote() {
    setSaving(true);
    try {
      await api.patch(`/visits/${visit.id}/note`, { note: note.slice(0, 50) });
      queryClient.invalidateQueries({ queryKey: ['passport'] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/50 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <span
            className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment"
            style={{ backgroundColor: visit.poi.category.colorHex }}
          >
            {DIFFICULTY_LABEL[visit.poi.difficulty] ?? visit.poi.difficulty}
          </span>
          <p className="font-display text-sm text-ink">{visit.poi.title}</p>
        </div>
        <span className="whitespace-nowrap font-mono text-[11px] text-stone">
          +{visit.xpAwarded} баллов
        </span>
      </div>

      {editing ? (
        <div className="mt-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 50))}
            placeholder="Заметка о месте (до 50 символов)"
            className="w-full rounded-lg border border-stone/30 bg-white/70 px-2 py-1.5 text-xs text-ink outline-none focus:border-forest"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[10px] text-stone">{note.length}/50</span>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-[11px] text-stone">
                Отмена
              </button>
              <button onClick={saveNote} disabled={saving} className="text-[11px] font-semibold text-forest">
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="mt-1 text-left text-xs text-stone/80">
          {note ? `📝 ${note}` : '+ добавить заметку'}
        </button>
      )}
    </div>
  );
}
