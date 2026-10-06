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
      setSession(res.user, res.accessToken);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-adventure flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm rounded-[30px] border border-brass/60 bg-panel/95 p-6 shadow-2xl backdrop-blur">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-moss-light">Экспедиционный клуб</p>
        <h1 className="mb-1 text-center font-display text-3xl text-parchment">ТУРИСТ</h1>
        <p className="mb-8 text-center text-sm text-parchment/65">Открой Челябинскую область заново</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Логин (ник)" value={nickname} onChange={setNickname} autoComplete="username" placeholder="Введите логин" />
          <Field label="Пароль" value={password} onChange={setPassword} type="password" autoComplete="current-password" placeholder="Введите пароль" />

          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="adventure-primary w-full rounded-full py-3 font-display disabled:opacity-50"
          >
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-parchment/60">
          Ещё нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-moss-light">
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
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
    </label>
  );
}
