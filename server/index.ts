import { createServer } from 'node:http';
import { handleRequest } from './app';
import { db, dbKind } from './db';
import { env } from './env';
import { serveStatic } from './static';

/** Local / self-hosted server: API plus the built site from dist/public. */
const server = createServer((req, res) => void handleRequest(req, res, { serveStatic }));

// Open the database and run migrations before accepting traffic.
await db();

server.listen(env.port, env.host, () => {
  console.log(`Wedding site ready on http://localhost:${env.port}  (admin: /admin, database: ${dbKind()})`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, closing server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
