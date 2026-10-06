'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Compass, Gem, MapPin, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';

interface DailyStatus { streak: number; cycleDay: number; claimedToday: boolean; nextAt: string | null; reward?: { coins?: number; crystals?: number } | null; rewards: { day: number; coins?: number; crystals?: number; completed: boolean }[] }
interface NewsPost { id: string; title: string; body: string }

export function GameOverlays() {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);
  const [dailyNoticeSeen, setDailyNoticeSeen] = useState(false);
  const [dailyNoticeChecked, setDailyNoticeChecked] = useState(false);
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const appliedDailyReward = useRef<string | null>(null);
  useEffect(() => {
    setMounted(true);
    setSeenWelcome(false);
    setDailyNoticeSeen(false);
    setDailyNoticeChecked(false);
  }, [user?.id]);
  const { data: welcome } = useQuery<{ completed: boolean }>({ queryKey: ['game', 'welcome', user?.id], queryFn: () => api.get('/game/welcome'), enabled: mounted && !!user });
  const { data: daily } = useQuery<DailyStatus>({ queryKey: ['game', 'daily', user?.id], queryFn: () => api.get('/game/daily'), enabled: mounted && !!user });
  useEffect(() => {
    if (!mounted || !user) return;
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const yekDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const [year, month, day] = yekDate.split('-').map(Number);
    const midnight = new Date(Date.UTC(year, month - 1, day + 1) - 5 * 60 * 60 * 1000);
    const timer = setTimeout(() => { void queryClient.invalidateQueries({ queryKey: ['game', 'daily', user.id] }); }, Math.max(1000, midnight.getTime() - now.getTime() + 1000));
    return () => clearTimeout(timer);
  }, [mounted, user?.id, daily?.nextAt, queryClient]);
  const { data: news } = useQuery<NewsPost | null>({ queryKey: ['game', 'news', 'unread', user?.id], queryFn: () => api.get('/game/news/unread'), enabled: mounted && !!user });
  const dailyStamp = useMemo(() => daily?.nextAt ? new Date(new Date(daily.nextAt).getTime() - 24 * 60 * 60 * 1000).toISOString() : '', [daily?.nextAt]);
  useEffect(() => {
    if (!user || !daily?.reward || !dailyStamp || appliedDailyReward.current === dailyStamp) return;
    appliedDailyReward.current = dailyStamp;
    const coins = daily.reward.coins ?? 0;
    const crystals = daily.reward.crystals ?? 0;
    updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance + coins, crystalsBalance: user.wallet.crystalsBalance + crystals } });
  }, [daily?.reward, dailyStamp, user, updateUser]);
  useEffect(() => {
    if (!user || !dailyStamp) return;
    setDailyNoticeSeen(localStorage.getItem(`turist:daily-notice:${user.id}`) === dailyStamp);
    setDailyNoticeChecked(true);
  }, [user, dailyStamp]);

  if (!mounted || !user) return null;
  const showIntro = !!welcome && !welcome.completed && !seenWelcome;
  const showDaily = !showIntro && dailyNoticeChecked && !!daily?.claimedToday && !dailyNoticeSeen;

  async function finishIntro() {
    await api.post('/game/welcome/complete', {});
    await queryClient.invalidateQueries({ queryKey: ['game', 'welcome'] });
    setSeenWelcome(true);
  }
  function finishDaily() {
    if (dailyStamp && user?.id) localStorage.setItem(`turist:daily-notice:${user.id}`, dailyStamp);
    setDailyNoticeSeen(true);
  }
  async function finishNews() {
    if (!news) return;
    await api.post(`/game/news/${news.id}/read`, {});
    await queryClient.invalidateQueries({ queryKey: ['game', 'news', 'unread'] });
  }

  if (showIntro) return <Modal title="Добро пожаловать в ТУРИСТ" onClose={() => void finishIntro()}>
    <div className="space-y-3 text-sm text-parchment/85">
      <p className="text-center font-display text-base text-brass">Твоё приключение начинается рядом</p>
      <Tip icon={<MapPin size={18} />} title="Исследуй карту" text="Иди к отмеченным местам и открывай их, находясь рядом." />
      <Tip icon={<Compass size={18} />} title="Собирай награды" text="Получай золото, опыт и бриллианты за новые открытия." />
      <Tip icon={<BookOpen size={18} />} title="Делись впечатлениями" text="Оставляй комментарии у точек и смотри достижения друзей." />
      <button onClick={() => void finishIntro()} className="w-full rounded-full bg-moss py-3 font-display text-parchment">Начать путешествие</button>
    </div>
  </Modal>;

  if (showDaily && daily) return <Modal title="Награда путешественника" onClose={finishDaily}>
    <p className="mb-3 text-center text-xs text-parchment/65">Новый день начинается в 00:00 по Екатеринбургу. Если пропустить календарный день, серия начнётся заново.</p>
    <div className="grid grid-cols-2 gap-2">
      {daily.rewards.map((reward) => <div key={reward.day} className={`rounded-xl border p-2 text-center ${reward.day === daily.cycleDay ? 'border-brass bg-brass/15' : reward.completed ? 'border-moss/70 bg-moss/15' : 'border-brass/20 bg-black/20'}`}>
        <p className="text-[10px] text-parchment/60">День {reward.day} {reward.completed ? '✓' : ''}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-parchment">{reward.coins ? `${reward.coins} золота` : <><Gem size={13} className="text-sky-300" />{reward.crystals}</>}</p>
      </div>)}
    </div>
    <button onClick={finishDaily} className="mt-4 w-full rounded-full bg-moss py-2.5 font-display text-parchment">Забрать и продолжить</button>
  </Modal>;

  if (news) return <Modal title={news.title} onClose={() => void finishNews()}>
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-parchment/85">{news.body}</div>
    <button onClick={() => void finishNews()} className="mt-4 w-full rounded-full bg-moss py-2.5 font-display text-parchment">Понятно</button>
  </Modal>;

  return null;
}

function Tip({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-xl border border-brass/20 bg-black/15 p-3"><span className="mt-0.5 text-brass">{icon}</span><div><p className="font-semibold text-parchment">{title}</p><p className="mt-0.5 text-xs text-parchment/65">{text}</p></div></div>;
}
