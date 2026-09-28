'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, UserPlus, Check, X, MapPin, CalendarDays, ChevronRight } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { AvatarImage } from '@/components/character/AvatarImage';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';
import { Poi } from '@/types';
import { POICard } from '@/components/map/POICard';

interface Friend {
  id: string; nickname: string; avatarEmoji: string; xp: number; level: number; borderColor: string; friendCount: number;
}
interface IncomingRequest {
  friendshipId: string; nickname: string; avatarEmoji: string; createdAt: string;
}
interface OutgoingRequest {
  friendshipId: string; nickname: string; avatarEmoji: string; createdAt: string;
}
interface FoundUser {
  id: string; nickname: string; avatarEmoji: string; level: number;
  friendshipStatus: 'pending' | 'accepted' | 'declined' | null;
}
interface FriendProfile extends Friend {
  visitedPlaces: { id: string; poiId: string; title: string; category: string; difficulty: string; visitedAt: string; poi: Poi }[];
}

export default function SocialPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  useEffect(() => setHydrated(true), []);
  useEffect(() => { if (hydrated && !user) router.replace('/login'); }, [hydrated, user, router]);
  if (!hydrated || !user) return null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <TopHud />
      {selectedFriend ? (
        <FriendProfileView friendId={selectedFriend} onBack={() => setSelectedFriend(null)} />
      ) : (
        <FriendsListView onSelectFriend={setSelectedFriend} />
      )}
      {!selectedFriend && <BottomNav />}
    </main>
  );
}

function FriendsListView({ onSelectFriend }: { onSelectFriend: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: friends = [] } = useQuery<Friend[]>({ queryKey: ['social', 'friends'], queryFn: () => api.get<Friend[]>('/social/friends') });
  const { data: requests = [] } = useQuery<IncomingRequest[]>({ queryKey: ['social', 'requests'], queryFn: () => api.get<IncomingRequest[]>('/social/friends/requests') });
  const { data: outgoingRequests = [] } = useQuery<OutgoingRequest[]>({ queryKey: ['social', 'outgoing-requests'], queryFn: () => api.get<OutgoingRequest[]>('/social/friends/requests/outgoing'), refetchInterval: 15_000 });
  const { data: foundUser, isFetching: searching } = useQuery<FoundUser | null>({
    queryKey: ['social', 'search', searchTerm],
    queryFn: () => api.get<FoundUser | null>(`/social/search?nickname=${encodeURIComponent(searchTerm)}`),
    enabled: searchTerm.length >= 3,
  });

  async function addFriend(nickname: string) {
    setActionError(null);
    try {
      await api.post('/social/friends/request', { nickname });
      await queryClient.invalidateQueries({ queryKey: ['social', 'search'] });
      await queryClient.invalidateQueries({ queryKey: ['social', 'outgoing-requests'] });
      setSearchTerm(''); setSearchInput('');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Не удалось отправить заявку');
    }
  }
  async function respond(friendshipId: string, accept: boolean) {
    await api.post(`/social/friends/${friendshipId}/${accept ? 'accept' : 'decline'}`);
    queryClient.invalidateQueries({ queryKey: ['social', 'requests'] });
    queryClient.invalidateQueries({ queryKey: ['social', 'friends'] });
  }

  return (
    <div className="bg-adventure h-full overflow-y-auto px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 118px)' }}>
      <h1 className="mb-4 font-display text-xl text-ink">Друзья</h1>
      <form onSubmit={(event) => { event.preventDefault(); setSearchTerm(searchInput.trim()); }} className="mb-4 flex gap-2">
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Точный ник игрока…" className="flex-1 rounded-xl border border-stone/30 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-forest" />
        <button type="submit" aria-label="Искать" className="adventure-primary rounded-xl px-3"><Search size={18} /></button>
      </form>
      {searchTerm.length >= 3 && <div className="adventure-card mb-5 rounded-2xl p-3">
        {searching ? <p className="text-xs text-stone">Ищем…</p> : foundUser ? <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><AvatarImage value={foundUser.avatarEmoji} className="avatar-portrait h-11 w-11 rounded-full border-2 border-brass p-0.5 text-xl" imageClassName="rounded-full" /><div><p className="text-sm text-ink">{foundUser.nickname}</p><p className="text-[11px] text-stone">Уровень {foundUser.level}</p></div></div>
          {foundUser.friendshipStatus === 'accepted' ? <span className="text-[11px] text-forest">Уже друзья</span> : foundUser.friendshipStatus === 'pending' ? <span className="text-[11px] text-stone">Заявка отправлена</span> : <button onClick={() => void addFriend(foundUser.nickname)} className="adventure-primary flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px]"><UserPlus size={14} /> Добавить</button>}
        </div> : <p className="text-xs text-stone">Игрок с таким ником не найден</p>}
      </div>}
      {actionError && <p className="mb-3 rounded-xl bg-danger/10 p-2 text-xs text-danger">{actionError}</p>}
      {requests.length > 0 && <section className="mb-5"><p className="mb-2 font-display text-sm text-ink">Заявки в друзья</p><div className="space-y-2">
        {requests.map((request) => <div key={request.friendshipId} className="adventure-card flex items-center justify-between rounded-2xl p-3"><div className="flex items-center gap-2"><AvatarImage value={request.avatarEmoji} className="avatar-portrait h-10 w-10 rounded-full border-2 border-brass p-0.5 text-lg" imageClassName="rounded-full" /><span className="text-sm text-ink">{request.nickname}</span></div><div className="flex gap-2"><button onClick={() => void respond(request.friendshipId, true)} aria-label="Принять" className="adventure-primary rounded-full p-1.5"><Check size={14} /></button><button onClick={() => void respond(request.friendshipId, false)} aria-label="Отклонить" className="rounded-full bg-danger/80 p-1.5 text-parchment"><X size={14} /></button></div></div>)}
      </div></section>}
      {outgoingRequests.length > 0 && <section className="mb-5"><p className="mb-2 font-display text-sm text-ink">Отправленные заявки</p><div className="space-y-2">
        {outgoingRequests.map((request) => <div key={request.friendshipId} className="adventure-card flex items-center gap-2 rounded-2xl p-3"><AvatarImage value={request.avatarEmoji} className="avatar-portrait h-10 w-10 rounded-full border-2 border-brass p-0.5 text-lg" imageClassName="rounded-full" /><span className="min-w-0 flex-1 truncate text-sm text-ink">{request.nickname}</span><span className="shrink-0 text-[10px] text-stone">Ожидает ответа</span></div>)}
      </div></section>}
      <p className="mb-2 font-display text-sm text-ink">Мои друзья ({friends.length})</p>
      <div className="space-y-2">{friends.map((friend) => <button key={friend.id} onClick={() => onSelectFriend(friend.id)} className="adventure-card flex w-full items-center gap-3 rounded-2xl p-3 text-left">
        <AvatarImage value={friend.avatarEmoji} className="avatar-portrait h-12 w-12 rounded-full border-[3px] p-0.5 text-xl" imageClassName="rounded-full" style={{ borderColor: friend.borderColor }} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{friend.nickname}</span><span className="font-mono text-[11px] text-stone">Ур. {friend.level} · Друзей: {friend.friendCount}</span></span>
        <span className="text-[10px] text-stone">Достижения →</span>
      </button>)}{friends.length === 0 && <p className="adventure-card rounded-2xl p-4 text-center text-sm text-stone">Пока нет друзей — найди кого-нибудь по нику выше</p>}</div>
    </div>
  );
}

function FriendProfileView({ friendId, onBack }: { friendId: string; onBack: () => void }) {
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const { data, isLoading, error } = useQuery<FriendProfile>({
    queryKey: ['social', 'friend-profile', friendId],
    queryFn: () => api.get<FriendProfile>(`/social/friends/${friendId}/profile`),
  });
  return <div className="bg-adventure h-full overflow-y-auto px-4 pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 112px)' }}>
    <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-parchment/75"><ArrowLeft size={18} /> К друзьям</button>
    {isLoading && <p className="text-sm text-stone">Загружаем достижения…</p>}
    {error && <p className="adventure-card rounded-xl p-3 text-sm text-danger">Не удалось загрузить профиль друга.</p>}
    {data && <>
      <div className="adventure-card mb-5 flex items-center gap-3 rounded-2xl p-3">
        <AvatarImage value={data.avatarEmoji} className="avatar-portrait h-14 w-14 rounded-full border-[3px] p-0.5 text-2xl" imageClassName="rounded-full" />
        <div><h1 className="font-display text-lg text-ink">{data.nickname}</h1><p className="text-xs text-stone">Уровень {data.level} · Друзей: {data.friendCount}</p></div>
      </div>
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm text-ink"><MapPin size={16} /> Паспорт путешественника · {data.visitedPlaces.length}</h2>
      <div className="mb-5 space-y-2">{data.visitedPlaces.map((place) => <button key={place.id} onClick={() => setSelectedPoi(place.poi)} aria-label={`Открыть ${place.title} и комментарии`} className="adventure-card flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left">
        <span className="min-w-0"><span className="block truncate text-sm text-parchment">{place.title}</span><span className="block text-[10px] text-stone">{place.category} · {place.difficulty}</span></span><span className="flex shrink-0 items-center gap-1 text-[10px] text-stone">{new Date(place.visitedAt).toLocaleDateString('ru-RU')}<ChevronRight size={14} /></span>
      </button>)}{data.visitedPlaces.length === 0 && <p className="text-xs text-stone">Пока нет посещённых мест.</p>}</div>
    </>}
    {selectedPoi && <POICard poi={selectedPoi} position={null} hideExplore onClose={() => setSelectedPoi(null)} />}
  </div>;
}
