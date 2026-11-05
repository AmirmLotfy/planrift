import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// PLANRIFT makes no third-party requests at runtime: no analytics, no remote fonts,
// no remote models or HDR maps. Imported scene files are parsed as data, never fetched or executed.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev badge covers the bottom-left of the studio in QA screenshots; errors still surface.
  devIndicators: false,
  // Lets parallel agents preview with separate build folders: NEXT_DIST_DIR=.next-hero next dev -p 3201
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Disk on the build machine is tight; Turbopack's persistent cache filled it once already.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
