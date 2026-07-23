/**
 * Разбивка карты на невидимые чанки ~1×1 км (упрощённо, как в Minecraft —
 * без строгой геодезической точности, приближение достаточно для игровой
 * механики). В каждом чанке допускается максимум один активный кристалл.
 */

const LAT_STEP_DEG = 1000 / 111_320; // ~0.00898° ≈ 1 км по широте
// Долгота "сжимается" по мере удаления от экватора — берём типичную широту
// Челябинской области (~55°) для приближённого шага в 1 км.
const LNG_STEP_DEG = 1000 / (111_320 * Math.cos((55 * Math.PI) / 180)); // ~0.01566°

export interface ChunkCoords {
  chunkX: number;
  chunkY: number;
}

export function toChunk(lat: number, lng: number): ChunkCoords {
  return {
    chunkX: Math.floor(lng / LNG_STEP_DEG),
    chunkY: Math.floor(lat / LAT_STEP_DEG),
  };
}

export function chunkBounds(chunkX: number, chunkY: number) {
  return {
    minLat: chunkY * LAT_STEP_DEG,
    maxLat: (chunkY + 1) * LAT_STEP_DEG,
    minLng: chunkX * LNG_STEP_DEG,
    maxLng: (chunkX + 1) * LNG_STEP_DEG,
  };
}

/** Случайная точка внутри чанка — новое место кристалла при генерации/респауне. */
export function randomPointInChunk(chunkX: number, chunkY: number) {
  const { minLat, maxLat, minLng, maxLng } = chunkBounds(chunkX, chunkY);
  return {
    lat: minLat + Math.random() * (maxLat - minLat),
    lng: minLng + Math.random() * (maxLng - minLng),
  };
}

/** Диапазон чанков, покрывающий круг видимости радиусом radiusM вокруг игрока. */
export function chunkRangeAround(lat: number, lng: number, radiusM: number) {
  const center = toChunk(lat, lng);
  // +1 чанк запаса, чтобы не терять кристаллы у самой границы круга
  const chunkSpan = Math.ceil(radiusM / 1000) + 1;
  return {
    minChunkX: center.chunkX - chunkSpan,
    maxChunkX: center.chunkX + chunkSpan,
    minChunkY: center.chunkY - chunkSpan,
    maxChunkY: center.chunkY + chunkSpan,
  };
}
