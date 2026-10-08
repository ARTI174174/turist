import { createHash } from 'node:crypto';

export const EXPEDITION_STAGES = [
  { category: 'city', title: 'Города', target: 7 },
  { category: 'lake', title: 'Озёра', target: 7 },
  { category: 'mountain', title: 'Горы', target: 7 },
] as const;

export function expeditionMonth(now: Date) {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    startsAt: new Date(Date.UTC(year, month, 1) - 5 * 60 * 60 * 1000),
    endsAt: new Date(Date.UTC(year, month + 1, 1) - 5 * 60 * 60 * 1000),
  };
}

export function selectMonthlyPoints(monthKey: string, points: { id: string; category: { code: string } }[]): string[] | null {
  const ids: string[] = [];
  for (const stage of EXPEDITION_STAGES) {
    const candidates = points.filter((point) => point.category.code === stage.category);
    if (candidates.length < stage.target) return null;
    // Stable random order for one month: all players and concurrent requests get the same route.
    const key = (id: string) => createHash('sha256').update(`${monthKey}:${id}`).digest('hex');
    candidates.sort((a, b) => key(a.id).localeCompare(key(b.id)));
    ids.push(...candidates.slice(0, stage.target).map((point) => point.id));
  }
  return ids;
}

export function completedExpeditionSteps(ids: string[], visitedIds: Set<string>) {
  let completed = 0;
  while (completed < ids.length && visitedIds.has(ids[completed])) completed++;
  return completed;
}
