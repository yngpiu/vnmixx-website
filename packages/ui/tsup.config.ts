import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.tsx', 'src/**/*.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist/tsup',
  external: ['next', 'next/font/google', 'react', 'react-dom'],
  tsconfig: './tsconfig.json',
});
