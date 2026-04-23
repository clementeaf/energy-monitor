# Borders & Radius

## Border Radius

| Token | Valor | Uso |
|---|---|---|
| `radius-none` | 0px | Secciones, contenedores full-width |
| `radius-sm` | 4px | Inputs, badges |
| `radius-md` | 8px | Cards, botones |
| `radius-lg` | 12px | Cards destacadas, modales |

Filosofia: **minimalista**. Las esquinas son apenas redondeadas. No se usan radius grandes (>16px) ni pills en componentes principales.

## Borders

| Token | Valor | Uso |
|---|---|---|
| `border-default` | 1px `rgba(255,255,255,0.10)` | Divisores, bordes de cards |
| `border-hover` | 1px `rgba(255,255,255,0.20)` | Hover state |
| `border-active` | 1px `rgba(255,255,255,0.30)` | Focus / active state |

## Sombras

**No se usan sombras**. La profundidad se comunica exclusivamente via:
- Diferencia de opacidad en backgrounds (`white/5` vs `white/8`)
- Borders sutiles (`white/10`)
- Cambio de opacidad en hover

## Dividers

- Lineas horizontales: `border-t border-white/10`
- Sin padding extra — el borde actua como separador minimal.
