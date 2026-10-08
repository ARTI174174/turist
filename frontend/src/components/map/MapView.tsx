'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Poi, Crystal } from '@/types';
import { mountPoiLayers } from '@/lib/poi-map-layer';
import { GeoPosition } from '@/hooks/useGeolocation';

interface MapViewProps {
  pois: Poi[];
  selectedPoi?: Poi | null;
  tutorialFocusPoi?: Poi | null;
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
const CHELYABINSK_BOUNDS: [[number, number], [number, number]] = [
  [56.0, 50.5],
  [64.0, 56.8],
];

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pois, selectedPoi = null, tutorialFocusPoi = null, crystals = [], position, userAvatar, onSelectPoi, onSelectCrystal },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const crystalMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const userAvatarContainerRef = useRef<HTMLDivElement | null>(null);
  const userHeadingLayerRef = useRef<HTMLDivElement | null>(null);
  const userAvatarValueRef = useRef<string | null>(null);
  const hasCenteredOnceRef = useRef(false);
  const tutorialFocusedPoiIdRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [markerError, setMarkerError] = useState(false);
  const [markerRetry, setMarkerRetry] = useState(0);

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
      attributionControl: { compact: true, customAttribution: '© OpenStreetMap contributors' },
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

      const shadeSource = 'chelyabinsk-oblast-outside-shade';
      map.addSource(shadeSource, {
        type: 'image',
        url: '/data/chelyabinsk-oblast-shade.png',
        coordinates: [[54.8, 58], [65.2, 58], [65.2, 49], [54.8, 49]],
      });
      // Put the shade below map symbols: POI icons are MapLibre symbol layers,
      // inserted immediately before place labels, so they stay visible outside
      // the region too.
      const firstSymbolLayer = style.layers.find((layer) => layer.type === 'symbol');
      map.addLayer({ id: 'chelyabinsk-oblast-outside-shade-layer', type: 'raster', source: shadeSource, paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 0,
        'raster-resampling': 'linear',
      } }, firstSymbolLayer?.id);

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
      crystalMarkersRef.current.forEach((m) => m.remove());
      userMarkerRef.current?.remove();
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
    if (!map || !mapReady || !tutorialFocusPoi || tutorialFocusedPoiIdRef.current === tutorialFocusPoi.id) return;
    tutorialFocusedPoiIdRef.current = tutorialFocusPoi.id;
    map.flyTo({ center: [tutorialFocusPoi.lng, tutorialFocusPoi.lat], zoom: Math.max(map.getZoom(), 13), duration: 1100 });
  }, [tutorialFocusPoi, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    setMarkerError(false);
    return mountPoiLayers(map, pois, tutorialFocusPoi?.id, (poi) => onSelectPoiRef.current(poi), () => setMarkerError(true));
  }, [pois, mapReady, tutorialFocusPoi?.id, markerRetry]);

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

  return <><div ref={containerRef} className="map-viewport" />{markerError && <button onClick={() => setMarkerRetry((retry) => retry + 1)} className="absolute inset-x-4 top-48 z-20 rounded-xl bg-panel p-3 text-xs text-parchment">Не удалось загрузить метки. Нажми, чтобы повторить.</button>}</>;
});
