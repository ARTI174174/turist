'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';

type FlagPart = { type: 'circle'; x: number; y: number; r: number; color: string } | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string };
const COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#3F51B5', '#9B59B6', '#EC407A', '#F5F5F5'];

export function FlagArtwork({ design, className = '' }: { design: FlagPart[]; className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} aria-label="Флаг путешественника">
    <line x1="16" y1="8" x2="16" y2="96" stroke="#f5e8c8" strokeWidth="5" />
    {design.map((part, index) => part.type === 'circle'
      ? <circle key={index} cx={part.x} cy={part.y} r={part.r} fill={part.color} />
      : <line key={index} x1={part.x1} y1={part.y1} x2={part.x2} y2={part.y2} stroke={part.color} strokeWidth="6" strokeLinecap="round" />)}
    {!design.length && <path d="M19 10 H88 L68 37 L88 63 H19 Z" fill="#E74C3C" />}
  </svg>;
}

export function FlagStudio({ onClose }: { onClose: () => void }) {
  const { data, refetch } = useQuery<{ owned: boolean; design: FlagPart[] }>({ queryKey: ['flags', 'design'], queryFn: () => api.get('/flags/design') });
  const [design, setDesign] = useState<FlagPart[] | null>(null);
  const [color, setColor] = useState(COLORS[0]); const [shape, setShape] = useState<'circle' | 'line'>('circle');
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const parts = design ?? data?.design ?? [];
  function addAt(event: React.MouseEvent<SVGSVGElement>) {
    if (parts.length >= 12) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    if (shape === 'circle') setDesign([...parts, { type: 'circle', x, y, r: 10, color }]);
    else if (!lineStart) setLineStart({ x, y });
    else { setDesign([...parts, { type: 'line', x1: lineStart.x, y1: lineStart.y, x2: x, y2: y, color }]); setLineStart(null); }
  }
  async function save() {
    try { await api.patch('/flags/design', { design: parts }); await refetch(); setDesign(null); setMessage('Флаг сохранён. Его можно оставить на посещённой точке.'); }
    catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось сохранить флаг'); }
  }
  return <Modal title="Флаг в лагере" onClose={onClose}>
    {!data?.owned ? <div className="space-y-3 text-center"><FlagArtwork design={[]} className="mx-auto h-20 w-20" /><p className="text-sm text-parchment">Купи «Флаг путешественника» в магазине за 5 000 золота, чтобы нарисовать и оставить его на точке.</p><button onClick={onClose} className="w-full rounded-full bg-moss py-2 text-sm text-parchment">Понятно</button></div> : <div className="space-y-3">
      <p className="text-center text-xs text-parchment/65">Выбирай фигуру и цвет, затем нажимай на полотне. До 12 фигур.</p>
      <div className="mx-auto h-48 w-48 rounded-2xl border border-brass/50 bg-black/30 p-3"><svg viewBox="0 0 100 100" onClick={addAt} className="h-full w-full touch-none cursor-crosshair"><line x1="16" y1="8" x2="16" y2="96" stroke="#f5e8c8" strokeWidth="5" />{parts.map((part, index) => part.type === 'circle' ? <circle key={index} cx={part.x} cy={part.y} r={part.r} fill={part.color} /> : <line key={index} x1={part.x1} y1={part.y1} x2={part.x2} y2={part.y2} stroke={part.color} strokeWidth="6" strokeLinecap="round" />)}</svg></div>
      <div className="flex justify-center gap-2"><button onClick={() => { setShape('circle'); setLineStart(null); }} className={`rounded-full px-3 py-1 text-xs ${shape === 'circle' ? 'bg-moss text-white' : 'bg-black/20 text-parchment'}`}>Круг</button><button onClick={() => setShape('line')} className={`rounded-full px-3 py-1 text-xs ${shape === 'line' ? 'bg-moss text-white' : 'bg-black/20 text-parchment'}`}>Линия</button></div>
      <div className="flex flex-wrap justify-center gap-2">{COLORS.map((value) => <button key={value} onClick={() => setColor(value)} aria-label={`Цвет ${value}`} className={`h-7 w-7 rounded-full border-2 ${color === value ? 'border-white' : 'border-white/20'}`} style={{ background: value }} />)}</div>
      <div className="flex items-center justify-between text-[10px] text-parchment/60"><span>Фигур: {parts.length}/12</span><button onClick={() => { setDesign(parts.slice(0, -1)); setLineStart(null); }} className="text-brass">Убрать последнюю</button><button onClick={() => { setDesign([]); setLineStart(null); }} className="text-brass">Очистить</button></div>
      {message && <p className="text-center text-xs text-moss-light">{message}</p>}<button onClick={() => void save()} className="w-full rounded-full bg-moss py-2.5 text-sm text-parchment">Сохранить рисунок</button>
    </div>}
  </Modal>;
}
