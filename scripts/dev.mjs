// Development: rebuilds the React apps on change and restarts the server via tsx.
import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientOptions, copyPublic, writeHtml } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'dist', 'public'), { recursive: true });
copyPublic();

const options = clientOptions({ production: false });
const ctx = await esbuild.context({
  ...options,
  plugins: [
    {
      name: 'write-html',
      setup(build) {
        build.onEnd((result) => {
          if (result.metafile) writeHtml(result.metafile);
        });
      },
    },
  ],
});
await ctx.watch();

const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');
const server = spawn(process.execPath, [tsxCli, 'watch', '--clear-screen=false', 'server/index.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--disable-warning=ExperimentalWarning' },
});

const stop = async () => {
  server.kill();
  await ctx.dispose();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
