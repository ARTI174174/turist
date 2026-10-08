'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPinned } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Modal } from '@/components/ui/Modal';
import { CategoryQuests } from './CategoryQuests';

export function QuestsPanel() {
  const [suggestOpen, setSuggestOpen] = useState(false);
  return (
    <>
      <CategoryQuests />
      <button onClick={() => setSuggestOpen(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-forest/40 py-3 font-display text-sm text-forest">
        <MapPinned size={18} /> Предложить точку
      </button>
      {suggestOpen && <SuggestPointModal onClose={() => setSuggestOpen(false)} />}
    </>
  );
}

function SuggestPointModal({ onClose }: { onClose: () => void }) {
  const { position } = useGeolocation({ watch: false });
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const length = description.trim().length;
  const canSubmit = length >= 10 && length <= 50 && !!position;
  async function submit() {
    if (!canSubmit || !position) return;
    setLoading(true); setError(null);
    try {
      await api.post('/poi-submissions/quick', { description: description.trim(), lat: position.lat, lng: position.lng });
      setSuccess(true); queryClient.invalidateQueries({ queryKey: ['quests', 'milestones'] });
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось отправить предложение'); }
    finally { setLoading(false); }
  }
  return <Modal title="Предложить точку" onClose={onClose}>{success ? <div className="py-4 text-center">
    <CheckCircle2 size={32} className="mx-auto mb-2 text-forest" /><p className="text-sm text-ink/80">Спасибо! Точка отправлена на рассмотрение.</p>
    <button onClick={onClose} className="mt-4 w-full rounded-full bg-forest py-2.5 font-display text-parchment">Готово</button>
  </div> : <>
    <p className="mb-2 text-xs text-stone">Опиши место (10–50 символов). Координаты возьмём из твоего текущего местоположения.</p>
    <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 50))} rows={3} placeholder="Например: красивый родник у старой мельницы" className="w-full resize-none rounded-xl border border-stone/30 bg-white/70 p-3 text-sm text-ink outline-none focus:border-forest" />
    <div className="mt-1 flex justify-between text-[11px] text-stone"><span>{!position ? 'Определяем ваше местоположение…' : ' '}</span><span>{length}/50</span></div>
    {error && <p className="mt-2 rounded-xl bg-danger/10 p-2 text-xs text-danger">{error}</p>}
    <button onClick={submit} disabled={!canSubmit || loading} className="mt-4 w-full rounded-full bg-forest py-3 font-display text-parchment disabled:opacity-40">{loading ? 'Отправляем…' : 'Отправить на рассмотрение'}</button>
  </>}</Modal>;
}
