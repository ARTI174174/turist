'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthResponse } from '@/types';
import { CharacterPreview } from '@/components/character/CharacterPreview';
import { FREE_AVATARS } from '@/lib/avatars';
import { AvatarImage } from '@/components/character/AvatarImage';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archetype, setArchetype] = useState<'male' | 'female'>('male');
  const [avatarEmoji, setAvatarEmoji] = useState(FREE_AVATARS[0].src);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        nickname,
        password,
        archetype,
        avatarEmoji,
      });
      setSession(res.user, res.accessToken, res.refreshToken);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-adventure flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm rounded-[30px] border border-brass/60 bg-panel/95 p-5 text-parchment shadow-2xl backdrop-blur">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-moss-light">Экспедиционный клуб</p>
        <h1 className="mb-1 text-center font-display text-3xl text-parchment">Новый турист</h1>
        <p className="mb-6 text-center text-sm text-parchment/65">Выбери образ и отправляйся исследовать Урал</p>

        {step === 1 && (
          <div className="space-y-6">
            <CharacterPreview archetype={archetype} className="mx-auto h-64 w-64 touch-none" />
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setArchetype(a)}
                  className={clsx(
                    'flex-1 rounded-xl border-2 py-3 font-display text-sm',
                    archetype === a ? 'border-brass bg-moss/20 text-moss-light' : 'border-brass/50 text-parchment/65',
                  )}
                >
                  {a === 'male' ? 'Парень' : 'Девушка'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="adventure-primary w-full rounded-full py-3 font-display"
            >
              Далее
            </button>
          </div>
        )}

        {step === 2 && (
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="adventure-secondary rounded-full px-5 py-3 font-display text-sm"
              >
                Назад
              </button>
              <button
                onClick={() => setStep(3)}
                className="adventure-primary flex-1 rounded-full py-3 font-display"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Ник" value={nickname} onChange={setNickname} autoComplete="username" hint="3–20 символов, латиница/цифры" />
            <Field label="Пароль" value={password} onChange={setPassword} type="password" autoComplete="new-password" hint="Минимум 8 символов" />

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
                disabled={loading}
                className="adventure-primary flex-1 rounded-full py-3 font-display disabled:opacity-50"
              >
                {loading ? 'Создаём…' : 'Начать путешествие'}
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink/80">{label}</span>
      <input
        type={type}
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
