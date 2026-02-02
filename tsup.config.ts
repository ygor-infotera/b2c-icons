import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,  // Don't clean dist to preserve CSS files
  treeshake: true,
  external: ['react'],
  outDir: 'dist',
});
