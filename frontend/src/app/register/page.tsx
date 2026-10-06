'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthResponse } from '@/types';
import { FREE_AVATARS } from '@/lib/avatars';
import { AvatarImage } from '@/components/character/AvatarImage';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [avatarEmoji, setAvatarEmoji] = useState(FREE_AVATARS[0].src);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [campThemeId, setCampThemeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ challengeId: string; nonce: string; difficultyBits: number; question: string } | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChallenge = useCallback(async () => {
    try { setChallenge(await api.get<{ challengeId: string; nonce: string; difficultyBits: number; question: string }>('/auth/register-challenge')); setChallengeAnswer(''); }
    catch { setChallenge(null); }
  }, []);
  useEffect(() => { void loadChallenge(); }, [loadChallenge]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!challenge) throw new Error('Проверка не загружена. Обновите страницу и попробуйте снова.');
      const proofCounter = await solveRegistrationProof(challenge.challengeId, challenge.nonce, Number(challengeAnswer), challenge.difficultyBits);
      const res = await api.post<AuthResponse>('/auth/register', {
        nickname,
        password,
        archetype: 'male',
        avatarEmoji,
        campThemeId,
        challengeId: challenge?.challengeId,
        challengeAnswer: Number(challengeAnswer),
        proofCounter,
      });
      setSession(res.user, res.accessToken);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось зарегистрироваться');
      void loadChallenge();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-adventure h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto my-2 w-full max-w-sm rounded-[30px] border border-brass/60 bg-panel/95 p-4 text-parchment shadow-2xl backdrop-blur sm:my-8 sm:p-5">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-moss-light">Экспедиционный клуб</p>
        <h1 className="mb-1 text-center font-display text-3xl text-parchment">Новый турист</h1>
        <p className="mb-6 text-center text-sm text-parchment/65">Выбери аватар и отправляйся исследовать Урал</p>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="avatar-portrait mx-auto mb-3 h-24 w-24 rounded-full border-[3px] border-brass p-1 shadow-xl">
                <AvatarImage value={avatarEmoji} className="h-full w-full rounded-full" />
              </div>
              <p className="text-sm text-parchment/70">Выбери аватар — он будет виден друзьям</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {FREE_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setAvatarEmoji(avatar.src)}
                  className={clsx(
                    'avatar-tile aspect-square rounded-xl p-0.5 transition-transform hover:scale-105',
                    avatarEmoji === avatar.src && 'avatar-tile-selected',
                  )}
                  aria-label={`Выбрать аватар ${avatar.id}`}
                  aria-pressed={avatarEmoji === avatar.src}
                >
                  <AvatarImage value={avatar.src} className="h-full w-full rounded-lg" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="adventure-primary w-full rounded-full py-3 font-display"
            >Далее</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-center font-display text-lg text-parchment">Выбери первый лагерь</h2>
            <p className="text-center text-xs text-parchment/65">Позже сменить его можно будет в магазине за 20 бриллиантов.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['zyuratkul', 'Зюраткуль', '/assets/camp/locations/zyuratkul.png'],
                ['nurgush', 'Нургуш', '/assets/camp/locations/nurgush.png'],
                ['taganay', 'Таганай', '/assets/camp/locations/taganay.png'],
                ['ural', 'Урал', '/assets/camp/locations/ural.jpg'],
              ].map(([id, title, image]) => <button type="button" key={id} onClick={() => setCampThemeId(id)} className={`overflow-hidden rounded-2xl border-2 text-left ${campThemeId === id ? 'border-brass' : 'border-brass/25'}`}>
                <img src={image} alt="" className="h-28 w-full object-cover" /><span className="block p-2 text-sm text-parchment">{title}</span>
              </button>)}
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setStep(1)} className="adventure-secondary rounded-full px-5 py-3 font-display text-sm">Назад</button><button type="button" disabled={!campThemeId} onClick={() => setStep(3)} className="adventure-primary flex-1 rounded-full py-3 font-display disabled:opacity-40">Далее</button></div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Игровой ник" value={nickname} onChange={setNickname} autoComplete="username" hint="3–20 символов: латинские буквы, цифры или _" placeholder="Придумайте ник" />
            <Field label="Пароль для входа" value={password} onChange={setPassword} type="password" autoComplete="new-password" hint="Минимум 8 символов" placeholder="Придумайте пароль" />
            <label className="block rounded-xl border border-brass/30 bg-black/15 p-3"><span className="mb-2 block text-sm text-parchment">Проверка: {challenge?.question ?? 'Загружаем пример…'}</span><input value={challengeAnswer} onChange={(event) => setChallengeAnswer(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" pattern="[0-9]*" required placeholder="Ответ" className="w-full rounded-xl border border-brass/40 bg-black/25 px-4 py-3 text-parchment outline-none focus:border-moss-light" /></label>

            {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="adventure-secondary rounded-full px-5 py-3 font-display text-sm"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={loading || !challenge}
                className="adventure-primary flex-1 rounded-full py-3 font-display disabled:opacity-50"
              >
                {loading ? 'Проверяем и создаём…' : !challenge ? 'Загружаем проверку…' : 'Начать путешествие'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-parchment/60">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-semibold text-moss-light">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}

async function solveRegistrationProof(challengeId: string, nonce: string, answer: number, difficultyBits: number) {
  if (!globalThis.crypto?.subtle) throw new Error('Браузер не поддерживает проверку безопасности. Обновите браузер.');
  const encoder = new TextEncoder();
  const targetPrefixBytes = Math.floor(difficultyBits / 8);
  const remainingBits = difficultyBits % 8;
  for (let counter = 0; counter <= 100_000_000; counter++) {
    const input = encoder.encode(`${challengeId}:${nonce}:${answer}:${counter}`);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    let valid = true;
    for (let i = 0; i < targetPrefixBytes; i++) if (digest[i] !== 0) { valid = false; break; }
    if (valid && remainingBits > 0 && (digest[targetPrefixBytes] >> (8 - remainingBits)) !== 0) valid = false;
    if (valid) return counter;
    if (counter % 256 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Не удалось пройти проверку. Обновите пример и попробуйте ещё раз.');
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink/80">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
            className="w-full rounded-xl border border-brass/50 bg-black/25 px-4 py-3 text-parchment outline-none focus:border-moss-light focus:ring-2 focus:ring-moss-light/30"
      />
      {hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}
    </label>
  );
}
