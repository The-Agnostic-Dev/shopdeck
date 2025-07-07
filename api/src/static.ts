import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Hono } from 'hono'
import { config } from './config.js'
import { logger } from './lib/logger.js'

/** Serves the built admin app and falls back to index.html for client routes. */
export function mountWebApp(app: Hono) {
  const root = path.resolve(process.cwd(), config.WEB_DIST_DIR)
  const indexFile = path.join(root, 'index.html')
  if (!existsSync(indexFile)) {
    logger.warn('web build not found, serving the API only', { root })
    app.get('/', (c) => c.text('Shopdeck API is running. Build the web app (npm run build) or use the Vite dev server on :5326.'))
    return
  }
  const relativeRoot = path.relative(process.cwd(), root)
  app.use('/assets/*', serveStatic({ root: relativeRoot }))
  app.use('/favicon.svg', serveStatic({ root: relativeRoot }))
  const index = readFileSync(indexFile, 'utf8')
  app.get('*', (c) => c.html(index))
}
