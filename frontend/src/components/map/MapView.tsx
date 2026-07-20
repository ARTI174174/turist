'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Poi } from '@/types';
import { GeoPosition } from '@/hooks/useGeolocation';

interface MapViewProps {
  pois: Poi[];
  position: GeoPosition | null;
  onSelectPoi: (poi: Poi) => void;
}

export interface MapViewHandle {
  /** Центрирует карту на текущей позиции игрока (кнопка "Я" на карте). */
  recenterOnUser: () => void;
}

// Челябинская область — точка отсчёта карты по умолчанию (пока GPS не определён)
const DEFAULT_CENTER: [number, number] = [61.4, 55.15];
const DEFAULT_ZOOM = 8;

// Растровые тайлы CARTO Voyager (на базе данных OpenStreetMap) — реальные дороги,
// здания, подписи городов. Бесплатно, без ограничений по количеству запросов
// для некоммерческого использования. В проде — собственный тайл-сервер (SRS п.9.1, 14.3).
const MAP_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
};

// Жёсткие границы карты — примерно очерчивают Челябинскую область с запасом,
// чтобы карту нельзя было утащить/отдалить до вида всей страны/мира.
const CHELYABINSK_BOUNDS: [[number, number], [number, number]] = [
  [56.0, 50.5],
  [64.0, 56.8],
];

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pois, position, onSelectPoi },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const userMarkerElRef = useRef<HTMLDivElement | null>(null);
  const hasCenteredOnceRef = useRef(false);

  useImperativeHandle(ref, () => ({
    recenterOnUser: () => {
      const map = mapRef.current;
      if (map && position) {
        map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 13) });
      }
    },
  }));

  // Инициализация карты один раз
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 7,
      maxBounds: CHELYABINSK_BOUNDS,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Обновление маркеров точек интереса при изменении списка
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const poi of pois) {
      const el = document.createElement('button');
      el.setAttribute('aria-label', poi.title);
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '9999px';
      el.style.border = '2px solid #EFE8D8';
      el.style.background = poi.category.colorHex;
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
      el.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      el.addEventListener('click', () => onSelectPoi(poi));
      markersRef.current.push(marker);
    }
  }, [pois, onSelectPoi]);

  // Позиция игрока — компас вместо синей точки, разворачивается по направлению
  // взгляда (Device Orientation), первый фикс сразу центрирует карту.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))';
      el.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40" style="transition: transform 0.2s ease;">
          <circle cx="20" cy="20" r="17" fill="#1F4235" stroke="#EFE8D8" stroke-width="2.5" />
          <circle cx="20" cy="20" r="17" fill="none" stroke="#C68A3A" stroke-width="1" stroke-dasharray="2 3" />
          <path d="M20 8 L25 22 L20 19 L15 22 Z" fill="#C68A3A" />
          <text x="20" y="7" text-anchor="middle" font-size="5" fill="#EFE8D8" font-family="sans-serif">N</text>
        </svg>
      `;
      userMarkerElRef.current = el;

      userMarkerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }

    // Вращаем стрелку компаса по направлению взгляда устройства, если доступно
    if (userMarkerElRef.current && position.heading !== null) {
      const svg = userMarkerElRef.current.querySelector('svg') as SVGElement | null;
      if (svg) svg.style.transform = `rotate(${position.heading}deg)`;
    }

    // Центрируем карту на игроке только один раз, при первом определении позиции —
    // дальше пользователь сам управляет картой (не "прыгает" под ногами при каждом обновлении GPS)
    if (!hasCenteredOnceRef.current) {
      hasCenteredOnceRef.current = true;
      map.flyTo({ center: [position.lng, position.lat], zoom: 13 });
    }
  }, [position]);

  return <div ref={containerRef} className="map-viewport" />;
});
