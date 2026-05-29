# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> /admin/companies loads without error
- Location: e2e/navigation.spec.ts:22:3

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /\/login/
Received string: "https://power-monitor.cloud/login"
Timeout: 5000ms

Call log:
  - Expect "not toHaveURL" with timeout 5000ms
    14 × unexpected value "https://power-monitor.cloud/login"

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
  4  | const pages = [
  5  |   '/',
  6  |   '/dashboard/executive',
  7  |   '/dashboard/compare',
  8  |   '/monitoring/realtime',
  9  |   '/monitoring/devices',
  10 |   '/buildings',
  11 |   '/meters',
  12 |   '/alerts',
  13 |   '/invoices',
  14 |   '/reports',
  15 |   '/admin/users',
  16 |   '/admin/companies',
  17 |   '/admin/audit',
  18 |   '/profile',
  19 | ];
  20 | 
  21 | for (const path of pages) {
  22 |   test(`${path} loads without error`, async ({ page }) => {
  23 |     await injectAuth(page);
  24 |     await page.goto(path);
> 25 |     await expect(page).not.toHaveURL(/\/login/);
     |                            ^ Error: expect(page).not.toHaveURL(expected) failed
  26 |     await expect(page.locator('#root')).not.toBeEmpty();
  27 |   });
  28 | }
  29 | 
```