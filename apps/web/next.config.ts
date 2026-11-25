import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  env: { VITE_API_MODE: process.env.VITE_API_MODE ?? 'mock' },
  transpilePackages: ['@franchise-crm/shared'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
