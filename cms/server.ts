/**
 * CMS Server
 *
 * Hono-based server that provides both API routes and serves the Vite dev frontend.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import yaml from 'js-yaml';
import { createServer as createViteServer } from 'vite';

import {
  createHandler,
  listHandler,
  ogCacheHandler,
  ogDataHandler,
  readHandler,
  toggleDraftHandler,
  toggleStickyHandler,
  writeHandler,
} from './src/api';
import { setCategoryMap } from './src/lib/category';
import { CMS_PORT } from './src/lib/config';

// Type for Hono context variables
type AppVariables = {
  projectRoot: string;
};

// Load project configuration
const CMS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CMS_DIR, '..');

// Load site config for category map
function loadSiteConfig() {
  const configPath = path.join(PROJECT_ROOT, 'config', 'site.yaml');
  if (!fs.existsSync(configPath)) {
    console.warn('[CMS] config/site.yaml not found');
    return {};
  }
  const content = fs.readFileSync(configPath, 'utf-8');
  return yaml.load(content) as Record<string, unknown>;
}

async function main() {
  const siteConfig = loadSiteConfig();

  // Set category map from config
  const categoryMap = (siteConfig.categoryMap as Record<string, string>) || {};
  setCategoryMap(categoryMap);

  // Create Hono app for API routes
  const app = new Hono<{ Variables: AppVariables }>();

  // Middleware
  app.use('*', logger());
  app.use('*', cors());

  // Security: localhost-only and optional API key authentication
  const CMS_API_KEY = process.env.CMS_API_KEY;
  app.use('/api/*', async (c, next) => {
    // Validate Host header to prevent DNS rebinding attacks
    const host = c.req.header('host') || '';
    const isLocalhost = /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/.test(host);
    if (!isLocalhost) {
      return c.json({ error: 'CMS is only accessible from localhost' }, 403);
    }

    // Optional API key authentication
    if (CMS_API_KEY) {
      const authHeader = c.req.header('authorization');
      const providedKey = authHeader?.replace('Bearer ', '');
      if (providedKey !== CMS_API_KEY) {
        return c.json({ error: 'Invalid or missing API key' }, 401);
      }
    }

    await next();
  });

  // Inject project root into context
  app.use('*', async (c, next) => {
    c.set('projectRoot', PROJECT_ROOT);
    await next();
  });

  // API routes
  app.get('/api/cms/list', listHandler);
  app.get('/api/cms/read', readHandler);
  app.post('/api/cms/write', writeHandler);
  app.post('/api/cms/create', createHandler);
  app.post('/api/cms/toggle-draft', toggleDraftHandler);
  app.post('/api/cms/toggle-sticky', toggleStickyHandler);
  app.get('/api/cms/og-data', ogDataHandler);
  app.get('/api/cms/og-cache', ogCacheHandler);

  // Config endpoint - returns project configuration for client use
  app.get('/api/cms/config', (c) => {
    return c.json({
      projectRoot: PROJECT_ROOT,
      contentDir: 'src/content/blog',
      categoryMap,
    });
  });

  // Create Vite dev server
  const vite = await createViteServer({
    root: CMS_DIR,
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Create native Node.js HTTP server
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    // Route API requests to Hono
    if (url.startsWith('/api/')) {
      // Convert Node.js IncomingMessage to Web ReadableStream for request body
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const body = hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined;

      const response = await app.fetch(
        new Request(`http://localhost${url}`, {
          method: req.method,
          headers: req.headers as HeadersInit,
          body,
          // @ts-expect-error - duplex is required for streaming body
          duplex: 'half',
        }),
      );

      // Send Hono response back
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      return;
    }

    // All other requests go to Vite
    vite.middlewares(req, res);
  });

  console.log(`\n🚀 CMS running at http://localhost:${CMS_PORT}\n`);

  server.listen(CMS_PORT);
}

main().catch(console.error);
