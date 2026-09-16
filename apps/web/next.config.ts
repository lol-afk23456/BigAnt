import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, experimental: { cpus: 2 }, async rewrites() { const api = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001'; return [{source:'/api/:path*',destination:`${api}/:path*`},{source:'/auth/:path*',destination:`${api}/auth/:path*`}]; }, async headers() { return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'}]}]; } };
export default config;
