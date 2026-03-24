# Sistema de Diseño — Siemens

Análisis del design system de siemens.com (marzo 2026).

---

## Colores

| Uso | Color | Hex |
|-----|-------|-----|
| Primario | Petrol/teal oscuro | `#009999` / `#00646E` |
| Secundario | Navy profundo | `#1B1534` |
| Fondo principal | Off-white cálido | `#F3F3F0` |
| Gris UI | Gris medio | `#C2C2C0` |
| Texto (claro) | Charcoal oscuro | `#2D2D2D` |
| Texto (oscuro) | Blanco | `#FFFFFF` |
| Acento / CTA | Naranja cálido | `#E6830F` |

---

## Tipografía

| Propiedad | Valor |
|-----------|-------|
| Font family | "Siemens Sans" (propietaria), fallback: sans-serif geométrico |
| Pesos | Regular (400), Bold (700) |
| Line-height | Generoso (~1.5 body, ~1.2 headings) |

### Jerarquía

| Nivel | Uso | Tamaño aprox. |
|-------|-----|---------------|
| Display | Heroes, banners | 48–56px |
| H1 | Títulos de sección | 36–40px |
| H2 | Subtítulos | 28–32px |
| H3 | Cards, bloques | 20–24px |
| Body | Texto general | 16px |
| Small | Captions, labels | 14px |

---

## Spacing

| Token | Valor |
|-------|-------|
| Base | 8px |
| xs | 8px |
| sm | 16px |
| md | 24px |
| lg | 32px |
| xl | 48px |
| 2xl | 64px |
| Secciones | 80–120px vertical |

Sistema basado en múltiplos de 8px.

---

## Layout

| Propiedad | Valor |
|-----------|-------|
| Grid | 12 columnas responsive |
| Max-width contenedor | ~1280px |
| Gutters | 16–24px |
| Breakpoints | Mobile (<768), Tablet (768–1024), Desktop (>1024) |

---

## Componentes

### Botones

| Variante | Estilo |
|----------|--------|
| Primary | Fondo teal, texto blanco, border-radius 8–12px |
| Secondary | Borde teal, fondo transparente, texto teal |
| Ghost | Sin borde, texto teal, hover con fondo sutil |
| CTA | Fondo naranja, texto blanco |

- Padding: 12px 24px
- Transición hover: opacity o color shift
- Iconos opcionales (flecha →)

### Cards

| Propiedad | Valor |
|-----------|-------|
| Border-radius | 8–12px |
| Sombra | Sutil (`0 2px 8px rgba(0,0,0,0.08)`) |
| Estructura | Imagen + título + descripción + CTA |
| CTA | Link con flecha → alineado abajo |

### Navegación

| Propiedad | Valor |
|-----------|-------|
| Tipo | Horizontal sticky header |
| Dropdowns | Mega-menu con categorías |
| Extras | Selector región/idioma, búsqueda |
| Breadcrumbs | Sí, para jerarquía de páginas |

### Heroes

| Propiedad | Valor |
|-----------|-------|
| Ancho | Full-width |
| Imagen | 2560x1440px |
| Overlay | Texto sobre imagen con gradiente oscuro |
| CTA | Botón primary o link con flecha |

### Iconos

| Propiedad | Valor |
|-----------|-------|
| Formato | SVG inline |
| Tamaño base | 20x20px |
| Color | Monocromático (hereda color de texto) |
| Uso | Siempre pareados con texto/label |

---

## Patrones Visuales

- **Alternancia**: secciones alternan texto-izquierda/imagen-derecha
- **Whitespace**: abundante espacio vertical entre secciones
- **Consistencia**: todos los componentes comparten los mismos radios, sombras y spacing
- **Accesibilidad**: contraste alto texto/fondo, labels en iconos
- **Tono**: corporativo, limpio, profesional, orientado a conversión
