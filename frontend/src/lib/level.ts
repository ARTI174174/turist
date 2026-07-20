// Зеркало backend/src/progression/progression.service.ts — держать в синхроне при изменении формулы.

export function levelThreshold(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return 10;
  if (level === 2) return 50;
  if (level === 3) return 100;
  return 100 * 2 ** (level - 3);
}

export function resolveLevel(xp: number) {
  let level = 0;
  while (levelThreshold(level + 1) <= xp && level < 200) level++;
  return {
    level,
    currentThreshold: levelThreshold(level),
    nextThreshold: level < 200 ? levelThreshold(level + 1) : null,
  };
}

/** Цвет обводки аватара по уровню (используется в списке друзей). */
export function levelBorderColor(level: number): string {
  if (level <= 0) return '#4CAF50';
  if (level <= 4) return '#2196F3';
  if (level <= 9) return '#FBC02D';
  if (level <= 19) return '#E53935';
  return '#9C27B0';
}
