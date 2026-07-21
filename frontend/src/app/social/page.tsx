'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Send, UserPlus, Check, X } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';

interface Friend {
  id: string;
  nickname: string;
  avatarEmoji: string;
  xp: number;
  level: number;
  borderColor: string;
}

interface IncomingRequest {
  friendshipId: string;
  nickname: string;
  avatarEmoji: string;
  createdAt: string;
}

interface FoundUser {
  id: string;
  nickname: string;
  avatarEmoji: string;
  level: number;
  friendshipStatus: 'pending' | 'accepted' | 'declined' | null;
}

interface ChatRoomSummary {
  roomId: string;
  otherUser: { id: string; nickname: string; avatarEmoji: string } | null;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
}

interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

type View = { type: 'list' } | { type: 'chat'; roomId: string; friend: { nickname: string; avatarEmoji: string } };

export default function SocialPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>({ type: 'list' });

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-forest-dark">
      <TopHud />
      {view.type === 'list' ? (
        <FriendsListView onOpenChat={(roomId, friend) => setView({ type: 'chat', roomId, friend })} />
      ) : (
        <ChatView roomId={view.roomId} friend={view.friend} onBack={() => setView({ type: 'list' })} />
      )}
      {view.type === 'list' && <BottomNav />}
    </main>
  );
}

// ------------------------------------------------------------
// Список друзей + поиск + входящие заявки
// ------------------------------------------------------------
function FriendsListView({
  onOpenChat,
}: {
  onOpenChat: (roomId: string, friend: { nickname: string; avatarEmoji: string }) => void;
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openingChat, setOpeningChat] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ['social', 'friends'],
    queryFn: () => api.get<Friend[]>('/social/friends'),
    refetchInterval: 15_000,
  });

  const { data: requests = [] } = useQuery<IncomingRequest[]>({
    queryKey: ['social', 'requests'],
    queryFn: () => api.get<IncomingRequest[]>('/social/friends/requests'),
    refetchInterval: 15_000,
  });

  const { data: foundUser, isFetching: searching } = useQuery<FoundUser | null>({
    queryKey: ['social', 'search', searchTerm],
    queryFn: () => api.get<FoundUser | null>(`/social/search?nickname=${encodeURIComponent(searchTerm)}`),
    enabled: searchTerm.length >= 3,
  });

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  }

  async function handleAddFriend(nickname: string) {
    setActionError(null);
    try {
      await api.post('/social/friends/request', { nickname });
      queryClient.invalidateQueries({ queryKey: ['social', 'search'] });
      setSearchTerm(''); // сброс, чтобы карточка поиска обновилась/скрылась
      setSearchInput('');
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Не удалось отправить заявку');
    }
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    await api.post(`/social/friends/${friendshipId}/${accept ? 'accept' : 'decline'}`);
    queryClient.invalidateQueries({ queryKey: ['social', 'requests'] });
    queryClient.invalidateQueries({ queryKey: ['social', 'friends'] });
  }

  async function handleOpenChat(friend: Friend) {
    setOpeningChat(true);
    try {
      const room = await api.post<{ id: string }>(`/social/chat/rooms/${friend.id}`);
      onOpenChat(room.id, { nickname: friend.nickname, avatarEmoji: friend.avatarEmoji });
    } finally {
      setOpeningChat(false);
    }
  }

  return (
    <div
      className="h-full overflow-y-auto bg-topo px-4 pb-28"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 90px)' }}
    >
      <h1 className="mb-4 font-display text-xl text-ink">Друзья</h1>

      {/* Поиск по точному нику */}
      <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Точный ник игрока…"
          className="flex-1 rounded-xl border border-stone/30 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-forest"
        />
        <button type="submit" className="rounded-xl bg-forest px-3 text-parchment" aria-label="Искать">
          <Search size={18} />
        </button>
      </form>

      {searchTerm.length >= 3 && (
        <div className="mb-5 rounded-2xl bg-white/50 p-3">
          {searching ? (
            <p className="text-xs text-stone">Ищем…</p>
          ) : foundUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{foundUser.avatarEmoji}</span>
                <div>
                  <p className="text-sm text-ink">{foundUser.nickname}</p>
                  <p className="text-[11px] text-stone">Уровень {foundUser.level}</p>
                </div>
              </div>
              {foundUser.friendshipStatus === 'accepted' ? (
                <span className="text-[11px] text-forest">Уже друзья</span>
              ) : foundUser.friendshipStatus === 'pending' ? (
                <span className="text-[11px] text-stone">Заявка отправлена</span>
              ) : (
                <button
                  onClick={() => handleAddFriend(foundUser.nickname)}
                  className="flex items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-[11px] text-parchment"
                >
                  <UserPlus size={14} /> Добавить
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone">Игрок с таким ником не найден</p>
          )}
        </div>
      )}

      {actionError && <p className="mb-3 rounded-xl bg-danger/10 p-2 text-xs text-danger">{actionError}</p>}

      {/* Входящие заявки */}
      {requests.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-display text-sm text-ink">Заявки в друзья</p>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.friendshipId} className="flex items-center justify-between rounded-2xl bg-amber/10 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.avatarEmoji}</span>
                  <span className="text-sm text-ink">{r.nickname}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(r.friendshipId, true)}
                    aria-label="Принять"
                    className="rounded-full bg-forest p-1.5 text-parchment"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRespond(r.friendshipId, false)}
                    aria-label="Отклонить"
                    className="rounded-full bg-danger/80 p-1.5 text-parchment"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список друзей, отсортирован сервером по баллам */}
      <p className="mb-2 font-display text-sm text-ink">Мои друзья ({friends.length})</p>
      <div className="space-y-2">
        {friends.map((f) => (
          <button
            key={f.id}
            onClick={() => handleOpenChat(f)}
            disabled={openingChat}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/50 p-3 text-left disabled:opacity-60"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl"
              style={{ border: `3px solid ${f.borderColor}` }}
            >
              {f.avatarEmoji}
            </div>
            <div className="flex-1">
              <p className="text-sm text-ink">{f.nickname}</p>
              <p className="font-mono text-[11px] text-stone">Уровень {f.level} · {f.xp} баллов</p>
            </div>
          </button>
        ))}
        {friends.length === 0 && (
          <p className="rounded-2xl bg-white/40 p-4 text-center text-sm text-stone">
            Пока нет друзей — найди кого-нибудь по нику выше
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Экран чата — текст + эмодзи, свои сообщения справа, чужие слева
// ------------------------------------------------------------
function ChatView({
  roomId,
  friend,
  onBack,
}: {
  roomId: string;
  friend: { nickname: string; avatarEmoji: string };
  onBack: () => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['social', 'chat', roomId],
    queryFn: () => api.get<ChatMessage[]>(`/social/chat/rooms/${roomId}/messages`),
    refetchInterval: 3_000, // упрощённый "реалтайм" через быстрый опрос — полноценный WebSocket будет следующим шагом
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    try {
      await api.post(`/social/chat/rooms/${roomId}/messages`, { content });
      queryClient.invalidateQueries({ queryKey: ['social', 'chat', roomId] });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-topo" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 90px)' }}>
      <div className="flex items-center gap-3 border-b border-stone/20 bg-parchment/90 px-3 py-3">
        <button onClick={onBack} aria-label="Назад к списку друзей" className="text-ink/70">
          <ArrowLeft size={20} />
        </button>
        <span className="text-2xl">{friend.avatarEmoji}</span>
        <p className="font-display text-sm text-ink">{friend.nickname}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const isMine = m.senderId === currentUser?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? 'bg-forest text-parchment' : 'bg-white/70 text-ink'
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-stone">Напиши первое сообщение 👋</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-stone/20 bg-parchment/90 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Сообщение…"
          className="flex-1 rounded-full border border-stone/30 bg-white/70 px-4 py-2 text-sm text-ink outline-none focus:border-forest"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Отправить"
          className="rounded-full bg-forest p-2.5 text-parchment disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
