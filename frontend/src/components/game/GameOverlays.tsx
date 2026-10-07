'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Compass, Gem, MapPin, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';

interface DailyStatus { streak: number; cycleDay: number; claimedToday: boolean; nextAt: string | null; reward?: { coins?: number; crystals?: number } | null; rewards: { day: number; coins?: number; crystals?: number; completed: boolean }[] }
interface NewsPost { id: string; title: string; body: string }

export function GameOverlays() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [tutorialError, setTutorialError] = useState<string | null>(null);
  const [completingTutorial, setCompletingTutorial] = useState(false);
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
  const { data: welcome } = useQuery<{ completed: boolean; pointFound: boolean }>({ queryKey: ['game', 'welcome', user?.id], queryFn: () => api.get('/game/welcome'), enabled: mounted && !!user });
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
  const showIntro = !!welcome && !welcome.completed && !welcome.pointFound && !seenWelcome;
  const showTutorialComplete = !!welcome && !welcome.completed && welcome.pointFound;
  const showDaily = !showIntro && dailyNoticeChecked && !!daily?.claimedToday && !dailyNoticeSeen;

  function finishIntro() {
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
  async function completeTutorial() {
    if (completingTutorial) return;
    setCompletingTutorial(true);
    setTutorialError(null);
    try {
      await api.post('/game/welcome/complete', {});
      await queryClient.invalidateQueries({ queryKey: ['game', 'welcome'] });
      await queryClient.invalidateQueries({ queryKey: ['poi', 'list'] });
      router.push('/map');
    } catch {
      setTutorialError('Не удалось открыть карту. Попробуй ещё раз.');
    } finally { setCompletingTutorial(false); }
  }

  if (showIntro) {
    const steps = [
      { icon: <Compass size={20} />, title: 'Добро пожаловать в лагерь', text: 'Сейчас ты в своём лагере — здесь спокойно и безопасно. Внизу находится главное меню: профиль, лагерь, карта «В путь», дневник и друзья.' },
      { icon: <Sparkles size={20} />, title: 'Золото, бриллианты и уровень', text: 'Золото и бриллианты нужны для покупок в магазине. За открытия ты получаешь опыт и повышаешь уровень. Чем выше уровень, тем выше место в списке лучших игроков.' },
      { icon: <BookOpen size={20} />, title: 'Дневник и друзья', text: 'В дневнике смотри посещённые места, экспедиции и маршруты участников. В друзьях можно добавлять путешественников, смотреть их достижения и посещать места вместе.' },
      { icon: <MapPin size={20} />, title: 'Карта и магазин', text: 'На карте «В путь» находятся рейтинг игроков, задания и магазин. В магазине можно купить улучшения, которые помогают в путешествии.' },
    ];
    const step = steps[introStep];
    return <Modal title="Добро пожаловать в ТУРИСТ" onClose={finishIntro}>
      <div className="space-y-4 text-sm text-parchment/85">
        <div className="flex items-center gap-3 rounded-2xl border border-brass/30 bg-black/20 p-4"><span className="text-brass">{step.icon}</span><div><p className="font-display text-base text-parchment">{step.title}</p><p className="mt-1 text-xs leading-relaxed text-parchment/70">{step.text}</p></div></div>
        <p className="text-center text-[11px] text-parchment/50">{introStep + 1} / {steps.length}</p>
        {introStep < steps.length - 1
          ? <button onClick={() => setIntroStep((current) => current + 1)} className="w-full rounded-full bg-moss py-3 font-display text-parchment">Продолжить</button>
          : <button onClick={() => { finishIntro(); router.push('/map'); }} className="w-full rounded-full bg-moss py-3 font-display text-parchment">Продолжить</button>}
      </div>
    </Modal>;
  }

  if (showTutorialComplete) return <Modal title="Поздравляем!" onClose={() => {}}>
    <div className="space-y-3 text-center"><p className="font-display text-parchment">Ты открыл Челябинскую область!</p><p className="text-xs leading-relaxed text-parchment/75">Смысл игры — самостоятельно исследовать интересные места. На карте выбери любую точку, подойди к ней и нажми «Исследовать», чтобы открыть её и получить награду.</p>{tutorialError && <p className="text-xs text-danger">{tutorialError}</p>}<button onClick={() => void completeTutorial()} disabled={completingTutorial} className="w-full rounded-full bg-moss py-3 text-sm font-display text-parchment disabled:opacity-50">{completingTutorial ? 'Открываем карту…' : 'Выбрать точку на карте'}</button></div>
  </Modal>;

  if (showDaily && daily) return <Modal title="Поздравляем! Награда путешественника" onClose={finishDaily}>
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
