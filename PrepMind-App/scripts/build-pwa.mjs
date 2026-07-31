/**
 * Post-export PWA build step.
 *
 * `expo export` produces a bare index.html with no PWA wiring, and Expo Router's
 * `app/+html.tsx` hook is only honoured for static rendering (this app uses
 * `web.output: "single"`). So we inject the PWA tags here instead.
 *
 * Without this the site loads but CANNOT be installed to the home screen:
 *   - <link rel="manifest">        → tells the browser this is an installable app
 *   - apple-mobile-web-app-*       → iOS standalone mode (Safari ignores the manifest)
 *   - service worker registration  → offline shell + app-like behaviour
 *
 * Also copies manifest.json / service-worker.js / the app icon into dist.
 * Written in Node so it behaves identically on Windows and on Vercel's Linux builders.
 *
 * Run: node scripts/build-pwa.mjs   (after `expo export --platform web`)
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('[build-pwa] dist/ not found — run `expo export --platform web` first.');
  process.exit(1);
}

// ── 1. Copy PWA files into dist ───────────────────────────────────────────────
mkdirSync(join(dist, 'assets'), { recursive: true });

const copies = [
  ['web/manifest.json', 'manifest.json'],
  ['web/service-worker.js', 'service-worker.js'],
  ['assets/icon.png', 'assets/icon.png'],
];

for (const [from, to] of copies) {
  const src = join(root, from);
  if (existsSync(src)) {
    copyFileSync(src, join(dist, to));
    console.log(`[build-pwa] copied ${from} -> dist/${to}`);
  } else {
    console.warn(`[build-pwa] WARNING missing ${from}`);
  }
}

// ── 2. Inject PWA tags into index.html ────────────────────────────────────────
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('[build-pwa] PWA tags already present — skipping injection.');
} else {
  const tags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0066FF" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="PrepMind" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <style>
      body { background-color: #F8FAFF; }
      @media (prefers-color-scheme: dark) { body { background-color: #000000; } }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/service-worker.js').catch(function (e) {
            console.warn('SW registration failed:', e);
          });
        });
      }
    </script>
  </head>`;

  html = html.replace('</head>', tags);

  // Make it feel like an app, not a zoomable web page.
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />'
  );

  writeFileSync(indexPath, html, 'utf8');
  console.log('[build-pwa] injected PWA tags into dist/index.html');
}

console.log('[build-pwa] done.');
