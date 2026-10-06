'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Poi, Crystal } from '@/types';
import { GeoPosition } from '@/hooks/useGeolocation';

interface MapViewProps {
  pois: Poi[];
  selectedPoi?: Poi | null;
  crystals?: Crystal[];
  position: GeoPosition | null;
  userAvatar: string;
  onSelectPoi: (poi: Poi) => void;
  onSelectCrystal?: (crystal: Crystal) => void;
}

export interface MapViewHandle {
  /** Центрирует карту на текущей позиции игрока (кнопка "Я" на карте). */
  recenterOnUser: () => void;
  focusOnPoi: (poi: Poi) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const DEFAULT_CENTER: [number, number] = [61.4, 55.15];
const DEFAULT_ZOOM = 8;
const MAP_STYLE = 'https://tiles.basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
// Keep marker selection on the client as well as in the seed. This lets the
// new art appear immediately even while an older API/database seed is live.
const POI_MARKERS: Record<string, number> = {
  city: 1,
  township: 11,
  trail: 10,
  lake: 12,
  mountain: 2,
  river: 10,
  spring: 7,
  cave: 5,
  rare: 13,
  museum: 14,
  historic: 14,
  monument: 8,
  park: 4,
  secret: 6,
  waterfall: 10,
  village: 11,
  abandoned: 3,
};
// При наложении точек важные категории остаются сверху и доступны для нажатия.
const POI_MARKER_PRIORITY: Record<string, number> = {
  city: 100,
  mountain: 90,
  trail: 80,
  museum: 70,
  historic: 60,
  lake: 50,
  monument: 40,
};
const CHELYABINSK_BOUNDS: [[number, number], [number, number]] = [
  [56.0, 50.5],
  [64.0, 56.8],
];

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pois, selectedPoi = null, crystals = [], position, userAvatar, onSelectPoi, onSelectCrystal },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const crystalMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const userAvatarContainerRef = useRef<HTMLDivElement | null>(null);
  const userHeadingLayerRef = useRef<HTMLDivElement | null>(null);
  const userAvatarValueRef = useRef<string | null>(null);
  const hasCenteredOnceRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  // Храним актуальные callback-и, чтобы обновление GPS/родителя не заставляло
  // заново пересоздавать все маркеры.
  const onSelectPoiRef = useRef(onSelectPoi);
  const onSelectCrystalRef = useRef(onSelectCrystal);
  useEffect(() => {
    onSelectPoiRef.current = onSelectPoi;
    onSelectCrystalRef.current = onSelectCrystal;
  }, [onSelectPoi, onSelectCrystal]);

  useImperativeHandle(ref, () => ({
    focusOnPoi: (poi) => {
      const map = mapRef.current;
      if (map) map.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(map.getZoom(), 12), duration: 650 });
    },
    recenterOnUser: () => {
      const map = mapRef.current;
      if (map && position) {
        map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 13) });
      }
    },
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
  }), [position]);

  // Инициализация карты один раз.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Next.js does not emit MapLibre's module worker and its shared chunk
    // reliably through its bundlers. Serve the matching files from public/.
    setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 7,
      maxBounds: CHELYABINSK_BOUNDS,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    const handleLoad = () => {
      // Ключевой фикс: POI/кристаллы начинают рисоваться только после того,
      // как MapLibre действительно готов принимать маркеры.
      setMapReady(true);
    };
    map.once('load', handleLoad);

    map.once('style.load', () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        if (layer.type !== 'symbol') continue;
        const textField = (layer.layout as any)?.['text-field'];
        if (textField && JSON.stringify(textField).includes('name_en')) {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name'],
            ['get', 'name_en'],
          ]);
        }
      }

      const setPaint = (layerId: string, prop: string, value: any) => {
        try {
          // CARTO changes layer paint definitions between style versions.
          // Skip missing/unsupported properties instead of aborting map load.
          if (map.getLayer(layerId) && map.getPaintProperty(layerId, prop as any) !== undefined) {
            map.setPaintProperty(layerId, prop as any, value);
          }
        } catch {
          // A style layer may disappear while CARTO refreshes the style.
        }
      };

      setPaint('background', 'background-color', '#EFE8D8');
      for (const id of ['landcover', 'park_national_park', 'park_nature_reserve']) {
        setPaint(id, 'fill-color', 'rgba(76, 122, 94, 0.28)');
      }
      setPaint('water', 'fill-color', '#8fb8c2');
      setPaint('water_shadow', 'fill-color', '#7aa5b0');
      setPaint('building', 'fill-color', '#e9dcc8');
      setPaint('building-top', 'fill-color', '#f3e7d2');
      setPaint('building-top', 'fill-outline-color', '#C68A3A');

      for (const id of [
        'road_trunk_fill_noramp',
        'road_trunk_fill_ramp',
        'road_mot_fill_noramp',
        'road_mot_fill_ramp',
      ]) {
        setPaint(id, 'fill-color', '#DDA65C');
      }
      for (const id of ['road_pri_fill_noramp', 'road_pri_fill_ramp']) {
        setPaint(id, 'fill-color', '#EAD9B4');
      }
      for (const id of [
        'place_city_r5',
        'place_city_r6',
        'place_town',
        'place_villages',
        'place_hamlet',
        'place_suburbs',
      ]) {
        setPaint(id, 'text-color', '#2E5B47');
      }
    });

    return () => {
      map.off('load', handleLoad);
      markersRef.current.forEach((m) => m.remove());
      crystalMarkersRef.current.forEach((m) => m.remove());
      userMarkerRef.current?.remove();
      markersRef.current = [];
      crystalMarkersRef.current = [];
      userMarkerRef.current = null;
      userAvatarContainerRef.current = null;
      userHeadingLayerRef.current = null;
      userAvatarValueRef.current = null;
      hasCenteredOnceRef.current = false;
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // POI-маркеры. Зависимость от mapReady устраняет гонку между React-данными
  // и асинхронной загрузкой MapLibre.
  useEffect(() => {
    if (!mapReady || !selectedPoi) return;
    const map = mapRef.current;
    if (map) map.flyTo({ center: [selectedPoi.lng, selectedPoi.lat], zoom: Math.max(map.getZoom(), 12), duration: 650 });
  }, [selectedPoi, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const poi of pois) {
      if (!Number.isFinite(poi.lat) || !Number.isFinite(poi.lng)) continue;

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', poi.title);
      el.title = poi.title;
      Object.assign(el.style, {
        display: 'block',
        width: '46px',
        height: '56px',
        padding: '0',
        border: '0',
        borderRadius: '0',
        background: 'transparent',
        boxShadow: 'none',
        cursor: 'pointer',
        zIndex: String(POI_MARKER_PRIORITY[poi.category?.code ?? ''] ?? 10),
      });
      // Use an actual image element: CSS background styles and blend modes on
      // map buttons made the illustrated pins look like tiny dark circles.
      const categoryCode = poi.category?.code;
      const markerNumber = poi.visibility === 'secret' ? POI_MARKERS.secret
        : categoryCode ? POI_MARKERS[categoryCode] : undefined;
      const markerAsset = markerNumber
        ? `/assets/poi-markers/${markerNumber}.png`
        : poi.markerAsset || poi.category?.iconAsset;
      if (markerAsset) {
        const image = document.createElement('img');
        image.src = `${markerAsset}${markerAsset.includes('?') ? '&' : '?'}v=3`;
        image.alt = '';
        image.draggable = false;
        Object.assign(image.style, {
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))',
          pointerEvents: 'none',
        });
        el.appendChild(image);
      }
      if (poi.flag) {
        const badge = document.createElement('div');
        badge.title = `Флаг игрока ${poi.flag.user.nickname}`;
        Object.assign(badge.style, { position: 'absolute', top: '-7px', right: '-5px', width: '25px', height: '27px', borderRadius: '7px', background: 'rgba(10,15,10,.88)', border: '1px solid rgba(219,190,118,.8)', boxShadow: '0 2px 5px #0008' });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
        const pole = document.createElementNS(svg.namespaceURI, 'line');
        pole.setAttribute('x1', '20'); pole.setAttribute('y1', '12'); pole.setAttribute('x2', '20'); pole.setAttribute('y2', '94'); pole.setAttribute('stroke', '#f5e8c8'); pole.setAttribute('stroke-width', '7'); svg.appendChild(pole);
        const design = Array.isArray(poi.flag.design) ? poi.flag.design as Record<string, number | string>[] : [];
        for (const part of design) {
          const shape = document.createElementNS(svg.namespaceURI, part.type === 'line' ? 'line' : 'circle');
          if (part.type === 'line') { shape.setAttribute('x1', String(part.x1)); shape.setAttribute('y1', String(part.y1)); shape.setAttribute('x2', String(part.x2)); shape.setAttribute('y2', String(part.y2)); shape.setAttribute('stroke', String(part.color)); shape.setAttribute('stroke-width', '6'); }
          else { shape.setAttribute('cx', String(part.x)); shape.setAttribute('cy', String(part.y)); shape.setAttribute('r', String(part.r)); shape.setAttribute('fill', String(part.color)); }
          svg.appendChild(shape);
        }
        if (!design.length) {
          const flagShape = document.createElementNS(svg.namespaceURI, 'path');
          flagShape.setAttribute('d', 'M23 12 H88 L70 38 L88 62 H23 Z'); flagShape.setAttribute('fill', '#E74C3C'); svg.appendChild(flagShape);
        }
        badge.appendChild(svg); el.appendChild(badge);
      }

      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      el.addEventListener('click', () => {
        map.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(map.getZoom(), 12), duration: 650 });
        onSelectPoiRef.current(poi);
      });
      markersRef.current.push(marker);
    }
  }, [pois, mapReady]);

  // Кристаллы.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    crystalMarkersRef.current.forEach((m) => m.remove());
    crystalMarkersRef.current = [];

    for (const crystal of crystals) {
      if (!Number.isFinite(crystal.lat) || !Number.isFinite(crystal.lng)) continue;

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', 'Кристалл');
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.backgroundImage = "url('/assets/icons/diamond.png')";
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.cursor = 'pointer';
      el.style.padding = '0';
      el.style.border = '0';
      el.style.backgroundColor = 'transparent';
      el.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))';
      el.style.zIndex = '11';

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([crystal.lng, crystal.lat])
        .addTo(map);

      el.addEventListener('click', () => onSelectCrystalRef.current?.(crystal));
      crystalMarkersRef.current.push(marker);
    }
  }, [crystals, mapReady]);

  // Маркер игрока показывает выбранный аватар, а отдельная стрелка указывает направление.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !position) return;

    if (!userMarkerRef.current) {
      // el — контейнер ТОЛЬКО для MapLibre (он пишет сюда translate для позиции)
      const el = document.createElement('div');
      el.style.width = '72px';
      el.style.height = '72px';
      el.style.zIndex = '12';

      const inner = document.createElement('div');
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.boxSizing = 'border-box';
      inner.style.position = 'relative';
      inner.style.border = '3px solid #f1ead9';
      inner.style.borderRadius = '50%';
      inner.style.background = '#173d2f';
      inner.style.boxShadow = '0 0 0 2px #b5a775, 0 2px 7px rgba(0,0,0,0.55)';

      const avatarContainer = document.createElement('div');
      avatarContainer.style.position = 'absolute';
      avatarContainer.style.inset = '5px';
      avatarContainer.style.overflow = 'hidden';
      avatarContainer.style.borderRadius = '50%';
      avatarContainer.style.background = '#253329';

      const headingLayer = document.createElement('div');
      headingLayer.style.position = 'absolute';
      headingLayer.style.inset = '0';
      headingLayer.style.transition = 'transform 0.2s ease';
      headingLayer.style.pointerEvents = 'none';
      const arrow = document.createElement('div');
      arrow.style.position = 'absolute';
      arrow.style.top = '-3px';
      arrow.style.left = '50%';
      arrow.style.marginLeft = '-7px';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '7px solid transparent';
      arrow.style.borderRight = '7px solid transparent';
      arrow.style.borderBottom = '15px solid #f0a526';
      arrow.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
      headingLayer.appendChild(arrow);

      inner.appendChild(avatarContainer);
      inner.appendChild(headingLayer);
      el.appendChild(inner);
      userAvatarContainerRef.current = avatarContainer;
      userHeadingLayerRef.current = headingLayer;
      userMarkerRef.current = new Marker({
        element: el,
        rotationAlignment: 'viewport',
      })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }

    if (userAvatarContainerRef.current && userAvatarValueRef.current !== userAvatar) {
      userAvatarContainerRef.current.replaceChildren();
      if (/^\/assets\/avatars\/\d+\.jpg$/.test(userAvatar)) {
        const avatar = document.createElement('img');
        avatar.src = userAvatar;
        avatar.alt = 'Ваш аватар';
        avatar.style.width = '100%';
        avatar.style.height = '100%';
        avatar.style.objectFit = 'cover';
        userAvatarContainerRef.current.appendChild(avatar);
      } else {
        const fallback = document.createElement('span');
        fallback.textContent = userAvatar || '🙂';
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.fontSize = '30px';
        userAvatarContainerRef.current.appendChild(fallback);
      }
      userAvatarValueRef.current = userAvatar;
    }
    if (userHeadingLayerRef.current && position.heading !== null) {
      userHeadingLayerRef.current.style.transform = `rotate(${position.heading}deg)`;
    }

    if (!hasCenteredOnceRef.current) {
      hasCenteredOnceRef.current = true;
      if (selectedPoi) map.flyTo({ center: [selectedPoi.lng, selectedPoi.lat], zoom: Math.max(map.getZoom(), 12), duration: 650 });
      else map.flyTo({ center: [position.lng, position.lat], zoom: 13 });
    }
  }, [position, mapReady, userAvatar, selectedPoi]);

  return <div ref={containerRef} className="map-viewport" />;
});
