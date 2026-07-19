const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Векторные тайлы карты — Cache First с фоновым обновлением (SRS п.15.2)
      urlPattern: /^https:\/\/.*\/tiles\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'turist-map-tiles',
        expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Карточки точек интереса — Stale-While-Revalidate
      urlPattern: /\/api\/v1\/poi\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'turist-poi-cache' },
    },
    {
      // Фото точек — Cache First с лимитом
      urlPattern: /\.(?:png|jpg|jpeg|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'turist-images',
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

module.exports = withPWA(nextConfig);
