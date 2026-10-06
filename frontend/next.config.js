const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // No remote next/image sources are currently used. Avoid exposing the
  // image optimizer as an unrestricted proxy for arbitrary HTTPS hosts.
};

module.exports = nextConfig;
