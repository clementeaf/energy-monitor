# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buildings-meters.spec.ts >> Alerts >> lists alerts
- Location: e2e/buildings-meters.spec.ts:21:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table tbody tr').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('table tbody tr').first()

```

```yaml
- heading "Energy Monitor" [level=1]
- paragraph: Inicia sesión para continuar
- paragraph:
  - text: Al iniciar sesión, autorizas la recopilación de tu nombre y correo electrónico desde tu proveedor OAuth (Microsoft/Google). Tus datos se almacenan en AWS con cifrado AES-256-GCM, se registra tu dirección IP para auditoría de seguridad (retención 2 años) y puedes ejercer tus derechos ARCO+ en cualquier momento desde tu perfil.
  - link "Política de privacidad":
    - /url: /privacy-policy
- button "Continuar con Microsoft":
  - img
  - text: Continuar con Microsoft
- button "Continuar con Google":
  - img
  - text: Continuar con Google
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { injectAuth } from './helpers';
  3  | 
  4  | test.describe('Buildings', () => {
  5  |   test('lists buildings', async ({ page }) => {
  6  |     await injectAuth(page);
  7  |     await page.goto('/buildings');
  8  |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  9  |   });
  10 | });
  11 | 
  12 | test.describe('Meters', () => {
  13 |   test('lists meters', async ({ page }) => {
  14 |     await injectAuth(page);
  15 |     await page.goto('/meters');
  16 |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  17 |   });
  18 | });
  19 | 
  20 | test.describe('Alerts', () => {
  21 |   test('lists alerts', async ({ page }) => {
  22 |     await injectAuth(page);
  23 |     await page.goto('/alerts');
> 24 |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  25 |   });
  26 | });
  27 | 
```