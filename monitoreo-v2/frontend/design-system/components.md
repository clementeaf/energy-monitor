# Components

## Navigation (Header)

- **Position**: sticky top
- **Background**: `#000000` con backdrop-blur si hay scroll
- **Height**: ~56px
- **Logo**: izquierda
- **Links**: centro, text-secondary, hover → text-primary
- **CTA**: derecha, boton outline
- **Divider**: `border-b border-white/10`

## Footer

- **Background**: `#111827` (gray-900)
- **Layout**: multi-columna en desktop, stack en mobile
- **Links**: text-secondary, hover → text-primary
- **Copyright**: text-tertiary, al fondo
- **Divider top**: `border-t border-white/10`

## Inputs

```
background: rgba(255,255,255,0.05)
border: 1px solid rgba(255,255,255,0.10)
border-radius: 8px
padding: 12px 16px
color: #FFFFFF
font-size: 14px
```
- Focus: `border-color: rgba(255,255,255,0.30)`, `outline: none`
- Placeholder: `rgba(255,255,255,0.30)`

## Badges / Tags

```
background: rgba(255,255,255,0.10)
color: rgba(255,255,255,0.80)
border-radius: 4px
padding: 4px 8px
font-size: 12px
font-weight: 500
```

## Tooltips

```
background: #1a1a1a
border: 1px solid rgba(255,255,255,0.15)
border-radius: 6px
padding: 8px 12px
font-size: 13px
color: rgba(255,255,255,0.90)
```
- Aparece con fade-in 150ms
- Arrow (triangulo CSS) apuntando al trigger

## Modals / Drawers

- **Overlay**: `rgba(0,0,0,0.60)` con backdrop-blur (4px)
- **Panel**: `bg-gray-900`, `border border-white/10`, `rounded-lg`
- **Entrada**: slide-in desde derecha (drawer) o fade+scale (modal)
- **Duracion**: 200ms ease-out

## Carousel

- **Indicador**: `1/12` en texto, no dots
- **Flechas**: botones ghost con icono, `white/50` → `white/100` hover
- **Transicion**: slide horizontal 300ms ease
- **Auto-advance**: opcional, 5s intervalo
