#!/usr/bin/env node
/**
 * INT-07: Generate Postman collection from NestJS controllers.
 *
 * Usage:
 *   node scripts/generate-postman-collection.mjs [--output path]
 *
 * Scans all *.controller.ts files, extracts @Controller prefix,
 * route decorators (@Get, @Post, @Patch, @Delete, @Put),
 * @ApiOperation summaries, @Public markers, and @Body DTO refs.
 * Outputs Postman Collection v2.1 JSON.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', 'src');
const DEFAULT_OUTPUT = resolve(__dirname, '..', '..', 'docs', 'postman-collection.json');

/* ── File discovery ── */

function collectControllerFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectControllerFiles(full));
      continue;
    }
    if (entry.name.endsWith('.controller.ts') && !entry.name.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results.sort();
}

/* ── Parsing ── */

const CONTROLLER_RE = /@Controller\(\s*['"]([^'"]+)['"]\s*\)/;
const ROUTE_METHOD_RE = /@(Get|Post|Patch|Delete|Put)\(\s*(?:['"]([^'"]*)['"]\s*)?\)/;
const API_OP_RE = /@ApiOperation\(\s*\{[^}]*summary:\s*['"]([^'"]+)['"]/;
const PUBLIC_RE = /@Public\(\)/;
const BODY_DTO_RE = /@Body\(\)[^:]*:\s*(\w+)/;
const THROTTLE_RE = /@Throttle\(/;

function extractModule(filePath, srcDir) {
  const rel = relative(srcDir, filePath);
  const parts = rel.split('/');
  const modulesIdx = parts.indexOf('modules');
  if (modulesIdx >= 0 && parts.length > modulesIdx + 1) return parts[modulesIdx + 1];
  return parts[0];
}

function parseController(filePath, srcDir) {
  const source = readFileSync(filePath, 'utf-8');
  const controllerMatch = source.match(CONTROLLER_RE);
  if (!controllerMatch) return null;

  const basePath = controllerMatch[1];
  const module = extractModule(filePath, srcDir);
  const lines = source.split('\n');
  const routes = [];
  let pendingMeta = { summary: '', isPublic: false, dto: null, throttled: false };

  for (const line of lines) {
    const trimmed = line.trim();

    // Collect metadata from decorators above the route
    const apiOpMatch = trimmed.match(API_OP_RE);
    if (apiOpMatch) {
      pendingMeta.summary = apiOpMatch[1];
      continue;
    }
    if (PUBLIC_RE.test(trimmed)) {
      pendingMeta.isPublic = true;
      continue;
    }
    if (THROTTLE_RE.test(trimmed)) {
      pendingMeta.throttled = true;
      continue;
    }

    const routeMatch = trimmed.match(ROUTE_METHOD_RE);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const subPath = routeMatch[2] ?? '';
      const fullPath = subPath ? `${basePath}/${subPath}` : basePath;

      routes.push({
        method,
        path: `/api/${fullPath}`,
        summary: pendingMeta.summary,
        isPublic: pendingMeta.isPublic,
        throttled: pendingMeta.throttled,
      });
      pendingMeta = { summary: '', isPublic: false, dto: null, throttled: false };
      continue;
    }

    // Check for @Body DTO in method signature (same line or next)
    const bodyMatch = trimmed.match(BODY_DTO_RE);
    if (bodyMatch && routes.length > 0) {
      routes[routes.length - 1].dto = bodyMatch[1];
    }
  }

  return { basePath, module, routes };
}

/* ── Postman Collection v2.1 generation ── */

function buildPostmanUrl(path) {
  // Replace :param with {{param}} for Postman variables
  const pathWithVars = path.replace(/:(\w+)/g, '{{$1}}');
  const segments = pathWithVars.split('/').filter(Boolean);
  return {
    raw: `{{baseUrl}}${pathWithVars}`,
    host: ['{{baseUrl}}'],
    path: segments,
  };
}

function buildRequest(route) {
  const req = {
    method: route.method,
    header: [
      { key: 'Content-Type', value: 'application/json', type: 'text' },
    ],
    url: buildPostmanUrl(route.path),
  };

  if (!route.isPublic) {
    req.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    };
  }

  if (['POST', 'PATCH', 'PUT'].includes(route.method)) {
    req.body = {
      mode: 'raw',
      raw: route.dto ? `// DTO: ${route.dto}\n{}` : '{}',
      options: { raw: { language: 'json' } },
    };
  }

  return req;
}

function generateCollection(controllers) {
  // Group by module
  const byModule = new Map();
  for (const ctrl of controllers) {
    for (const route of ctrl.routes) {
      const list = byModule.get(ctrl.module) ?? [];
      list.push({ ...route, controllerPath: ctrl.basePath });
      byModule.set(ctrl.module, list);
    }
  }

  const folders = [];
  const sortedModules = [...byModule.keys()].sort();

  for (const mod of sortedModules) {
    const routes = byModule.get(mod);
    const items = routes.map(route => ({
      name: route.summary || `${route.method} ${route.path}`,
      request: buildRequest(route),
      response: [],
    }));
    folders.push({ name: mod, item: items });
  }

  return {
    info: {
      _postman_id: 'energy-monitor-v2',
      name: 'Energy Monitor v2 — API Collection',
      description: 'Auto-generated from NestJS controllers. Use {{baseUrl}} and {{accessToken}} variables.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000', description: 'API base URL' },
      { key: 'accessToken', value: '', description: 'JWT access token from /auth/login' },
    ],
    item: folders,
  };
}

/* ── Main ── */

export function generate(srcDir = SRC_DIR) {
  const files = collectControllerFiles(srcDir);
  const controllers = [];

  for (const file of files) {
    const parsed = parseController(file, srcDir);
    if (!parsed) continue;
    controllers.push(parsed);
  }

  const collection = generateCollection(controllers);
  const totalRoutes = controllers.reduce((acc, c) => acc + c.routes.length, 0);
  const totalFolders = collection.item.length;

  return {
    collection,
    json: JSON.stringify(collection, null, 2),
    totalRoutes,
    totalFolders,
    modules: [...new Set(controllers.map(c => c.module))].sort(),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const outputIdx = process.argv.indexOf('--output');
  const outputPath = outputIdx >= 0 ? resolve(process.argv[outputIdx + 1]) : DEFAULT_OUTPUT;

  const result = generate();
  writeFileSync(outputPath, result.json, 'utf-8');
  console.log(`Postman collection: ${result.totalRoutes} routes, ${result.totalFolders} folders → ${outputPath}`);
}
