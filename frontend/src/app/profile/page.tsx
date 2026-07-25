'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { AVATAR_EMOJIS } from '@/lib/avatars';
import { api, ApiError } from '@/lib/api';
import { AuthUser } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  const xp = user.progress?.xp ?? 0;
  const { level } = resolveLevel(xp);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* даже если запрос не прошёл — всё равно выходим локально */
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <TopHud />

      <div
        className="h-full overflow-y-auto bg-topo px-4 pb-28"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 90px)' }}
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-amber bg-white text-4xl">
            {user.character?.avatarEmoji ?? '🙂'}
          </div>
          <p className="font-display text-lg text-ink">{user.nickname}</p>
          <p className="text-xs text-stone">Уровень {level} · {xp} баллов</p>
        </div>

        <AvatarSection currentEmoji={user.character?.avatarEmoji ?? '🙂'} onSaved={(emoji) => {
          updateUser({ character: { ...user.character, avatarEmoji: emoji } });
        }} />

        <NicknameSection currentNickname={user.nickname} onSaved={(u) => updateUser(u)} />

        <PasswordSection />

        <button
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-danger/40 py-3 font-display text-sm text-danger"
        >
          <LogOut size={16} /> Выйти из аккаунта
        </button>
      </div>

      <BottomNav />
    </main>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl bg-white/50 p-4">
      <p className="mb-3 font-display text-sm text-ink">{title}</p>
      {children}
    </div>
  );
}

function AvatarSection({ currentEmoji, onSaved }: { currentEmoji: string; onSaved: (emoji: string) => void }) {
  const [selected, setSelected] = useState(currentEmoji);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (selected === currentEmoji) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.patch('/auth/avatar', { avatarEmoji: selected });
      onSaved(selected);
      setMsg('Аватар обновлён');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Сменить аватар">
      <div className="mb-3 grid grid-cols-5 gap-2">
        {AVATAR_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setSelected(emoji)}
            className={clsx(
              'flex aspect-square items-center justify-center rounded-xl border-2 text-lg',
              selected === emoji ? 'border-forest bg-forest/10' : 'border-stone/20 bg-white/40',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
      {msg && <p className="mb-2 text-xs text-forest">{msg}</p>}
      <button
        onClick={save}
        disabled={saving || selected === currentEmoji}
        className="w-full rounded-full bg-forest py-2 text-sm text-parchment disabled:opacity-40"
      >
        {saving ? 'Сохраняем…' : 'Сохранить аватар'}
      </button>
    </SectionCard>
  );
}

function NicknameSection({
  currentNickname,
  onSaved,
}: {
  currentNickname: string;
  onSaved: (patch: Partial<AuthUser>) => void;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.patch<AuthUser>('/auth/nickname', { nickname });
      onSaved({ nickname: updated.nickname });
      setMsg('Ник обновлён');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Сменить ник">
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="mb-2 w-full rounded-xl border border-stone/30 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-forest"
      />
      {msg && <p className="mb-2 text-xs text-forest">{msg}</p>}
      <button
        onClick={save}
        disabled={saving || nickname === currentNickname || nickname.length < 3}
        className="w-full rounded-full bg-forest py-2 text-sm text-parchment disabled:opacity-40"
      >
        {saving ? 'Сохраняем…' : 'Сохранить ник'}
      </button>
    </SectionCard>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setMsg('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Сменить пароль">
      <input
        type="password"
        placeholder="Текущий пароль"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="mb-2 w-full rounded-xl border border-stone/30 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-forest"
      />
      <input
        type="password"
        placeholder="Новый пароль (минимум 8 символов)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="mb-2 w-full rounded-xl border border-stone/30 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-forest"
      />
      {msg && <p className="mb-2 text-xs text-forest">{msg}</p>}
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <button
        onClick={save}
        disabled={saving || currentPassword.length === 0 || newPassword.length < 8}
        className="w-full rounded-full bg-forest py-2 text-sm text-parchment disabled:opacity-40"
      >
        {saving ? 'Сохраняем…' : 'Сменить пароль'}
      </button>
    </SectionCard>
  );
}
