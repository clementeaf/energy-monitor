# Cards

## Card Base

```
background: rgba(255,255,255,0.05)
border: 1px solid rgba(255,255,255,0.10)
border-radius: 8px
padding: 24px
```

## Variantes

### Card default
- Background `white/5`
- Border `white/10`
- Sin sombra

### Card elevated
- Background `white/8`
- Border `white/15`
- Usado para contenido destacado o interactivo

### Card metric
- Numero grande (display size, semibold)
- Label debajo en text-secondary
- Sin borde, solo background `white/5`

## Hover

```css
transition: all 200ms ease;
```
- Background: `white/5` → `white/8`
- Border: `white/10` → `white/20`
- Sin sombra, sin lift (translateY)

## Layout interno

- **Titulo**: `h3` o `h4`, text-primary, semibold
- **Descripcion**: body o body-sm, text-secondary
- **Gap interno**: 12-16px entre titulo y descripcion
- **Acciones**: al fondo, alineadas a la derecha

## Grid de cards

```
display: grid
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
gap: 16px
```
En mobile colapsan a 1 columna.
