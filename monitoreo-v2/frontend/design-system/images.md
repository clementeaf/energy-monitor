# Images & Media

## Tratamiento de imagenes

### Overlays
Las imagenes siempre llevan un overlay oscuro para mantener legibilidad:
```css
/* Gradient overlay */
background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7));
```

### Border radius
- Imagenes dentro de cards: heredan el radius del contenedor (`8px`)
- Imagenes hero: sin radius (full-bleed)
- Avatares / logos: `border-radius: 50%` (circulares)

### Filtros
- Logos de clientes: `filter: brightness(0) invert(1)` (forzar blanco sobre fondo oscuro)
- Hover en logos: transicion a opacidad completa

## Parallax layers (hero)

```
z-index  | Layer          | Velocidad scroll
---------|----------------|------------------
0        | Background     | 0.2x (mas lento)
1        | Galaxy/Overlay | 0.5x
2        | Mountains      | 0.7x
3        | Persona/CTA    | 1.0x (normal)
```

Cada capa es una imagen `position: absolute` con `transform: translateY()` controlado por scroll.

## Lazy loading

- Todas las imagenes usan `loading="lazy"`
- Placeholders con skeleton pulse hasta que cargan
- Imagenes hero: `loading="eager"` (above the fold)

## Formatos

- Preferir WebP con fallback PNG/JPG
- Logos: SVG cuando sea posible
- Hero: imagen de alta resolucion (1920px+), comprimida
