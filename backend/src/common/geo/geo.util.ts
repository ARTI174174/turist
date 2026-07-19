/**
 * Геоутилиты для MVP.
 *
 * Примечание по архитектуре (см. SRS, разделы 9 и 10):
 * в проде геозапросы ("точки в радиусе N", "точки в bbox") выполняются
 * средствами PostGIS (ST_DWithin, GiST-индекс по geography(Point,4326))
 * через $queryRaw — это даёт корректную работу на больших объёмах данных.
 * Для читаемости MVP-кода здесь также приведена JS-реализация формулы
 * гаверсинуса, пригодная для unit-тестирования бизнес-логики (античит,
 * расчёт dwell-time) без поднятия реальной БД.
 */

const EARTH_RADIUS_M = 6371000;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Расстояние между двумя точками в метрах (формула гаверсинуса). */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/** Скорость перемещения между двумя гео-точками, км/ч. */
export function speedKmh(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  seconds: number,
): number {
  if (seconds <= 0) return Infinity;
  const distanceM = haversineDistanceMeters(lat1, lng1, lat2, lng2);
  const hours = seconds / 3600;
  return distanceM / 1000 / hours;
}

export function parseBbox(bbox?: string) {
  if (!bbox) return null;
  const parts = bbox.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}
