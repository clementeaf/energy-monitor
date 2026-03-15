# Parque Arauco — Design System (Memoria Integrada 2024)

> Extraído automáticamente del PDF `Memoria PA.pdf`.
> Solo patrones de diseño/UI — sin data corporativa.

## 1. Paleta de Colores

### 1.1 Colores Primarios (Brand)
| Token | Hex | Uso |
|-------|-----|-----|
| `navy` | `#1B1464` | Títulos principales, sidebar nav, texto heading, badges de sección activa |
| `blue` | `#3D3BF3` | Líneas decorativas curvas, acentos visuales, íconos sidebar, badges de capítulo |
| `blue_light` | `#5B59F5` | Hover states, badges activos sidebar |

### 1.2 Acentos por Sección
| Sección | Color | Hex |
|---------|-------|-----|
| 01 - Somos Parque Arauco | Azul/Indigo | `#3D3BF3` |
| 02 - Gobernanza y entorno | Azul/Indigo | `#3D3BF3` |
| 03 - Desempeño económico | Rosa/Coral | `#E84C6F` |
| 04 - Desempeño ambiental | Verde | `#2D9F5D` |
| 05 - Nuestro equipo | Naranja/Amber | `#F5A623` |
| 06 - Nuestro aporte a la comunidad | Rosa/Coral | `#E84C6F` |
| 07 - Nuestros proveedores | Púrpura | `#8B5CF6` |
| 08 - Información general | Gris | `#6B7280` |

### 1.3 Badges de País
| País | Border | Bg | Text |
|------|--------|-----|------|
| Chile | `#3D3BF3` | `white` | `#1B1464` |
| Peru | `#E84C6F` | `white` | `#E84C6F` |
| Colombia | `#2D9F5D` | `white` | `#2D9F5D` |

### 1.4 Colores de Gráficos
| Token | Hex | Uso |
|-------|-----|-----|
| `bar_primary` | `#3D3BF3` | Barras año anterior / serie principal |
| `bar_secondary` | `#E84C6F` | Barras año actual / serie secundaria destacada |
| `bar_accent` | `#F5A623` | Barras serie terciaria (ocasional) |
| `line_chile` | `#3D3BF3` | Línea Chile en gráficos multi-país |
| `line_peru` | `#E84C6F` | Línea Perú en gráficos multi-país |
| `line_colombia` | `#2D9F5D` | Línea Colombia en gráficos multi-país |
| `line_consolidated` | `#1B1464` | Línea Consolidado (más gruesa) |
| `line_target` | `#9CA3AF` | Línea punteada de meta/target |
| `stacked_bar_green` | `#2D9F5D` | Energía renovable / positivo |
| `stacked_bar_gray` | `#D1D5DB` | Energía no renovable / neutro |

#### Segmentos de Donut (orden)
  1. `#3D3BF3`
  2. `#E84C6F`
  3. `#2D9F5D`
  4. `#F5A623`
  5. `#9CA3AF`

### 1.5 Colores UI
| Token | Hex | Uso |
|-------|-----|-----|
| `background` | `#FFFFFF` | Fondo principal de página |
| `background_alt` | `#F3F4F6` | Fondo sidebar, cards sutiles, áreas destacadas |
| `text_primary` | `#1F2937` | Texto body principal |
| `text_secondary` | `#6B7280` | Labels, subtítulos, notas al pie |
| `text_heading` | `#1B1464` | Títulos de sección (navy) |
| `border` | `#E5E7EB` | Líneas de tabla, separadores |
| `border_light` | `#F3F4F6` | Bordes sutiles de cards |
| `success` | `#2D9F5D` | Check marks, metas cumplidas, verde ambiental |
| `warning` | `#F5A623` | En progreso, atención |
| `danger` | `#E84C6F` | Pendiente, vencido, destacado económico |

### 1.6 Curvas Decorativas
- Líneas curvas gruesas decorativas que fluyen entre secciones
- Estilo: Curvas orgánicas de trazo grueso (~20-40px), sin relleno, que cruzan entre contenido. Dan dinamismo y conexión visual entre bloques.
- Colores: `#3D3BF3`, `#E84C6F`, `#2D9F5D`, `#F5A623`

## 2. Tipografía

- **Headings:** Geomanist o similar geometric sans-serif (redondeada, moderna)
- **Body:** Sans-serif neutral (Inter, Helvetica Neue o similar)
- **Nota:** El heading principal usa peso bold con tracking tight

### Escala Tipográfica
| Nivel | Tamaño | Peso | Color | Case | Ejemplo |
|-------|--------|------|-------|------|---------|
| `h1_page_title` | ~40-48px | 800/Black | `#1B1464` | normal | Nuestra historia, Hitos que marcaron el 2024 |
| `h2_section` | ~28-32px | 700/Bold | `#E84C6F o color de sección` | normal | Indicadores financieros, Expansiones |
| `h3_subsection` | ~20-24px | 700/Bold | `#1F2937` | normal | Rendimiento financiero, Gestión comercial |
| `h4_label` | ~14-16px | 600/Semibold | `#1F2937` | UPPERCASE | INGRESOS, EBITDA, VENTAS LOCATARIOS |
| `body` | ~14-15px | 400/Regular | `#1F2937` | normal | 1.6 |
| `caption` | ~11-12px | 400/Regular | `#6B7280` | normal |  |
| `kpi_number` | ~36-56px | 700-800 | `#1B1464` | normal | 533.500, 97,3%, 30 |
| `kpi_unit` | ~14-16px | 400 | `#6B7280` | normal | Total activos inmobiliarios, Ocupación promedio |
| `chart_value_label` | ~12-14px | 500 | `#1F2937` | normal |  |
| `percentage_delta` | ~13-14px | 600 | `#1F2937` | normal |  |

## 3. Layout

### Página
- **orientation:** Landscape (16:9 aprox)
- **sidebar:** Izquierda, ~140px, fixed, fondo #F3F4F6 con nav vertical
- **content_area:** Derecha del sidebar, con padding generoso (~40-60px)
- **grid:** Flexible, 2-4 columnas según contenido. No es grid rígido — se adapta al contenido.

### Sidebar Nav
- Navegación vertical izquierda, siempre visible
- **Activo:** Fondo azul (#3D3BF3), texto blanco, rounded-md
- **Inactivo:** Fondo transparent, texto #1F2937, hover → bg-gray-100
- **Numeración:** Número en círculo outlined (azul) + label
- Items:
  - Logo PA (arriba)
  - Título 'Memoria integrada 2024'
  - Botón INICIO
  - 8 secciones numeradas (01-08) con labels cortos
  - Flecha 'Volver al índice' (abajo)
  - Paginación ← N → (muy abajo)

### Header de Sección
- **structure:** Badge numérico de sección (fondo color de sección, texto blanco, rounded) + Título grande
- **badge:** Cuadrado redondeado ~40x40px con número de sección en blanco, fondo = color de sección
- **ncg_ref:** Pequeño label gris arriba del título: 'NCG 2.2', 'NCG 6.4.i'

### Spacing
- **section_gap:** ~40-60px entre secciones principales
- **card_gap:** ~20-24px entre cards / columnas
- **inner_padding:** ~24-32px dentro de cards y contenedores

## 4. Componentes

### 4.x `kpi_card`
- **description:** Número grande + label descriptivo debajo
- **style:** Sin borde visible, fondo blanco o transparent. Alineado a la izquierda.
- **number:** 36-56px, bold, navy (#1B1464)
- **label:** 14-16px, regular, gris (#6B7280), debajo del número
- **example:** 30 / Total activos inmobiliarios
- **variant_with_badge:** Número grande + badge de porcentaje a la derecha: '19 [83%]'

### 4.x `country_badge`
- **description:** Pill/badge con nombre de país + bandera
- **style:** Border 2px color país, rounded-full, padding 8px 16px, bg white
- **examples:**
  - CHILE 🇨🇱 (border azul)
  - PERÚ 🇵🇪 (border rosa)
  - COLOMBIA 🇨🇴 (border verde)

### 4.x `data_table`
- **description:** Tabla limpia, sin bordes verticales
- **header:** Texto uppercase, semibold, fondo sutil gris o con badges de país
- **rows:** Separados por línea horizontal fina (#E5E7EB). Padding vertical ~12px
- **total_row:** Bold, a veces con fondo gris claro
- **alignment:** Labels izquierda, números derecha
- **alternating:** No usa zebra striping — separación por líneas

### 4.x `bar_chart`
- **description:** Gráfico de barras vertical, comparativo YoY
- **style:** Barras con rounded-top (~4px radius), sin bordes
- **colors:** Azul (#3D3BF3) para año anterior, Rosa (#E84C6F) para año actual
- **labels:** Valor sobre cada barra (rotado vertical), año en eje X
- **delta_badge:** Badge rounded entre barras con '19,8%' y flecha direccional
- **gridlines:** Muy sutiles o ausentes
- **background:** Blanco limpio

### 4.x `line_chart`
- **description:** Gráfico de líneas multi-serie (por país + consolidado)
- **style:** Líneas con markers circulares en cada punto de dato
- **line_width:** ~2-3px
- **markers:** Círculos ~6px, filled, color de serie
- **legend:** Arriba del gráfico, inline, con tabs/pills: '( Meta 2024 ) Chile / Perú / Colombia / Consolidado'
- **target_line:** Línea punteada horizontal gris para meta
- **value_labels:** Al final de cada línea, con el valor del último año
- **gridlines:** Horizontales sutiles

### 4.x `stacked_bar_horizontal`
- **description:** Barra horizontal 100% apilada para distribuciones
- **style:** Barra con rounded ends, full width
- **labels:** Categorías con porcentaje arriba de cada segmento
- **example:** Distribución por moneda: UF 73% | CLP 10% | PEN VAC 7% | ...

### 4.x `donut_chart`
- **description:** Gráfico de dona para distribución de categorías
- **style:** Centro vacío (~60% del radio), segmentos con gap mínimo
- **legend:** Al lado derecho, con porcentaje en bold + label
- **colors:** Paleta secuencial de la sección (azul→rosa→verde→naranja→gris)

### 4.x `timeline`
- **description:** Línea de tiempo horizontal para hitos históricos
- **style:** Línea horizontal con nodos circulares en cada período
- **period_badges:** Rounded pill con rango de años, colores alternados por período
- **content:** Cards debajo de cada período con foto + bullets

### 4.x `case_study_badge`
- **description:** Badge para casos de estudio / enlaces
- **style:** Rounded pill, borde color sección, fondo blanco, texto uppercase 'CASO DE ESTUDIO' + ícono ↗
- **icon:** Ícono de gráfico de líneas a la derecha

### 4.x `ver_mas_button`
- **description:** Botón de enlace externo
- **style:** Rounded pill, borde azul, texto 'VER MÁS' + ícono ⊕
- **color:** #3D3BF3

### 4.x `person_card`
- **description:** Card de persona (ejecutivos, gerentes)
- **photo:** Circular crop, ~120-150px diámetro, con sombra sutil
- **name:** Bold, ~16px, #1F2937
- **title:** Regular, ~14px, #6B7280
- **layout:** Foto circular + nombre + cargo debajo, a veces con ícono de enlace

### 4.x `numbered_list`
- **description:** Lista con números en círculos de color
- **style:** Número en círculo filled (color de sección), texto al lado
- **circle:** ~28px diámetro, fondo color, texto blanco, centered

### 4.x `progress_indicators`
- **check_green:** Círculo verde con check blanco — meta cumplida
- **gear_orange:** Círculo naranja con engranaje — en progreso
- **clock_gray:** Círculo gris con reloj — por hacer

### 4.x `image_card`
- **description:** Foto con label overlay
- **style:** Imagen con rounded corners (~12px), label flotante semi-transparente en esquina
- **label:** Fondo blanco/90%, texto pequeño, padding 4px 12px, border sutil

## 5. Patrones de Composición

### `comparison_yoy`
- **description:** Patrón para comparar 2 años (2023 vs 2024)
- **layout:** 4 columnas de KPIs, cada uno con 2 barras + delta badge
- **grid:** Grid de 4 columnas iguales, gap 24px

### `country_breakdown`
- **description:** Datos desglosados por país (Chile, Perú, Colombia)
- **layout:** Badge de país arriba, luego tabla o KPIs debajo
- **grouping:** Cards side by side, una por país

### `kpi_dashboard_row`
- **description:** Fila de KPIs grandes con labels
- **layout:** 3-6 KPIs alineados verticalmente en columna izquierda
- **style:** Números grandes apilados, cada uno con su label gris

### `table_with_chart`
- **description:** Tabla de datos + gráfico de líneas debajo
- **layout:** Tabla arriba (compacta, multi-año), gráfico debajo mostrando la tendencia
- **common_in:** Secciones ambiental y financiera

### `section_intro`
- **description:** Página de introducción de sección/capítulo
- **layout:** Ícono de sección + bloque de texto largo + foto grande a la derecha
- **style:** Cita destacada en bold/larger en bloque con fondo sutil

## 6. Iconografía

- **Estilo:** Outlined/line icons, trazo ~2px, color de sección
- **Forma:** Circular container (outlined) con ícono dentro
- **Tamaños:** ~40-48px container, ~24px ícono interno
- **Colores:** Mismo color de la sección correspondiente
- **Ejemplos:**
  - Persona con lupa (gobernanza)
  - Gráfico de barras (económico)
  - Hoja/planta (ambiental)
  - Grupo de personas (equipo)
  - Moneda/dólar (financiero)
  - Flechas circulares (reciclaje)

## 7. Efectos y Bordes

- **Sombras:** Mínimos — solo en cards flotantes y fotos circulares de personas
- **Rounded corners:**
  - `cards`: 12-16px
  - `badges`: full (pill)
  - `images`: 12px
  - `buttons`: full (pill)
  - `bars`: 4px top only
- **Decorativo:** Curvas orgánicas gruesas (blob-like) en colores de sección, cruzando entre contenido como elementos de fondo

## 8. Mapping a Tailwind CSS v4 (sugerido)

```css
/* pa-ui-references/PA_DESIGN_SYSTEM — Tailwind token mapping */
@theme {
  /* Brand */
  --color-pa-navy: #1B1464;
  --color-pa-blue: #3D3BF3;
  --color-pa-blue-light: #5B59F5;

  /* Section accents */
  --color-pa-coral: #E84C6F;
  --color-pa-green: #2D9F5D;
  --color-pa-amber: #F5A623;
  --color-pa-purple: #8B5CF6;

  /* UI */
  --color-pa-bg: #FFFFFF;
  --color-pa-bg-alt: #F3F4F6;
  --color-pa-text: #1F2937;
  --color-pa-text-muted: #6B7280;
  --color-pa-border: #E5E7EB;
  --color-pa-border-light: #F3F4F6;

  /* Charts */
  --color-chart-primary: #3D3BF3;
  --color-chart-secondary: #E84C6F;
  --color-chart-tertiary: #2D9F5D;
  --color-chart-accent: #F5A623;
  --color-chart-muted: #9CA3AF;
}
```
