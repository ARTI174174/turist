import type { Map as MapLibreMap, MapMouseEvent, ExpressionSpecification } from 'maplibre-gl';
import type { Poi } from '@/types';
import { flagSvg } from './flag-art';

const MARKERS: Record<string, number> = { photo: 3, city: 1, township: 11, village: 11, trail: 10, lake: 12, mountain: 2, river: 10, spring: 7, cave: 5, rare: 13, museum: 14, historic: 14, monument: 8, park: 4, secret: 6, waterfall: 10, abandoned: 3 };
const PRIORITY: Record<string, number> = { city: 19, township: 19, village: 19, mountain: 18, trail: 17, museum: 16, historic: 15, lake: 14, monument: 13 };
const SOURCE = 'turist-pois';
const ICONS = 'turist-poi-icons';
const DOTS = 'turist-poi-dots';

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('Не удалось загрузить изображение метки'));
    img.src = src;
  });
}

export function mountPoiLayers(map: MapLibreMap, pois: Poi[], tutorialId: string | undefined, select: (poi: Poi) => void, onError: () => void) {
  let disposed = false;
  let frame = 0;
  let lastPulse = 0;
  const imagesAdded = new Set<string>();
  const byId = new Map(pois.map((poi) => [poi.id, poi]));
  const fixed: ExpressionSpecification = ['==', ['get', 'fixed'], true];
  const scale = (pulse = 1): ExpressionSpecification => {
    const full: ExpressionSpecification = ['case', ['==', ['get', 'tutorial'], true], pulse, 1];
    return ['interpolate', ['linear'], ['zoom'], 8.5, ['case', fixed, full, .12], 12.5, full];
  };
  const click = (event: MapMouseEvent) => {
    if (!map.getLayer(ICONS)) return;
    const hits = map.queryRenderedFeatures(event.point, { layers: [ICONS, DOTS] });
    const chosen = hits.find((hit) => byId.has(String(hit.properties?.poiId)));
    const poi = chosen ? byId.get(String(chosen.properties?.poiId)) : undefined;
    if (poi) { map.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(map.getZoom(), 12), duration: 650 }); select(poi); }
  };
  const move = (event: MapMouseEvent) => {
    if (!map.getLayer(ICONS)) return;
    map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: [ICONS, DOTS] }).length ? 'pointer' : '';
  };
  const textures = new Map<string, Promise<string>>();
  const texture = (poi: Poi) => {
    const code = poi.visibility === 'secret' ? 'secret' : poi.category?.code ?? '';
    const src = MARKERS[code] ? `/assets/poi-markers/${MARKERS[code]}.png` : poi.markerAsset || poi.category?.iconAsset || '/assets/poi-markers/13.png';
    const key = `${src}:${poi.flag ? poi.id : 'plain'}`;
    const existing = textures.get(key); if (existing) return existing;
    const id = `turist-marker-${textures.size}`;
    const pending = (async () => {
      const canvas = document.createElement('canvas'); canvas.width = 92; canvas.height = 112;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      try { ctx.drawImage(await image(`${src}${src.includes('?') ? '&' : '?'}v=4`), 0, 0, 92, 112); }
      catch { ctx.fillStyle = '#ff941f'; ctx.beginPath(); ctx.arc(46, 76, 24, 0, Math.PI * 2); ctx.fill(); }
      if (poi.flag) {
        const flag = await image(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(flagSvg(poi.flag.design))}`);
        ctx.fillStyle = '#182219'; ctx.fillRect(49, 0, 43, 48); ctx.drawImage(flag, 49, 0, 43, 48);
      }
      if (!disposed) { map.addImage(id, ctx.getImageData(0, 0, 92, 112), { pixelRatio: 2 }); imagesAdded.add(id); }
      return id;
    })();
    textures.set(key, pending); return pending;
  };
  void (async () => {
    const valid = pois.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const features = await Promise.all(valid.map(async (poi) => ({
      type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [poi.lng, poi.lat] },
      properties: { poiId: poi.id, image: await texture(poi), priority: PRIORITY[poi.category?.code ?? ''] ?? 10,
        fixed: ['city', 'township', 'village'].includes(poi.category?.code ?? '') || poi.markerFixedSize === 1 || poi.id === tutorialId, tutorial: poi.id === tutorialId },
    })));
    if (disposed) return;
    // The original city names stay in their basemap layers ABOVE both POI layers.
    const labels = map.getStyle().layers.find((layer) => layer.type === 'symbol' && ('source-layer' in layer && layer['source-layer'] === 'place' || /place|settlement/i.test(layer.id)) && layer.layout?.['text-field']);
    map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features } });
    map.addLayer({ id: DOTS, type: 'circle', source: SOURCE, paint: {
      'circle-color': '#ff941f', 'circle-stroke-color': '#fff8e1', 'circle-stroke-width': 1,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5.5, 8.5, 6.5],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, ['case', fixed, 0, 1], 12.5, 0],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, ['case', fixed, 0, 1], 12.5, 0],
    } }, labels?.id);
    map.addLayer({ id: ICONS, type: 'symbol', source: SOURCE, layout: {
      'icon-image': ['get', 'image'], 'icon-size': scale(), 'icon-anchor': 'bottom',
      'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 'priority'],
    }, paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, ['case', fixed, 1, 0], 12.5, 1] } }, labels?.id);
    map.on('click', click); map.on('mousemove', move);
    if (tutorialId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const pulse = (time: number) => {
        if (disposed) return;
        if (time - lastPulse > 70 && map.getLayer(ICONS)) { map.setLayoutProperty(ICONS, 'icon-size', scale(1 + .05 * Math.sin(time / 260))); lastPulse = time; }
        frame = requestAnimationFrame(pulse);
      };
      frame = requestAnimationFrame(pulse);
    }
  })().catch(() => { if (!disposed) onError(); });
  return () => {
    disposed = true; cancelAnimationFrame(frame);
    map.off('click', click); map.off('mousemove', move); map.getCanvas().style.cursor = '';
    if (!map.getStyle()) return;
    for (const id of [ICONS, DOTS]) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    for (const id of imagesAdded) if (map.hasImage(id)) map.removeImage(id);
  };
}
