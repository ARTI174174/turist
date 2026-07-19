'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Poi } from '@/types';
import { GeoPosition } from '@/hooks/useGeolocation';

interface MapViewProps {
  pois: Poi[];
  position: GeoPosition | null;
  onSelectPoi: (poi: Poi) => void;
}

// Челябинская область — точка отсчёта карты по умолчанию (пока GPS не определён)
const DEFAULT_CENTER: [number, number] = [61.4, 55.15];
const DEFAULT_ZOOM = 8;

// Публичный демо-стиль для разработки. В проде — собственный style.json,
// сгенерированный из OSM-экстракта региона через Tileserver-GL/Martin (SRS п.9.1, 14.3).
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export function MapView({ pois, position, onSelectPoi }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);

  // Инициализация карты один раз
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
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

  // Позиция игрока — синяя точка + плавный follow при первом фиксе
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '9999px';
      el.style.background = '#3B82F6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.25)';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
      map.flyTo({ center: [position.lng, position.lat], zoom: 13 });
    } else {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position]);

  return <div ref={containerRef} className="map-viewport" />;
}
