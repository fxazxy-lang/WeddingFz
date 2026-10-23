// Production build: bundles the two React apps, writes HTML with hashed asset
// names, copies /public, and bundles the Node server into dist/server.js.
// On Vercel (or with --vercel) it also writes .vercel/output (Build Output API v3):
// the site as static files on the CDN, plus one function that serves /api/*.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPublic = path.join(root, 'dist', 'public');

const PAGES = {
  index: 'src/site/main.tsx',
  admin: 'src/admin/main.tsx',
};

export function clientOptions({ production }) {
  return {
    absWorkingDir: root,
    entryPoints: { site: PAGES.index, admin: PAGES.admin },
    outdir: path.join(outPublic, 'assets'),
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
    jsx: 'automatic',
    minify: production,
    sourcemap: production ? false : 'inline',
    entryNames: '[name]-[hash]',
    chunkNames: 'chunk-[hash]',
    assetNames: '[name]-[hash]',
    loader: { '.svg': 'file', '.png': 'file', '.jpg': 'file', '.webp': 'file', '.woff2': 'file' },
    define: { 'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development') },
    metafile: true,
    logLevel: 'info',
  };
}

/** Inject hashed script/style tags into the HTML templates. */
export function writeHtml(metafile) {
  for (const [page, entry] of Object.entries(PAGES)) {
    const output = Object.entries(metafile.outputs).find(([, o]) => o.entryPoint === entry);
    if (!output) throw new Error(`No build output for ${entry}`);
    const [jsPath, meta] = output;
    const href = (p) => '/' + path.relative(outPublic, path.join(root, p)).split(path.sep).join('/');
    const tags = [
      meta.cssBundle ? `<link rel="stylesheet" href="${href(meta.cssBundle)}" />` : '',
      `<script type="module" src="${href(jsPath)}"></script>`,
    ].join('\n    ');
    const template = fs.readFileSync(path.join(root, 'src', 'html', `${page}.html`), 'utf8');
    fs.writeFileSync(path.join(outPublic, `${page}.html`), template.replace('<!-- assets -->', tags));
  }
}

export function copyPublic() {
  fs.cpSync(path.join(root, 'public'), outPublic, { recursive: true });
  // Wedding photos and the QR live in /photo at the project root and are served at /photo/<file>.
  const photos = path.join(root, 'photo');
  if (fs.existsSync(photos)) fs.cpSync(photos, path.join(outPublic, 'photo'), { recursive: true });
  // Music and the opening chime live in /audio and are served at /audio/<file>.
  const audio = path.join(root, 'audio');
  if (fs.existsSync(audio)) fs.cpSync(audio, path.join(outPublic, 'audio'), { recursive: true });
}

export const serverOptions = {
  absWorkingDir: root,
  entryPoints: ['server/index.ts'],
  outfile: path.join(root, 'dist', 'server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['node:sqlite'],
  // Bundled CommonJS dependencies (jszip) still call require() for Node built-ins.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
};

/** Security headers for every response (the function sets the same on API replies). */
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    'frame-src https://www.google.com https://maps.google.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=15552000',
};

async function buildVercelOutput() {
  const out = path.join(root, '.vercel', 'output');
  fs.rmSync(out, { recursive: true, force: true });

  // 1. The built site, photos and audio, served by Vercel's CDN.
  fs.cpSync(outPublic, path.join(out, 'static'), { recursive: true });

  // 2. One Node function for every /api/* route, bundled into a single file.
  const fn = path.join(out, 'functions', 'api.func');
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['server/vercel.ts'],
    outfile: path.join(fn, 'index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['node:sqlite'],
    // Make the default export the module itself, which is what the Node launcher calls.
    footer: { js: 'module.exports = module.exports.default; module.exports.default = module.exports;' },
    logLevel: 'info',
  });
  fs.writeFileSync(path.join(fn, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  fs.writeFileSync(
    path.join(fn, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: false,
        maxDuration: 30,
      },
      null,
      2,
    ),
  );

  // 3. Routing: headers everywhere, /api/* to the function, /admin to its page.
  const config = {
    version: 3,
    routes: [
      { src: '/(.*)', headers: SECURITY_HEADERS, continue: true },
      { src: '^/assets/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
      { src: '^/(photo|audio)/(.*)$', headers: { 'Cache-Control': 'public, max-age=86400, must-revalidate' }, continue: true },
      { src: '^/api/(.*)$', dest: '/api?__path=$1' },
      { src: '^/admin(?:/.*)?$', dest: '/admin.html' },
      { src: '^/$', dest: '/index.html' },
      { handle: 'filesystem' },
      { src: '/(.*)', status: 404, dest: '/index.html' },
    ],
  };
  fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify(config, null, 2));
  console.log('Vercel output written to .vercel/output');
}

async function main() {
  fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
  fs.mkdirSync(outPublic, { recursive: true });
  copyPublic();
  const client = await esbuild.build(clientOptions({ production: true }));
  writeHtml(client.metafile);
  await esbuild.build(serverOptions);
  if (process.env.VERCEL || process.argv.includes('--vercel')) {
    await buildVercelOutput();
    console.log('\nBuild complete for Vercel.');
  } else {
    console.log('\nBuild complete. Start with: npm start');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
