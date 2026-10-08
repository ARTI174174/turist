export type FlagPart = { type: 'circle'; x: number; y: number; r: number; color: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string }
  | { type: 'stroke'; points: number[][]; width: number; color: string };
export const FLAG_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#3F51B5', '#9B59B6', '#EC407A', '#F5F5F5'];
export const FLAG_CLOTH = 'M18 14 Q54 4 92 14 L92 70 Q54 60 18 70 Z';

// Used only for a local map texture; construct SVG from bounded numbers and palette colours.
export function flagSvg(raw: unknown): string {
  const n = (v: unknown, max = 100) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
  const shapes = (Array.isArray(raw) ? raw.slice(0, 64) : []).map((p) => {
    if (!p || !FLAG_COLORS.includes(p.color)) return '';
    if (p.type === 'circle') return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r, 20)}" fill="${p.color}"/>`;
    if (p.type === 'line') return `<path d="M${n(p.x1)},${n(p.y1)} L${n(p.x2)},${n(p.y2)}" fill="none" stroke="${p.color}" stroke-width="6" stroke-linecap="round"/>`;
    if (p.type === 'stroke' && Array.isArray(p.points)) {
      const points = p.points.slice(0, 256).filter((point: unknown) => Array.isArray(point) && point.length === 2) as number[][];
      if (points.length === 1) return `<circle cx="${n(points[0][0])}" cy="${n(points[0][1])}" r="${n(p.width, 12) / 2}" fill="${p.color}"/>`;
      return `<polyline points="${points.map((point) => `${n(point[0])},${n(point[1])}`).join(' ')}" fill="none" stroke="${p.color}" stroke-width="${n(p.width, 12)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><clipPath id="cloth"><path d="${FLAG_CLOTH}"/></clipPath></defs><path d="${FLAG_CLOTH}" fill="#24382b" stroke="#e2bd78" stroke-width="2"/><g clip-path="url(#cloth)">${shapes}</g><path d="M16 8 V96" stroke="#f5e8c8" stroke-width="5"/></svg>`;
}
