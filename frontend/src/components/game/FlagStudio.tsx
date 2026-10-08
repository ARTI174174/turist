'use client';
import { useId, useRef, useState, type PointerEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { FLAG_CLOTH, FLAG_COLORS, type FlagPart } from '@/lib/flag-art';
type Stroke = Extract<FlagPart, { type: 'stroke' }>;

function FlagCanvas({ parts }: { parts: FlagPart[] }) {
  const clip = useId().replace(/:/g, '');
  return <>
    <defs><clipPath id={clip}><path d={FLAG_CLOTH} /></clipPath></defs>
    <path d={FLAG_CLOTH} fill="#24382b" stroke="#e2bd78" strokeWidth="1.5" />
    <g clipPath={`url(#${clip})`}>{parts.map((p, i) => p.type === 'circle' ? <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} /> : p.type === 'line' ? <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth="6" strokeLinecap="round" /> : p.points.length === 1 ? <circle key={i} cx={p.points[0][0]} cy={p.points[0][1]} r={p.width / 2} fill={p.color} /> : <polyline key={i} points={p.points.map((point) => point.join(',')).join(' ')} fill="none" stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" />)}</g>
    <line x1="16" y1="8" x2="16" y2="96" stroke="#f5e8c8" strokeWidth="3" strokeLinecap="round" />
  </>;
}
export function FlagArtwork({ design, className = '' }: { design: FlagPart[]; className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} aria-label="Флаг путешественника"><FlagCanvas parts={design} /></svg>;
}
export function FlagStudio({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ owned: boolean; design: FlagPart[] }>({ queryKey: ['flags', 'design'], queryFn: () => api.get('/flags/design') });
  const [design, setDesign] = useState<FlagPart[] | null>(null);
  const [color, setColor] = useState(FLAG_COLORS[0]);
  const [width, setWidth] = useState(4);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const current = useRef<Stroke | null>(null);
  const pointer = useRef<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const parts = design ?? data?.design ?? [];
  const pointCount = parts.reduce((sum, p) => sum + (p.type === 'stroke' ? p.points.length : 0), 0);
  function position(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return null;
    const point = event.currentTarget.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return [Math.round(Math.max(18, Math.min(92, local.x)) * 100) / 100, Math.round(Math.max(5, Math.min(70, local.y)) * 100) / 100];
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (saving || pointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (parts.length >= 64 || pointCount >= 2048) { setMessage('Холст заполнен. Отмени штрих или очисти флаг.'); return; }
    const point = position(event); if (!point) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointer.current = event.pointerId;
    current.current = { type: 'stroke', color, width, points: [point] }; setDraft(current.current); setMessage(null);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const stroke = current.current; if (!stroke || pointer.current !== event.pointerId) return;
    const point = position(event); if (!point) return;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < .5) return;
    if (stroke.points.length >= 256 || pointCount + stroke.points.length >= 2048) { setMessage('Этот штрих заполнен. Отпусти палец и начни следующий.'); return; }
    current.current = { ...stroke, points: [...stroke.points, point] }; setDraft(current.current);
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    if (pointer.current !== event.pointerId) return;
    const stroke = current.current; current.current = null; pointer.current = null; setDraft(null);
    if (stroke) setDesign((previous) => [...(previous ?? data?.design ?? []), stroke]);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  async function save() {
    if (saving || draft) return;
    setSaving(true); setMessage(null);
    try {
      await api.patch('/flags/design', { design: parts }); await refetch(); setDesign(null);
      await client.invalidateQueries({ queryKey: ['poi', 'list'] });
      setMessage('Флаг сохранён. Его можно оставить на посещённой точке.');
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось сохранить флаг'); }
    finally { setSaving(false); }
  }
  return <Modal title="Нарисовать свой флаг" onClose={onClose}>
    {isLoading ? <p role="status" className="text-sm text-parchment">Загружаем флаг…</p> : isError ? <button onClick={() => void refetch()} className="adventure-secondary min-h-11 w-full rounded-full">Повторить загрузку</button> : !data?.owned ? <div className="space-y-3 text-center"><FlagArtwork design={[]} className="mx-auto h-24 w-24" /><p className="text-sm text-parchment">Купи «Флаг путешественника» в магазине, чтобы нарисовать его и оставить на посещённой точке.</p></div> : <div className="space-y-3">
      <p className="text-xs text-parchment/70">Выбери цвет и толщину карандаша. Рисуй прямо на полотне пальцем или мышью.</p>
      <div className="rounded-2xl border border-brass/35 bg-black/20 p-2"><svg viewBox="0 0 100 100" aria-label="Полотно флага для рисования" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} className="mx-auto aspect-square w-full max-w-72 touch-none select-none" style={{ cursor: 'crosshair' }}><FlagCanvas parts={draft ? [...parts, draft] : parts} /></svg></div>
      <label className="flex items-center gap-3 text-xs text-parchment">Карандаш <input type="range" min="1" max="12" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="min-w-0 flex-1 accent-[#c3b57d]" /><span className="w-6 text-right">{width}</span><span className="flex h-8 w-8 items-center justify-center"><span className="rounded-full" style={{ width: width * 2, height: width * 2, background: color }} /></span></label>
      <div className="grid grid-cols-5 gap-2">{FLAG_COLORS.map((value, index) => <button key={value} onClick={() => setColor(value)} aria-label={['Красный', 'Оранжевый', 'Жёлтый', 'Зелёный', 'Бирюзовый', 'Голубой', 'Синий', 'Фиолетовый', 'Розовый', 'Белый'][index]} aria-pressed={color === value} className={`flex h-11 items-center justify-center rounded-xl border ${color === value ? 'border-brass bg-brass/20' : 'border-brass/20'}`}><span className="h-6 w-6 rounded-full" style={{ background: value }} /></button>)}</div>
      <div className="grid grid-cols-2 gap-2"><button disabled={!parts.length || saving || !!draft} onClick={() => setDesign(parts.slice(0, -1))} className="adventure-secondary min-h-11 rounded-full text-xs disabled:opacity-40">Отменить штрих</button><button disabled={!parts.length || saving || !!draft} onClick={() => setDesign([])} className="adventure-secondary min-h-11 rounded-full text-xs disabled:opacity-40">Очистить флаг</button></div>
      {message && <p role="status" className="text-center text-xs text-parchment">{message}</p>}
      <button disabled={saving || !!draft} onClick={() => void save()} className="adventure-primary min-h-11 w-full rounded-full text-sm disabled:opacity-50">{saving ? 'Сохраняем…' : 'Сохранить рисунок'}</button>
    </div>}
  </Modal>;
}
