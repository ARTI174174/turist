'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { AVATARS } from '@/lib/avatars';
import { AvatarImage } from '@/components/character/AvatarImage';
import { api, ApiError } from '@/lib/api';
import { AuthUser } from '@/types';
import { AdminNewsPanel } from '@/components/panels/AdminNewsPanel';

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
        className="bg-adventure h-full overflow-y-auto px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 90px)' }}
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="avatar-portrait h-24 w-24 rounded-full border-[3px] border-brass p-1 shadow-xl">
            <AvatarImage value={user.character?.avatarEmoji} className="h-full w-full rounded-full" />
          </div>
          <p className="font-display text-lg text-ink">{user.nickname}</p>
          <p className="text-xs text-stone">Уровень {level} · {xp} баллов</p>
        </div>

        <AvatarSection currentAvatar={user.character?.avatarEmoji ?? '🙂'} ownedIds={user.character?.ownedAvatarIds ?? []} onSaved={(result) => {
          updateUser({ character: { ...user.character, ...result.character }, wallet: result.wallet });
        }} />

        <NicknameSection currentNickname={user.nickname} onSaved={(u) => updateUser(u)} />

        <PasswordSection />
        <AdminNewsPanel />

        <button
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-danger/50 bg-danger/10 py-3 font-display text-sm text-red-300"
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
    <div className="adventure-card mb-4 rounded-2xl p-4">
      <p className="mb-3 font-display text-sm text-parchment">{title}</p>
      {children}
    </div>
  );
}

function AvatarSection({ currentAvatar, ownedIds, onSaved }: { currentAvatar: string; ownedIds: number[]; onSaved: (result: { character: Partial<AuthUser['character']>; wallet: AuthUser['wallet'] }) => void }) {
  const [selected, setSelected] = useState(currentAvatar);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (selected === currentAvatar) return;
    setSaving(true);
    setMsg(null);
    try {
      const result = await api.patch<{ character: AuthUser['character']; wallet: AuthUser['wallet'] }>('/auth/avatar', { avatarEmoji: selected });
      onSaved(result);
      setMsg('Аватар обновлён');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Аватар путешественника">
      <p className="mb-3 text-xs text-parchment/60">Первые 20 образов бесплатны. Редкие аватары открываются за бриллианты.</p>
      <div className="mb-3 grid grid-cols-4 gap-2.5">
        {AVATARS.map((avatar) => {
          const isOwned = avatar.price === 0 || ownedIds.includes(avatar.id);
          const isSelected = selected === avatar.src;
          return (
          <button
            key={avatar.id}
            onClick={() => setSelected(avatar.src)}
            className={clsx('avatar-tile relative aspect-square rounded-xl p-0.5 transition-transform hover:scale-105', isSelected && 'avatar-tile-selected')}
            aria-label={avatar.price && !isOwned ? `Аватар ${avatar.id}, ${avatar.price} бриллиантов` : `Выбрать аватар ${avatar.id}`}
            aria-pressed={isSelected}
          >
            <AvatarImage value={avatar.src} className="h-full w-full rounded-lg" />
            {avatar.price > 0 && !isOwned && <span className="avatar-price">💎 {avatar.price}</span>}
            {avatar.price > 0 && isOwned && <span className="avatar-owned">✓</span>}
          </button>
          );
        })}
      </div>
      {msg && <p className="mb-2 text-xs text-forest">{msg}</p>}
      <button
        onClick={save}
        disabled={saving || selected === currentAvatar}
        className="adventure-primary w-full rounded-full py-3 text-sm disabled:opacity-40"
      >
        {saving ? 'Открываем…' : `Выбрать аватар${AVATARS.find((avatar) => avatar.src === selected && avatar.price && !ownedIds.includes(avatar.id)) ? ` за ${AVATARS.find((avatar) => avatar.src === selected)?.price} 💎` : ''}`}
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
