'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AvatarImage } from '@/components/character/AvatarImage';

interface PlayerRow { rank: number; id: string; nickname: string; avatar: string; xp: number; level: number; visits: number }

export function LeaderboardPanel() {
  const { data = [], isLoading } = useQuery<PlayerRow[]>({ queryKey: ['game', 'leaderboard'], queryFn: () => api.get('/game/leaderboard') });
  return <div className="space-y-2">
    <p className="mb-3 text-xs text-parchment/65">Путешественники с наибольшим опытом</p>
    {isLoading && <p className="text-center text-sm text-stone">Собираем список…</p>}
    {data.map((player) => <div key={player.id} className="adventure-card flex items-center gap-2 rounded-xl px-3 py-2">
      <span className="w-6 text-center font-display text-sm text-brass">{player.rank}</span>
      <AvatarImage value={player.avatar} className="avatar-portrait h-9 w-9 rounded-full border border-brass p-0.5" imageClassName="rounded-full" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-parchment">{player.nickname}</p><p className="text-[10px] text-stone">Ур. {player.level} · {player.visits} мест</p></div>
      <span className="font-mono text-[10px] text-parchment/70">{player.xp.toLocaleString('ru-RU')} XP</span>
    </div>)}
    {!isLoading && !data.length && <p className="text-center text-xs text-stone">Пока никто не попал в рейтинг.</p>}
  </div>;
}
