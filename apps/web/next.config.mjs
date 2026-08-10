import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from monorepo root so all env vars are available
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '..', '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ship a minimal, self-contained server for Docker deployment.
  // See: https://nextjs.org/docs/app/api-reference/next-config-js/output
  output: 'standalone',
  // In a pnpm monorepo, tell Next which files it needs to trace beyond this app.
  outputFileTracingRoot: resolve(__dirname, '..', '..'),
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.tunagri.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.traditionjardin.fr' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'www.trattoriweb.com' },
      // Allow local dev images (useful when pasting local URLs during admin uploads)
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
  ],
};

export default nextConfig;
