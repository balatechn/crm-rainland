/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    // Server-side proxy target. Use API_PROXY_TARGET (absolute URL) on Vercel so the
    // browser only talks to the same HTTPS origin and we avoid mixed-content blocking.
    const raw = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const target = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(target)) {
      // Relative target -> nothing to rewrite (browser hits same origin already).
      return [];
    }
    return [
      { source: '/api/:path*', destination: target + '/:path*' },
    ];
  },
};
