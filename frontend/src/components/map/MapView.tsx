'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Poi, Crystal } from '@/types';
import { GeoPosition } from '@/hooks/useGeolocation';

interface MapViewProps {
  pois: Poi[];
  crystals?: Crystal[];
  position: GeoPosition | null;
  onSelectPoi: (poi: Poi) => void;
  onSelectCrystal?: (crystal: Crystal) => void;
}

export interface MapViewHandle {
  /** Центрирует карту на текущей позиции игрока (кнопка "Я" на карте). */
  recenterOnUser: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

// Челябинская область — точка отсчёта карты по умолчанию (пока GPS не определён)
const DEFAULT_CENTER: [number, number] = [61.4, 55.15];
const DEFAULT_ZOOM = 8;

// Векторный стиль CARTO Voyager (готовый, официальный) — подписи городов берутся
// из локального названия OSM (для России — кириллица), в отличие от растровых
// тайлов, где язык нельзя переопределить на лету.
const MAP_STYLE = 'https://tiles.basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// Жёсткие границы карты — примерно очерчивают Челябинскую область с запасом,
// чтобы карту нельзя было утащить/отдалить до вида всей страны/мира.
const CHELYABINSK_BOUNDS: [[number, number], [number, number]] = [
  [56.0, 50.5],
  [64.0, 56.8],
];

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pois, crystals = [], position, onSelectPoi, onSelectCrystal },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const crystalMarkersRef = useRef<Marker[]>([]);
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
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
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
    mapRef.current = map;

    // Подписи городов/деревень/озёр у CARTO хранятся как {name} (локальное, для
    // России — кириллица) и {name_en} (английское). У части слоёв стиль по
    // умолчанию переключается на {name_en} при отдалении карты — раньше здесь
    // ошибочно искали ключ "name:en" (через двоеточие), а реальный ключ —
    // "name_en" (через подчёркивание), поэтому подмена не срабатывала.
    // Заодно перекрашиваем карту под палитру приложения (лес/вода/дороги/дома).
    map.once('style.load', () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        if (layer.type !== 'symbol') continue;
        const textField = (layer.layout as any)?.['text-field'];
        if (textField && JSON.stringify(textField).includes('name_en')) {
          map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name'], ['get', 'name_en']]);
        }
      }

      const setPaint = (layerId: string, prop: string, value: any) => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value);
      };

      // Фон и лес/парки — в тон нашей палитры (parchment/moss)
      setPaint('background', 'background-color', '#EFE8D8');
      for (const id of ['landcover', 'park_national_park', 'park_nature_reserve']) {
        setPaint(id, 'fill-color', 'rgba(76, 122, 94, 0.28)');
      }
      // Вода — приглушённый сине-зелёный вместо стандартного голубого
      setPaint('water', 'fill-color', '#8fb8c2');
      setPaint('water_shadow', 'fill-color', '#7aa5b0');
      // Здания — тёплый парчмент с янтарной обводкой
      setPaint('building', 'fill-color', '#e9dcc8');
      setPaint('building-top', 'fill-color', '#f3e7d2');
      setPaint('building-top', 'fill-outline-color', '#C68A3A');
      // Крупные дороги — янтарные тона вместо стандартного жёлтого
      for (const id of ['road_trunk_fill_noramp', 'road_trunk_fill_ramp', 'road_mot_fill_noramp', 'road_mot_fill_ramp']) {
        setPaint(id, 'fill-color', '#DDA65C');
      }
      for (const id of ['road_pri_fill_noramp', 'road_pri_fill_ramp']) {
        setPaint(id, 'fill-color', '#EAD9B4');
      }
      // Подписи городов — в тон основного текста приложения
      for (const id of ['place_city_r5', 'place_city_r6', 'place_town', 'place_villages', 'place_hamlet', 'place_suburbs']) {
        setPaint(id, 'text-color', '#2E5B47');
      }
    });

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

  // Маркеры кристаллов — маленькие бриллианты, видны только в радиусе (сервер уже фильтрует)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    crystalMarkersRef.current.forEach((m) => m.remove());
    crystalMarkersRef.current = [];

    for (const crystal of crystals) {
      const el = document.createElement('button');
      el.setAttribute('aria-label', 'Кристалл');
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = "url('/assets/icons/diamond.png')";
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([crystal.lng, crystal.lat])
        .addTo(map);

      el.addEventListener('click', () => onSelectCrystal?.(crystal));
      crystalMarkersRef.current.push(marker);
    }
  }, [crystals, onSelectCrystal]);

  // Позиция игрока — компас вместо синей точки, разворачивается по направлению
  // взгляда (Device Orientation), первый фикс сразу центрирует карту.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '80px';
      el.style.height = '80px';
      el.style.backgroundImage = "url('/assets/icons/compass.png')";
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))';
      el.style.transition = 'transform 0.2s ease';
      userMarkerElRef.current = el;

      userMarkerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }

    // Вращаем иконку по направлению взгляда устройства, если доступно
    if (userMarkerElRef.current && position.heading !== null) {
      userMarkerElRef.current.style.transform = `rotate(${position.heading}deg)`;
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
