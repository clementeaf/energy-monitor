#!/usr/bin/env python3
"""
Extrae patrones de diseño/UI de la Memoria Integrada 2024 de Parque Arauco.
No extrae data — solo estilos, colores, tipografía, layout, componentes.

Output: pa-ui-references/PA_DESIGN_SYSTEM.md
"""

import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "pa-ui-references" / "PA_DESIGN_SYSTEM.md"

# ── Design tokens extraídos visualmente del PDF ──────────────────────────

design_system = {
    "brand": {
        "name": "Parque Arauco — Memoria Integrada 2024",
        "description": "Sistema de diseño corporativo para reportes y dashboards. Estilo limpio, profesional, con amplio uso de white space y acentos de color por sección.",
    },

    "colors": {
        "primary": {
            "navy": {"hex": "#1B1464", "usage": "Títulos principales, sidebar nav, texto heading, badges de sección activa"},
            "blue": {"hex": "#3D3BF3", "usage": "Líneas decorativas curvas, acentos visuales, íconos sidebar, badges de capítulo"},
            "blue_light": {"hex": "#5B59F5", "usage": "Hover states, badges activos sidebar"},
        },
        "section_accents": {
            "somos_pa": {"hex": "#3D3BF3", "color": "Azul/Indigo", "section": "01 - Somos Parque Arauco"},
            "gobernanza": {"hex": "#3D3BF3", "color": "Azul/Indigo", "section": "02 - Gobernanza y entorno"},
            "economico": {"hex": "#E84C6F", "color": "Rosa/Coral", "section": "03 - Desempeño económico"},
            "ambiental": {"hex": "#2D9F5D", "color": "Verde", "section": "04 - Desempeño ambiental"},
            "equipo": {"hex": "#F5A623", "color": "Naranja/Amber", "section": "05 - Nuestro equipo"},
            "comunidad": {"hex": "#E84C6F", "color": "Rosa/Coral", "section": "06 - Nuestro aporte a la comunidad"},
            "proveedores": {"hex": "#8B5CF6", "color": "Púrpura", "section": "07 - Nuestros proveedores"},
            "info_general": {"hex": "#6B7280", "color": "Gris", "section": "08 - Información general"},
        },
        "country_badges": {
            "chile": {"border": "#3D3BF3", "bg": "white", "text": "#1B1464", "flag": True},
            "peru": {"border": "#E84C6F", "bg": "white", "text": "#E84C6F", "flag": True},
            "colombia": {"border": "#2D9F5D", "bg": "white", "text": "#2D9F5D", "flag": True},
        },
        "charts": {
            "bar_primary": {"hex": "#3D3BF3", "usage": "Barras año anterior / serie principal"},
            "bar_secondary": {"hex": "#E84C6F", "usage": "Barras año actual / serie secundaria destacada"},
            "bar_accent": {"hex": "#F5A623", "usage": "Barras serie terciaria (ocasional)"},
            "line_chile": {"hex": "#3D3BF3", "usage": "Línea Chile en gráficos multi-país"},
            "line_peru": {"hex": "#E84C6F", "usage": "Línea Perú en gráficos multi-país"},
            "line_colombia": {"hex": "#2D9F5D", "usage": "Línea Colombia en gráficos multi-país"},
            "line_consolidated": {"hex": "#1B1464", "usage": "Línea Consolidado (más gruesa)"},
            "line_target": {"hex": "#9CA3AF", "usage": "Línea punteada de meta/target"},
            "donut_segments": [
                "#3D3BF3",  # Segmento mayor
                "#E84C6F",  # Segundo
                "#2D9F5D",  # Tercero
                "#F5A623",  # Cuarto
                "#9CA3AF",  # Quinto / Otros
            ],
            "stacked_bar_green": {"hex": "#2D9F5D", "usage": "Energía renovable / positivo"},
            "stacked_bar_gray": {"hex": "#D1D5DB", "usage": "Energía no renovable / neutro"},
        },
        "ui": {
            "background": {"hex": "#FFFFFF", "usage": "Fondo principal de página"},
            "background_alt": {"hex": "#F3F4F6", "usage": "Fondo sidebar, cards sutiles, áreas destacadas"},
            "text_primary": {"hex": "#1F2937", "usage": "Texto body principal"},
            "text_secondary": {"hex": "#6B7280", "usage": "Labels, subtítulos, notas al pie"},
            "text_heading": {"hex": "#1B1464", "usage": "Títulos de sección (navy)"},
            "border": {"hex": "#E5E7EB", "usage": "Líneas de tabla, separadores"},
            "border_light": {"hex": "#F3F4F6", "usage": "Bordes sutiles de cards"},
            "success": {"hex": "#2D9F5D", "usage": "Check marks, metas cumplidas, verde ambiental"},
            "warning": {"hex": "#F5A623", "usage": "En progreso, atención"},
            "danger": {"hex": "#E84C6F", "usage": "Pendiente, vencido, destacado económico"},
        },
        "decorative_curves": {
            "description": "Líneas curvas gruesas decorativas que fluyen entre secciones",
            "colors": ["#3D3BF3", "#E84C6F", "#2D9F5D", "#F5A623"],
            "style": "Curvas orgánicas de trazo grueso (~20-40px), sin relleno, que cruzan entre contenido. Dan dinamismo y conexión visual entre bloques.",
        },
    },

    "typography": {
        "font_family": {
            "headings": "Geomanist o similar geometric sans-serif (redondeada, moderna)",
            "body": "Sans-serif neutral (Inter, Helvetica Neue o similar)",
            "notes": "El heading principal usa peso bold con tracking tight",
        },
        "scale": {
            "h1_page_title": {"size": "~40-48px", "weight": "800/Black", "color": "#1B1464", "case": "normal", "example": "Nuestra historia, Hitos que marcaron el 2024"},
            "h2_section": {"size": "~28-32px", "weight": "700/Bold", "color": "#E84C6F o color de sección", "case": "normal", "example": "Indicadores financieros, Expansiones"},
            "h3_subsection": {"size": "~20-24px", "weight": "700/Bold", "color": "#1F2937", "case": "normal", "example": "Rendimiento financiero, Gestión comercial"},
            "h4_label": {"size": "~14-16px", "weight": "600/Semibold", "color": "#1F2937", "case": "UPPERCASE", "example": "INGRESOS, EBITDA, VENTAS LOCATARIOS"},
            "body": {"size": "~14-15px", "weight": "400/Regular", "color": "#1F2937", "line_height": "1.6"},
            "caption": {"size": "~11-12px", "weight": "400/Regular", "color": "#6B7280"},
            "kpi_number": {"size": "~36-56px", "weight": "700-800", "color": "#1B1464", "example": "533.500, 97,3%, 30"},
            "kpi_unit": {"size": "~14-16px", "weight": "400", "color": "#6B7280", "example": "Total activos inmobiliarios, Ocupación promedio"},
            "chart_value_label": {"size": "~12-14px", "weight": "500", "color": "#1F2937", "rotation": "vertical en barras"},
            "percentage_delta": {"size": "~13-14px", "weight": "600", "color": "#1F2937", "style": "Dentro de rounded badge, con flecha →"},
        },
    },

    "layout": {
        "page": {
            "orientation": "Landscape (16:9 aprox)",
            "sidebar": "Izquierda, ~140px, fixed, fondo #F3F4F6 con nav vertical",
            "content_area": "Derecha del sidebar, con padding generoso (~40-60px)",
            "grid": "Flexible, 2-4 columnas según contenido. No es grid rígido — se adapta al contenido.",
        },
        "sidebar_nav": {
            "description": "Navegación vertical izquierda, siempre visible",
            "items": [
                "Logo PA (arriba)",
                "Título 'Memoria integrada 2024'",
                "Botón INICIO",
                "8 secciones numeradas (01-08) con labels cortos",
                "Flecha 'Volver al índice' (abajo)",
                "Paginación ← N → (muy abajo)",
            ],
            "active_state": "Fondo azul (#3D3BF3), texto blanco, rounded-md",
            "inactive_state": "Fondo transparent, texto #1F2937, hover → bg-gray-100",
            "numbering": "Número en círculo outlined (azul) + label",
        },
        "section_header": {
            "structure": "Badge numérico de sección (fondo color de sección, texto blanco, rounded) + Título grande",
            "badge": "Cuadrado redondeado ~40x40px con número de sección en blanco, fondo = color de sección",
            "ncg_ref": "Pequeño label gris arriba del título: 'NCG 2.2', 'NCG 6.4.i'",
        },
        "spacing": {
            "section_gap": "~40-60px entre secciones principales",
            "card_gap": "~20-24px entre cards / columnas",
            "inner_padding": "~24-32px dentro de cards y contenedores",
        },
    },

    "components": {
        "kpi_card": {
            "description": "Número grande + label descriptivo debajo",
            "style": "Sin borde visible, fondo blanco o transparent. Alineado a la izquierda.",
            "number": "36-56px, bold, navy (#1B1464)",
            "label": "14-16px, regular, gris (#6B7280), debajo del número",
            "example": "30 / Total activos inmobiliarios",
            "variant_with_badge": "Número grande + badge de porcentaje a la derecha: '19 [83%]'",
        },
        "country_badge": {
            "description": "Pill/badge con nombre de país + bandera",
            "style": "Border 2px color país, rounded-full, padding 8px 16px, bg white",
            "examples": ["CHILE 🇨🇱 (border azul)", "PERÚ 🇵🇪 (border rosa)", "COLOMBIA 🇨🇴 (border verde)"],
        },
        "data_table": {
            "description": "Tabla limpia, sin bordes verticales",
            "header": "Texto uppercase, semibold, fondo sutil gris o con badges de país",
            "rows": "Separados por línea horizontal fina (#E5E7EB). Padding vertical ~12px",
            "total_row": "Bold, a veces con fondo gris claro",
            "alignment": "Labels izquierda, números derecha",
            "alternating": "No usa zebra striping — separación por líneas",
        },
        "bar_chart": {
            "description": "Gráfico de barras vertical, comparativo YoY",
            "style": "Barras con rounded-top (~4px radius), sin bordes",
            "colors": "Azul (#3D3BF3) para año anterior, Rosa (#E84C6F) para año actual",
            "labels": "Valor sobre cada barra (rotado vertical), año en eje X",
            "delta_badge": "Badge rounded entre barras con '19,8%' y flecha direccional",
            "gridlines": "Muy sutiles o ausentes",
            "background": "Blanco limpio",
        },
        "line_chart": {
            "description": "Gráfico de líneas multi-serie (por país + consolidado)",
            "style": "Líneas con markers circulares en cada punto de dato",
            "line_width": "~2-3px",
            "markers": "Círculos ~6px, filled, color de serie",
            "legend": "Arriba del gráfico, inline, con tabs/pills: '( Meta 2024 ) Chile / Perú / Colombia / Consolidado'",
            "target_line": "Línea punteada horizontal gris para meta",
            "value_labels": "Al final de cada línea, con el valor del último año",
            "gridlines": "Horizontales sutiles",
        },
        "stacked_bar_horizontal": {
            "description": "Barra horizontal 100% apilada para distribuciones",
            "style": "Barra con rounded ends, full width",
            "labels": "Categorías con porcentaje arriba de cada segmento",
            "example": "Distribución por moneda: UF 73% | CLP 10% | PEN VAC 7% | ...",
        },
        "donut_chart": {
            "description": "Gráfico de dona para distribución de categorías",
            "style": "Centro vacío (~60% del radio), segmentos con gap mínimo",
            "legend": "Al lado derecho, con porcentaje en bold + label",
            "colors": "Paleta secuencial de la sección (azul→rosa→verde→naranja→gris)",
        },
        "timeline": {
            "description": "Línea de tiempo horizontal para hitos históricos",
            "style": "Línea horizontal con nodos circulares en cada período",
            "period_badges": "Rounded pill con rango de años, colores alternados por período",
            "content": "Cards debajo de cada período con foto + bullets",
        },
        "case_study_badge": {
            "description": "Badge para casos de estudio / enlaces",
            "style": "Rounded pill, borde color sección, fondo blanco, texto uppercase 'CASO DE ESTUDIO' + ícono ↗",
            "icon": "Ícono de gráfico de líneas a la derecha",
        },
        "ver_mas_button": {
            "description": "Botón de enlace externo",
            "style": "Rounded pill, borde azul, texto 'VER MÁS' + ícono ⊕",
            "color": "#3D3BF3",
        },
        "person_card": {
            "description": "Card de persona (ejecutivos, gerentes)",
            "photo": "Circular crop, ~120-150px diámetro, con sombra sutil",
            "name": "Bold, ~16px, #1F2937",
            "title": "Regular, ~14px, #6B7280",
            "layout": "Foto circular + nombre + cargo debajo, a veces con ícono de enlace",
        },
        "numbered_list": {
            "description": "Lista con números en círculos de color",
            "style": "Número en círculo filled (color de sección), texto al lado",
            "circle": "~28px diámetro, fondo color, texto blanco, centered",
        },
        "progress_indicators": {
            "check_green": "Círculo verde con check blanco — meta cumplida",
            "gear_orange": "Círculo naranja con engranaje — en progreso",
            "clock_gray": "Círculo gris con reloj — por hacer",
        },
        "image_card": {
            "description": "Foto con label overlay",
            "style": "Imagen con rounded corners (~12px), label flotante semi-transparente en esquina",
            "label": "Fondo blanco/90%, texto pequeño, padding 4px 12px, border sutil",
        },
    },

    "patterns": {
        "comparison_yoy": {
            "description": "Patrón para comparar 2 años (2023 vs 2024)",
            "layout": "4 columnas de KPIs, cada uno con 2 barras + delta badge",
            "grid": "Grid de 4 columnas iguales, gap 24px",
        },
        "country_breakdown": {
            "description": "Datos desglosados por país (Chile, Perú, Colombia)",
            "layout": "Badge de país arriba, luego tabla o KPIs debajo",
            "grouping": "Cards side by side, una por país",
        },
        "kpi_dashboard_row": {
            "description": "Fila de KPIs grandes con labels",
            "layout": "3-6 KPIs alineados verticalmente en columna izquierda",
            "style": "Números grandes apilados, cada uno con su label gris",
        },
        "table_with_chart": {
            "description": "Tabla de datos + gráfico de líneas debajo",
            "layout": "Tabla arriba (compacta, multi-año), gráfico debajo mostrando la tendencia",
            "common_in": "Secciones ambiental y financiera",
        },
        "section_intro": {
            "description": "Página de introducción de sección/capítulo",
            "layout": "Ícono de sección + bloque de texto largo + foto grande a la derecha",
            "style": "Cita destacada en bold/larger en bloque con fondo sutil",
        },
    },

    "iconography": {
        "style": "Outlined/line icons, trazo ~2px, color de sección",
        "shape": "Circular container (outlined) con ícono dentro",
        "sizes": "~40-48px container, ~24px ícono interno",
        "colors": "Mismo color de la sección correspondiente",
        "examples": [
            "Persona con lupa (gobernanza)",
            "Gráfico de barras (económico)",
            "Hoja/planta (ambiental)",
            "Grupo de personas (equipo)",
            "Moneda/dólar (financiero)",
            "Flechas circulares (reciclaje)",
        ],
    },

    "effects": {
        "shadows": "Mínimos — solo en cards flotantes y fotos circulares de personas",
        "rounded_corners": {
            "cards": "12-16px",
            "badges": "full (pill)",
            "images": "12px",
            "buttons": "full (pill)",
            "bars": "4px top only",
        },
        "decorative": "Curvas orgánicas gruesas (blob-like) en colores de sección, cruzando entre contenido como elementos de fondo",
    },
}


def generate_markdown(ds: dict) -> str:
    lines = []
    a = lines.append

    a("# Parque Arauco — Design System (Memoria Integrada 2024)")
    a("")
    a("> Extraído automáticamente del PDF `Memoria PA.pdf`.")
    a("> Solo patrones de diseño/UI — sin data corporativa.")
    a("")

    # ── Colors ──
    a("## 1. Paleta de Colores")
    a("")

    a("### 1.1 Colores Primarios (Brand)")
    a("| Token | Hex | Uso |")
    a("|-------|-----|-----|")
    for name, c in ds["colors"]["primary"].items():
        a(f"| `{name}` | `{c['hex']}` | {c['usage']} |")
    a("")

    a("### 1.2 Acentos por Sección")
    a("| Sección | Color | Hex |")
    a("|---------|-------|-----|")
    for name, c in ds["colors"]["section_accents"].items():
        a(f"| {c['section']} | {c['color']} | `{c['hex']}` |")
    a("")

    a("### 1.3 Badges de País")
    a("| País | Border | Bg | Text |")
    a("|------|--------|-----|------|")
    for name, c in ds["colors"]["country_badges"].items():
        a(f"| {name.capitalize()} | `{c['border']}` | `{c['bg']}` | `{c['text']}` |")
    a("")

    a("### 1.4 Colores de Gráficos")
    a("| Token | Hex | Uso |")
    a("|-------|-----|-----|")
    for name, c in ds["colors"]["charts"].items():
        if isinstance(c, dict):
            a(f"| `{name}` | `{c['hex']}` | {c['usage']} |")
    a("")

    a("#### Segmentos de Donut (orden)")
    for i, hex_val in enumerate(ds["colors"]["charts"]["donut_segments"]):
        a(f"  {i+1}. `{hex_val}`")
    a("")

    a("### 1.5 Colores UI")
    a("| Token | Hex | Uso |")
    a("|-------|-----|-----|")
    for name, c in ds["colors"]["ui"].items():
        a(f"| `{name}` | `{c['hex']}` | {c['usage']} |")
    a("")

    a("### 1.6 Curvas Decorativas")
    a(f"- {ds['colors']['decorative_curves']['description']}")
    a(f"- Estilo: {ds['colors']['decorative_curves']['style']}")
    a(f"- Colores: {', '.join(f'`{c}`' for c in ds['colors']['decorative_curves']['colors'])}")
    a("")

    # ── Typography ──
    a("## 2. Tipografía")
    a("")
    a(f"- **Headings:** {ds['typography']['font_family']['headings']}")
    a(f"- **Body:** {ds['typography']['font_family']['body']}")
    a(f"- **Nota:** {ds['typography']['font_family']['notes']}")
    a("")

    a("### Escala Tipográfica")
    a("| Nivel | Tamaño | Peso | Color | Case | Ejemplo |")
    a("|-------|--------|------|-------|------|---------|")
    for name, t in ds["typography"]["scale"].items():
        example = t.get("example", t.get("line_height", ""))
        case = t.get("case", "normal")
        color = t.get("color", "")
        a(f"| `{name}` | {t['size']} | {t['weight']} | `{color}` | {case} | {example} |")
    a("")

    # ── Layout ──
    a("## 3. Layout")
    a("")
    a("### Página")
    for k, v in ds["layout"]["page"].items():
        a(f"- **{k}:** {v}")
    a("")

    a("### Sidebar Nav")
    a(f"- {ds['layout']['sidebar_nav']['description']}")
    a(f"- **Activo:** {ds['layout']['sidebar_nav']['active_state']}")
    a(f"- **Inactivo:** {ds['layout']['sidebar_nav']['inactive_state']}")
    a(f"- **Numeración:** {ds['layout']['sidebar_nav']['numbering']}")
    a("- Items:")
    for item in ds["layout"]["sidebar_nav"]["items"]:
        a(f"  - {item}")
    a("")

    a("### Header de Sección")
    for k, v in ds["layout"]["section_header"].items():
        a(f"- **{k}:** {v}")
    a("")

    a("### Spacing")
    for k, v in ds["layout"]["spacing"].items():
        a(f"- **{k}:** {v}")
    a("")

    # ── Components ──
    a("## 4. Componentes")
    a("")
    for name, comp in ds["components"].items():
        a(f"### 4.x `{name}`")
        if isinstance(comp, dict):
            for k, v in comp.items():
                if isinstance(v, list):
                    a(f"- **{k}:**")
                    for item in v:
                        a(f"  - {item}")
                else:
                    a(f"- **{k}:** {v}")
        a("")

    # ── Patterns ──
    a("## 5. Patrones de Composición")
    a("")
    for name, pat in ds["patterns"].items():
        a(f"### `{name}`")
        for k, v in pat.items():
            a(f"- **{k}:** {v}")
        a("")

    # ── Iconography ──
    a("## 6. Iconografía")
    a("")
    a(f"- **Estilo:** {ds['iconography']['style']}")
    a(f"- **Forma:** {ds['iconography']['shape']}")
    a(f"- **Tamaños:** {ds['iconography']['sizes']}")
    a(f"- **Colores:** {ds['iconography']['colors']}")
    a("- **Ejemplos:**")
    for ex in ds["iconography"]["examples"]:
        a(f"  - {ex}")
    a("")

    # ── Effects ──
    a("## 7. Efectos y Bordes")
    a("")
    a(f"- **Sombras:** {ds['effects']['shadows']}")
    a("- **Rounded corners:**")
    for k, v in ds["effects"]["rounded_corners"].items():
        a(f"  - `{k}`: {v}")
    a(f"- **Decorativo:** {ds['effects']['decorative']}")
    a("")

    # ── Tailwind mapping ──
    a("## 8. Mapping a Tailwind CSS v4 (sugerido)")
    a("")
    a("```css")
    a("/* pa-ui-references/PA_DESIGN_SYSTEM — Tailwind token mapping */")
    a("@theme {")
    a("  /* Brand */")
    a("  --color-pa-navy: #1B1464;")
    a("  --color-pa-blue: #3D3BF3;")
    a("  --color-pa-blue-light: #5B59F5;")
    a("")
    a("  /* Section accents */")
    a("  --color-pa-coral: #E84C6F;")
    a("  --color-pa-green: #2D9F5D;")
    a("  --color-pa-amber: #F5A623;")
    a("  --color-pa-purple: #8B5CF6;")
    a("")
    a("  /* UI */")
    a("  --color-pa-bg: #FFFFFF;")
    a("  --color-pa-bg-alt: #F3F4F6;")
    a("  --color-pa-text: #1F2937;")
    a("  --color-pa-text-muted: #6B7280;")
    a("  --color-pa-border: #E5E7EB;")
    a("  --color-pa-border-light: #F3F4F6;")
    a("")
    a("  /* Charts */")
    a("  --color-chart-primary: #3D3BF3;")
    a("  --color-chart-secondary: #E84C6F;")
    a("  --color-chart-tertiary: #2D9F5D;")
    a("  --color-chart-accent: #F5A623;")
    a("  --color-chart-muted: #9CA3AF;")
    a("}")
    a("```")
    a("")

    return "\n".join(lines)


def main():
    md = generate_markdown(design_system)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(md, encoding="utf-8")
    print(f"✓ Design system exportado a: {OUTPUT}")
    print(f"  {len(md)} chars, {md.count(chr(10))} líneas")


if __name__ == "__main__":
    main()
