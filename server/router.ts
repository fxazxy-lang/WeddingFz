import type { Ctx } from './http';

export type Handler = (ctx: Ctx) => unknown | Promise<unknown>;
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface Route {
  method: Method;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

/** Minimal path router supporting `:param` segments. */
export class Router {
  private routes: Route[] = [];

  add(method: Method, path: string, handler: Handler): this {
    const keys: string[] = [];
    const source = path
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          keys.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler });
    return this;
  }

  get(path: string, handler: Handler) {
    return this.add('GET', path, handler);
  }
  post(path: string, handler: Handler) {
    return this.add('POST', path, handler);
  }
  patch(path: string, handler: Handler) {
    return this.add('PATCH', path, handler);
  }
  delete(path: string, handler: Handler) {
    return this.add('DELETE', path, handler);
  }

  /** Returns the handler and params, `'method'` if the path exists for another verb, or null. */
  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | 'method' | null {
    let pathMatched = false;
    for (const route of this.routes) {
      const found = route.pattern.exec(pathname);
      if (!found) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => (params[key] = decodeURIComponent(found[i + 1])));
      return { handler: route.handler, params };
    }
    return pathMatched ? 'method' : null;
  }
}
