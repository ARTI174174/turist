'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthResponse } from '@/types';
import { CharacterPreview } from '@/components/character/CharacterPreview';

// Тот же набор, что и на бэкенде (backend/src/auth/dto/register.dto.ts) — держать в синхроне
const AVATAR_EMOJIS = [
  '🙂', '😎', '🥳', '🤠', '🧗', '🏕️', '⛰️', '🌲', '🦊', '🐺',
  '🦉', '🐻', '🦌', '🐿️', '🍁', '🔥', '🧭', '🎒', '⛺', '🌄',
];

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archetype, setArchetype] = useState<'male' | 'female'>('male');
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJIS[0]);
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
    <main className="flex min-h-full flex-col justify-center bg-topo px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-forest">Новый турист</h1>
        <p className="mb-6 text-sm text-stone">Только ник и пароль — без лишних данных</p>

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
                    archetype === a ? 'border-forest bg-forest/10 text-forest' : 'border-stone/30 text-stone',
                  )}
                >
                  {a === 'male' ? 'Парень' : 'Девушка'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-full bg-forest py-3 font-display text-parchment"
            >
              Далее
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-forest/10 text-4xl">
                {avatarEmoji}
              </div>
              <p className="text-sm text-stone">Выбери аватар — он будет виден друзьям</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatarEmoji(emoji)}
                  className={clsx(
                    'flex aspect-square items-center justify-center rounded-xl border-2 text-xl',
                    avatarEmoji === emoji ? 'border-forest bg-forest/10' : 'border-stone/20 bg-white/40',
                  )}
                  aria-label={`Выбрать аватар ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-full border border-stone/30 px-5 py-3 font-display text-sm text-ink/70"
              >
                Назад
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-forest py-3 font-display text-parchment"
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
                className="rounded-full border border-stone/30 px-5 py-3 font-display text-sm text-ink/70"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-forest py-3 font-display text-parchment disabled:opacity-50"
              >
                {loading ? 'Создаём…' : 'Начать путешествие'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-semibold text-amber-dark">
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
        className="w-full rounded-xl border border-stone/30 bg-white/70 px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/30"
      />
      {hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}
    </label>
  );
}
