import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/index.ts'], bundle: true, format: 'esm', outfile: 'dist/index.es.js',
  external: ['react', 'react-dom', 'react/jsx-runtime'], jsx: 'automatic', loader: { '.css': 'empty' },
});
copyFileSync('src/fieldnote.css', 'dist/fieldnote.css');
