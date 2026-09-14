import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  distDir: process.env.COFORM_PREVIEW_DIR || '.next',
  turbopack: { root: path.resolve(process.cwd()) },
  devIndicators: false,
};
export default config;
