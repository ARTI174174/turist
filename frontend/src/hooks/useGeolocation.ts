'use client';

import { useEffect, useRef, useState } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  heading: number | null;
}

interface UseGeolocationOptions {
  watch?: boolean;
  enableHighAccuracy?: boolean;
}

export function useGeolocation({ watch = true, enableHighAccuracy = true }: UseGeolocationOptions = {}) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setError('Геолокация не поддерживается устройством/браузером');
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        heading: pos.coords.heading,
      });
      setError(null);
    };

    const onError = (err: GeolocationPositionError) => {
      // Дружелюбная обработка (SRS п.7.4 — пустые состояния/ошибки)
      if (err.code === err.PERMISSION_DENIED) {
        setError('Доступ к геолокации запрещён. Включите его в настройках браузера.');
      } else {
        setError('Не удалось определить местоположение');
      }
    };

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy,
        maximumAge: 5000,
        timeout: 15000,
      });
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy });
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [watch, enableHighAccuracy]);

  return { position, error };
}
