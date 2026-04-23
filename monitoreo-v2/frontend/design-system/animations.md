# Animations & Transitions

## Principios

1. **Sutiles**: las animaciones no deben distraer — acompañan, no protagonizan.
2. **Rapidas**: duraciones cortas (150-300ms). Sin bounce ni spring.
3. **Respetuosas**: honrar `prefers-reduced-motion` desactivando animaciones.

## Transiciones base

| Elemento | Propiedad | Duracion | Easing |
|---|---|---|---|
| Botones | all | 150ms | ease |
| Cards | all | 200ms | ease |
| Links | color, opacity | 150ms | ease |
| Borders | border-color | 200ms | ease |
| Backgrounds | background-color | 200ms | ease |

## Animaciones de entrada

### Fade-in al scroll
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
- Duracion: 500ms
- Easing: `ease-out`
- Stagger: 100ms entre elementos hermanos
- Trigger: Intersection Observer al entrar en viewport

### Fade-in simple
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
- Duracion: 300ms
- Uso: modales, drawers, tooltips

## Marquee (carousel de logos)

```css
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```
- Duracion: 20-30s
- Loop: infinito
- Duplicar elementos para seamless loop

## Parallax (hero)

Multiples capas con `position: absolute` y velocidades distintas:
- Capa fondo: velocidad 0.2x (se mueve lento)
- Capa media: velocidad 0.5x
- Capa frente: velocidad 1x (normal)

Controlado por scroll position via JS (`requestAnimationFrame`).

## Loading states

### Skeleton pulse
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```
- Clase: `animate-pulse`
- Duracion: 2s, infinito
- Uso: placeholders mientras cargan datos

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Desactiva todas las animaciones para usuarios que lo prefieran.
