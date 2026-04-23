# Contrast & Visual Hierarchy

## Modelo de contraste

Todo el sistema se basa en un unico eje: **opacidad de blanco sobre negro**.

No hay colores de acento. La jerarquia visual se construye con 3 niveles de opacidad:

| Nivel | Opacidad | Uso |
|---|---|---|
| Primario | 100% (`#FFFFFF`) | Titulos, CTAs, numeros de impacto |
| Secundario | 80% (`rgba(255,255,255,0.8)`) | Body text, descripciones |
| Terciario | 50% (`rgba(255,255,255,0.5)`) | Labels, metadata, placeholders |

## Backgrounds

3 niveles de superficie, todos oscuros:

| Nivel | Valor | Uso |
|---|---|---|
| Base | `#000000` | Fondo de pagina |
| Elevated | `rgba(255,255,255,0.05)` | Cards, surfaces |
| Raised | `rgba(255,255,255,0.08)` | Hover, elementos activos |

## Patron de secciones

Alternancia de tonos para crear ritmo sin color:

```
[#000000] Hero
[#111827] Metricas
[#000000] Features
[#111827] Testimonios
[#000000] CTA
[#111827] Footer
```

La diferencia de tono es sutil (~7% luminosidad) — suficiente para separar secciones sin crear contraste agresivo.

## Enfasis

Para destacar contenido especifico:
- **Numeros de impacto**: font-size display + semibold + opacidad 100%
- **CTAs**: border `white/20` — ligeramente mas visible que el entorno
- **Cards activas**: border pasa de `white/10` a `white/20` en hover

## Accesibilidad

- Contraste texto primario sobre negro: **21:1** (WCAG AAA)
- Contraste texto secundario (80%): **13.4:1** (WCAG AAA)
- Contraste texto terciario (50%): **7.4:1** (WCAG AA)
- Todos los niveles superan WCAG AA minimo (4.5:1)
