import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-postman-collection', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-postman-collection.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-postman-test.json');

  let collection: any;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    collection = JSON.parse(readFileSync(tmpOutput, 'utf-8'));
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('uses Postman Collection v2.1 schema', () => {
    expect(collection.info.schema).toBe(
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    );
  });

  it('has collection name and description', () => {
    expect(collection.info.name).toContain('Energy Monitor');
    expect(collection.info.description).toBeTruthy();
  });

  it('sets bearer auth at collection level', () => {
    expect(collection.auth.type).toBe('bearer');
    expect(collection.auth.bearer[0].key).toBe('token');
  });

  it('defines baseUrl and accessToken variables', () => {
    const keys = collection.variable.map((v: any) => v.key);
    expect(keys).toContain('baseUrl');
    expect(keys).toContain('accessToken');
  });

  it('discovers at least 30 module folders', () => {
    expect(collection.item.length).toBeGreaterThanOrEqual(30);
  });

  it('discovers at least 200 routes', () => {
    const total = collection.item.reduce(
      (acc: number, folder: any) => acc + folder.item.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(200);
  });

  it('includes core module folders', () => {
    const names = collection.item.map((f: any) => f.name);
    const expected = ['auth', 'buildings', 'meters', 'readings', 'alerts', 'users', 'roles'];
    for (const mod of expected) {
      expect(names).toContain(mod);
    }
  });

  it('requests have valid method and url', () => {
    for (const folder of collection.item) {
      for (const item of folder.item) {
        expect(['GET', 'POST', 'PATCH', 'DELETE', 'PUT']).toContain(item.request.method);
        expect(item.request.url.raw).toMatch(/^\{\{baseUrl\}\}\/api\//);
        expect(item.request.url.path.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('POST/PATCH requests include body', () => {
    for (const folder of collection.item) {
      for (const item of folder.item) {
        const method = item.request.method;
        if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
          expect(item.request.body).toBeTruthy();
          expect(item.request.body.mode).toBe('raw');
        }
      }
    }
  });

  it('includes external API (v1) routes', () => {
    const extFolder = collection.item.find((f: any) => f.name === 'external-api');
    expect(extFolder).toBeTruthy();
    expect(extFolder.item.length).toBeGreaterThanOrEqual(30);
    const paths = extFolder.item.map((i: any) => i.request.url.raw);
    expect(paths.some((p: string) => p.includes('/api/v1/'))).toBe(true);
  });

  it('public routes do not have auth override', () => {
    const authFolder = collection.item.find((f: any) => f.name === 'auth');
    const loginReq = authFolder.item.find((i: any) =>
      i.request.url.raw.includes('/auth/login'),
    );
    // Public routes: auth is not set at request level (inherits collection but @Public skips guard)
    expect(loginReq).toBeTruthy();
    expect(loginReq.request.auth).toBeUndefined();
  });
});
