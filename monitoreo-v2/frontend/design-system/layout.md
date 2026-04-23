# Layout

## Container

| Breakpoint | Max-width | Padding horizontal |
|---|---|---|
| Mobile | 100% | 16px (`px-4`) |
| sm (640px) | 100% | 24px (`px-6`) |
| lg (1024px) | 672px (`max-w-2xl`) | 32px (`px-8`) |

El contenido se centra con `mx-auto`. El max-width estrecho (672px) fuerza lectura lineal y foco.

## Secciones

| Token | Valor | Uso |
|---|---|---|
| `section-padding` | 48px (`py-12`) | Espaciado vertical entre secciones |
| `section-gap` | 32px (`mb-8`) | Separacion entre titulo y contenido |
| `element-gap` | 16px (`gap-4`) | Entre elementos hermanos |
| `tight-gap` | 8px (`gap-2`) | Entre elementos compactos |

## Grid

- **Flex-based**: no CSS Grid. Composicion con `flex`, `flex-col`, `flex-row`.
- **Responsive**: `flex-col` en mobile, `sm:flex-row` en desktop.
- **Full-width sections**: background ocupa 100vw, contenido centrado dentro.

## Hero

- Ocupa viewport completo: `min-h-dvh` (dynamic viewport height).
- Capas de profundidad apiladas con `absolute` para parallax.
- Contenido centrado vertical y horizontalmente.

## Patron de alternancia

Las secciones alternan background para crear ritmo visual:
```
Section 1: bg-black (#000)
Section 2: bg-gray-900 (#111827)
Section 3: bg-black (#000)
Section 4: bg-gray-900 (#111827)
```
Sin bordes entre secciones — la diferencia de tono es suficiente.
