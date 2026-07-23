'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { nickname, password });
      setSession(res.user, res.accessToken, res.refreshToken);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center bg-topo px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-forest">ТУРИСТ</h1>
        <p className="mb-8 text-sm text-stone">Открой Челябинскую область заново</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Ник" value={nickname} onChange={setNickname} autoComplete="username" />
          <Field label="Пароль" value={password} onChange={setPassword} type="password" autoComplete="current-password" />

          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-forest py-3 font-display text-parchment disabled:opacity-50"
          >
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone">
          Ещё нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-amber-dark">
            Зарегистрироваться
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
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
    </label>
  );
}
