# Buttons

## Variantes

### Primary (filled)
```
background: rgba(255,255,255,0.10)
color: #FFFFFF
border: 1px solid rgba(255,255,255,0.20)
border-radius: 8px
padding: 12px 24px
font-size: 14px
font-weight: 500
```
Hover: `background: rgba(255,255,255,0.15)`, `border-color: rgba(255,255,255,0.30)`

### Outline
```
background: transparent
color: #FFFFFF
border: 1px solid rgba(255,255,255,0.20)
border-radius: 8px
padding: 12px 24px
font-size: 14px
font-weight: 500
```
Hover: `background: rgba(255,255,255,0.05)`, `border-color: rgba(255,255,255,0.30)`

### Ghost (text-only)
```
background: transparent
color: rgba(255,255,255,0.80)
border: none
padding: 8px 16px
font-size: 14px
font-weight: 500
```
Hover: `color: #FFFFFF`

## Tamanos

| Size | Padding | Font-size |
|---|---|---|
| `sm` | 8px 16px | 13px |
| `md` | 12px 24px | 14px |
| `lg` | 16px 32px | 16px |

## Estados

| Estado | Efecto |
|---|---|
| Default | Valores base |
| Hover | Opacidad +5% bg, +10% border |
| Active | Scale 0.98 (press feedback) |
| Disabled | Opacity 0.4, cursor not-allowed |
| Loading | Spinner reemplaza texto, mismo tamano |

## Transiciones

```css
transition: all 150ms ease;
```
Corta y responsiva. Sin bounce ni spring.

## Notas

- No se usan botones pill (border-radius grande) para acciones principales.
- Los botones son sutiles — no gritan. La accion se comunica via texto, no via color.
