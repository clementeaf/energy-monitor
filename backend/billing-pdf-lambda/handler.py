"""
AWS Lambda handler for billing PDF generation (Globe Power format).
Receives { storeName, buildingName, month } and returns { pdf: base64, filename }.
"""
import base64
import io
import json
import os
from datetime import date, timedelta

import psycopg2
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# --- Config ---
DB = dict(
    host=os.environ.get('DB_HOST', 'localhost'),
    port=int(os.environ.get('DB_PORT', '5432')),
    dbname=os.environ.get('DB_NAME', 'energy_monitor'),
    user=os.environ.get('DB_USERNAME', 'postgres'),
    password=os.environ.get('DB_PASSWORD', ''),
)

# Colors
ORANGE = colors.Color(0.96, 0.65, 0.0)
GRAY_BG = colors.Color(0.95, 0.95, 0.95)
ORANGE_BAR = colors.Color(0.95, 0.70, 0.15)
WHITE = colors.white
BLACK = colors.black

# Page setup
PAGE_W, PAGE_H = letter
MARGIN_L = 40
MARGIN_R = 40
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

LOCATION_MAP = {
    'Parque Arauco Kennedy': 'Las Condes',
    'Arauco Estacion': 'Santiago',
    'Arauco Premium Outlet Buenaventura': 'Quilicura',
    'Arauco Express Ciudad Empresarial': 'Huechuraba',
    'Arauco Express El Carmen de Huechuraba': 'Huechuraba',
}

BUILDING_CENTRO = {
    'Parque Arauco Kennedy': 'PARQUE ARAUCO KENNEDY',
    'Arauco Estacion': 'ARAUCO ESTACION',
    'Arauco Premium Outlet Buenaventura': 'ARAUCO PREMIUM OUTLET BUENAVENTURA',
    'Arauco Express Ciudad Empresarial': 'ARAUCO EXPRESS CIUDAD EMPRESARIAL',
    'Arauco Express El Carmen de Huechuraba': 'ARAUCO EXPRESS EL CARMEN DE HUECHURABA',
}


# --- Formatters ---

def fmt_clp(val):
    if val is None:
        return '$0'
    v = int(round(float(val)))
    formatted = f'{abs(v):,}'.replace(',', '.')
    return f'-${formatted}' if v < 0 else f'${formatted}'


def fmt_num(val, decimals=1):
    if val is None:
        return '0'
    v = float(val)
    s = f'{v:,.{decimals}f}'
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')


def fmt_unit(val, decimals=2):
    if val is None:
        return '$0'
    v = float(val)
    s = f'{abs(v):,.{decimals}f}'
    s = s.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'-${s}' if v < 0 else f'${s}'


def fmt_month_label(d):
    MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
             'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']
    return f"{MESES[d.month - 1]}-{str(d.year)[2:]}"


def fmt_period(d):
    MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
             'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    return f"{MESES[d.month - 1]}_{d.year}"


def fmt_date_cl(d):
    return d.strftime('%d-%m-%Y')


# --- DB queries ---

def fetch_billing_data(cur, meter_id, month):
    cur.execute("""
        SELECT meter_id, building_name, month,
               total_kwh, energia_clp, dda_max_kw, dda_max_punta_kw,
               kwh_troncal, kwh_serv_publico, cargo_fijo_clp,
               total_neto_clp, iva_clp, monto_exento_clp, total_con_iva_clp
        FROM meter_monthly_billing
        WHERE meter_id = %s AND month = %s
    """, (meter_id, month))
    row = cur.fetchone()
    if not row:
        return None
    cols = ['meter_id', 'building_name', 'month',
            'total_kwh', 'energia_clp', 'dda_max_kw', 'dda_max_punta_kw',
            'kwh_troncal', 'kwh_serv_publico', 'cargo_fijo_clp',
            'total_neto_clp', 'iva_clp', 'monto_exento_clp', 'total_con_iva_clp']
    return dict(zip(cols, row))


def fetch_store_info(cur, meter_id):
    cur.execute("""
        SELECT s.store_name, st.name AS store_type
        FROM store s
        JOIN store_type st ON st.id = s.store_type_id
        WHERE s.meter_id = %s
    """, (meter_id,))
    row = cur.fetchone()
    return {'store_name': row[0], 'store_type': row[1]} if row else {'store_name': meter_id, 'store_type': ''}


def fetch_tariff_info(cur, building_name, month):
    location = LOCATION_MAP.get(building_name, 'Las Condes')
    cur.execute("""
        SELECT consumo_energia_kwh, dda_max_suministrada_kw, dda_max_hora_punta_kw,
               kwh_sistema_troncal, cargo_fijo_clp
        FROM tariff
        WHERE location = %s AND month = %s
        LIMIT 1
    """, (location, month))
    row = cur.fetchone()
    if row:
        return {
            'energia_unit': float(row[0] or 0),
            'dda_max_unit': float(row[1] or 0),
            'dda_punta_unit': float(row[2] or 0),
            'troncal_unit': float(row[3] or 0),
            'cargo_fijo': float(row[4] or 0),
        }
    return None


def fetch_readings_range(cur, meter_id, month):
    month_date = month if isinstance(month, date) else date.fromisoformat(str(month))
    start = month_date.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    # +1 year offset for meter_readings (2026 synthetic data)
    start_r = start.replace(year=start.year + 1)
    end_r = end.replace(year=end.year + 1)

    cur.execute("""
        SELECT energy_kwh_total FROM meter_readings
        WHERE meter_id = %s AND timestamp >= %s AND timestamp < %s
        ORDER BY timestamp DESC LIMIT 1
    """, (meter_id, start_r, end_r))
    row = cur.fetchone()
    lect_final = float(row[0]) if row and row[0] is not None else None

    cur.execute("""
        SELECT energy_kwh_total FROM meter_readings
        WHERE meter_id = %s AND timestamp < %s
        ORDER BY timestamp DESC LIMIT 1
    """, (meter_id, start_r))
    row = cur.fetchone()
    lect_inicial = float(row[0]) if row and row[0] is not None else None

    return lect_inicial, lect_final


def fetch_kwh_history(cur, meter_id, ref_month, months=13):
    ref = ref_month if isinstance(ref_month, date) else date.fromisoformat(str(ref_month))
    start = date(ref.year, ref.month, 1)
    for _ in range(months - 1):
        start = (start - timedelta(days=1)).replace(day=1)

    cur.execute("""
        SELECT month, total_kwh
        FROM meter_monthly_billing
        WHERE meter_id = %s AND month >= %s AND month <= %s
        ORDER BY month
    """, (meter_id, start, ref))
    return [(row[0], float(row[1]) if row[1] else 0) for row in cur.fetchall()]


def fetch_meters_for_store(cur, store_name, building_name, month):
    cur.execute("""
        SELECT DISTINCT mmb.meter_id
        FROM meter_monthly_billing mmb
        JOIN store s ON s.meter_id = mmb.meter_id
        WHERE s.store_name = %s AND mmb.building_name = %s AND mmb.month = %s
        ORDER BY mmb.meter_id
    """, (store_name, building_name, month))
    return [row[0] for row in cur.fetchall()]


def compute_line_items(billing, tariff):
    kwh = float(billing['total_kwh'] or 0)
    energia_clp = float(billing['energia_clp'] or 0)
    dda_max_clp = float(billing['dda_max_kw'] or 0)
    dda_punta_clp = float(billing['dda_max_punta_kw'] or 0)
    troncal_clp = float(billing['kwh_troncal'] or 0)
    serv_pub_clp = float(billing['kwh_serv_publico'] or 0)
    cargo_fijo_clp = float(billing['cargo_fijo_clp'] or 0)

    if tariff:
        e_unit = tariff['energia_unit']
        dda_unit = tariff['dda_max_unit']
        dda_p_unit = tariff['dda_punta_unit']
        troncal_unit = tariff['troncal_unit']
        cargo_fijo_unit = tariff['cargo_fijo']
        dda_cons = dda_max_clp / dda_unit if dda_unit else 0
        dda_p_cons = dda_punta_clp / dda_p_unit if dda_p_unit else 0
        serv_pub_unit = serv_pub_clp / kwh if kwh else 0
    else:
        e_unit = energia_clp / kwh if kwh else 0
        dda_cons = kwh / 360
        dda_p_cons = dda_cons * 0.85
        dda_unit = dda_max_clp / dda_cons if dda_cons else 0
        dda_p_unit = dda_punta_clp / dda_p_cons if dda_p_cons else 0
        troncal_unit = troncal_clp / kwh if kwh else 0
        serv_pub_unit = serv_pub_clp / kwh if kwh else 0
        cargo_fijo_unit = cargo_fijo_clp

    return [
        ('Consumo Energia (KWH)', kwh, e_unit, energia_clp),
        ('Dda.Max.Suministrada(KW)', dda_cons, dda_unit, dda_max_clp),
        ('Dda.Max.Hora.Punta(KW)', dda_p_cons, dda_p_unit, dda_punta_clp),
        ('Transporte de Energia', kwh, troncal_unit, troncal_clp),
        ('Servicio Publico', kwh, serv_pub_unit, serv_pub_clp),
        ('Cargo Fijo', 1, cargo_fijo_unit, cargo_fijo_clp),
    ]


# --- PDF Generation ---

class BillingPDF:
    def __init__(self, buf, data, store, tariff_label, readings, history, line_items):
        self.c = canvas.Canvas(buf, pagesize=letter)
        self.d = data
        self.store = store
        self.tariff = tariff_label
        self.readings = readings
        self.history = history
        self.line_items = line_items
        self.y = PAGE_H - 30

    def draw(self):
        self._header()
        self._info_section()
        self._detail_header()
        self._readings_section()
        self._items_table()
        self._totals()
        self._chart()
        self._bank_footer()
        self.c.save()

    def _rect(self, x, y, w, h, fill=None, stroke=None):
        if fill:
            self.c.setFillColor(fill)
        if stroke:
            self.c.setStrokeColor(stroke)
        else:
            self.c.setStrokeColor(BLACK)
        self.c.rect(x, y, w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)

    def _text(self, x, y, text, size=10, bold=False, color=BLACK, align='left'):
        font = 'Helvetica-Bold' if bold else 'Helvetica'
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        if align == 'center':
            self.c.drawCentredString(x, y, str(text))
        elif align == 'right':
            self.c.drawRightString(x, y, str(text))
        else:
            self.c.drawString(x, y, str(text))

    def _header(self):
        h = 55
        self._rect(MARGIN_L, self.y - h, CONTENT_W, h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, self.y - h, CONTENT_W, h, fill=0, stroke=1)
        self._text(PAGE_W / 2, self.y - 22, 'GLOBE POWER', size=16, bold=True, color=WHITE, align='center')
        self._text(PAGE_W / 2, self.y - 42, 'DETALLE DE COBRO DE ENERGIA ELECTRICA',
                   size=12, bold=True, color=WHITE, align='center')
        self.y -= h + 8

    def _info_section(self):
        y = self.y
        row_h = 22
        label_w = 90
        val_w = 220
        mid_label_w = 60
        mid_val_w = 100

        building = self.d['building_name']
        centro = BUILDING_CENTRO.get(building, building.upper())
        month_date = self.d['month'] if isinstance(self.d['month'], date) else date.fromisoformat(str(self.d['month']))
        periodo = fmt_period(month_date)
        local = self.d['meter_id']
        razon = self.store['store_name']

        self._text(MARGIN_L + 5, y - 15, 'Centro Com.', size=9)
        self._rect(MARGIN_L + label_w, y - row_h, val_w, row_h)
        self._text(MARGIN_L + label_w + 5, y - 15, centro, size=9)

        px = MARGIN_L + label_w + val_w + 10
        self._text(px + 5, y - 15, 'Periodo', size=9)
        self._rect(px + mid_label_w, y - row_h, mid_val_w, row_h)
        self._text(px + mid_label_w + 5, y - 15, periodo, size=9)

        y -= row_h + 4

        self._text(MARGIN_L + 5, y - 15, 'Razon Social', size=9)
        self._rect(MARGIN_L + label_w, y - row_h, val_w, row_h)
        self._text(MARGIN_L + label_w + 5, y - 15, razon, size=8)

        self._text(px + 5, y - 15, 'Local', size=9)
        self._rect(px + mid_label_w, y - row_h, mid_val_w, row_h)
        self._text(px + mid_label_w + 5, y - 15, local, size=9)

        self.y = y - row_h - 8

    def _detail_header(self):
        h = 20
        self._rect(MARGIN_L, self.y - h, CONTENT_W, h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, self.y - h, CONTENT_W, h, fill=0, stroke=1)
        self._text(PAGE_W / 2, self.y - 14, 'DETALLE DEL CONSUMO', size=10, bold=True, color=WHITE, align='center')
        self.y -= h + 6

    def _readings_section(self):
        y = self.y
        row_h = 20
        col1_l = 140
        col1_v = 80
        col2_l = 130
        col2_v = 80

        month_date = self.d['month'] if isinstance(self.d['month'], date) else date.fromisoformat(str(self.d['month']))
        fecha_ant = month_date.replace(day=1)
        if fecha_ant.month == 1:
            fecha_ant = date(fecha_ant.year - 1, 12, 1)
        else:
            fecha_ant = fecha_ant.replace(month=fecha_ant.month - 1)
        fecha_act = month_date.replace(day=1)

        lect_ini, lect_fin = self.readings
        if lect_ini is None:
            lect_ini = 0
        if lect_fin is None:
            lect_fin = float(self.d['total_kwh'] or 0)

        kwh = float(self.d['total_kwh'] or 0)
        x_start = MARGIN_L + 5

        self._text(x_start, y - 14, 'Fecha Lectura Anterior', size=9)
        self._rect(x_start + col1_l, y - row_h, col1_v, row_h)
        self._text(x_start + col1_l + col1_v - 5, y - 14, fmt_date_cl(fecha_ant), size=9, align='right')

        x2 = x_start + col1_l + col1_v + 10
        self._text(x2, y - 14, 'Fecha Lectura Actual', size=9)
        self._rect(x2 + col2_l, y - row_h, col2_v, row_h)
        self._text(x2 + col2_l + col2_v - 5, y - 14, fmt_date_cl(fecha_act), size=9, align='right')

        y -= row_h + 4

        self._text(x_start, y - 14, 'Lectura Inicial', size=9)
        self._rect(x_start + col1_l, y - row_h, col1_v, row_h)
        self._text(x_start + col1_l + col1_v - 5, y - 14, fmt_num(lect_ini, 1), size=9, align='right')

        self._text(x2, y - 14, 'Lectura Final', size=9)
        self._rect(x2 + col2_l, y - row_h, col2_v, row_h)
        self._text(x2 + col2_l + col2_v - 5, y - 14, fmt_num(lect_fin, 1), size=9, align='right')

        y -= row_h + 4

        self._text(x_start, y - 14, 'Consumo KWH', size=9)
        self._rect(x_start + col1_l, y - row_h, col1_v, row_h)
        self._text(x_start + col1_l + col1_v - 5, y - 14, fmt_num(kwh, 1), size=9, align='right')

        self._text(x2, y - 14, 'Tarifa', size=9)
        self._rect(x2 + col2_l, y - row_h, col2_v, row_h)
        self._text(x2 + col2_l + col2_v - 5, y - 14, self.tariff, size=9, align='right')

        self.y = y - row_h - 8

    def _items_table(self):
        y = self.y
        row_h = 20
        col_item = 200
        col_consumo = 80
        col_unit = 120
        col_total = CONTENT_W - col_item - col_consumo - col_unit

        self._rect(MARGIN_L, y - row_h, CONTENT_W, row_h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - row_h, CONTENT_W, row_h, stroke=1)

        hx = MARGIN_L
        self._text(hx + 5, y - 14, 'Item', size=9, bold=True, color=WHITE)
        hx += col_item
        self._text(hx + col_consumo - 5, y - 14, 'Consumo', size=9, bold=True, color=WHITE, align='right')
        hx += col_consumo
        self._text(hx + col_unit - 5, y - 14, 'Valor Unit.', size=9, bold=True, color=WHITE, align='right')
        hx += col_unit
        self._text(hx + col_total - 5, y - 14, 'Total', size=9, bold=True, color=WHITE, align='right')

        y -= row_h

        items = []
        for label, cons, unit_price, total_clp in self.line_items:
            if label == 'Cargo Fijo':
                items.append((label, '1', fmt_clp(unit_price), fmt_clp(total_clp)))
            else:
                items.append((label, fmt_num(cons, 1 if 'KWH' in label or 'Energia' in label or 'Publico' in label else 2),
                              fmt_unit(unit_price), fmt_clp(total_clp)))

        for i, (item, consumo, unit, total) in enumerate(items):
            bg = GRAY_BG if i % 2 == 0 else WHITE
            self._rect(MARGIN_L, y - row_h, CONTENT_W, row_h, fill=bg)
            cx = MARGIN_L
            self.c.setStrokeColor(colors.Color(0.85, 0.85, 0.85))
            self.c.rect(cx, y - row_h, col_item, row_h, stroke=1)
            cx += col_item
            self.c.rect(cx, y - row_h, col_consumo, row_h, stroke=1)
            cx += col_consumo
            self.c.rect(cx, y - row_h, col_unit, row_h, stroke=1)
            cx += col_unit
            self.c.rect(cx, y - row_h, col_total, row_h, stroke=1)

            cx = MARGIN_L
            self._text(cx + 5, y - 14, item, size=9)
            cx += col_item
            self._text(cx + col_consumo - 5, y - 14, consumo, size=9, align='right')
            cx += col_consumo
            self._text(cx + col_unit - 5, y - 14, unit, size=9, align='right')
            cx += col_unit
            self._text(cx + col_total - 5, y - 14, total, size=9, align='right')

            y -= row_h

        self.y = y - 8

    def _totals(self):
        y = self.y
        row_h = 20

        self._text(MARGIN_L + 5, y - 14, 'TOTALES:', size=10, bold=True)
        y -= row_h + 4

        total_neto = float(self.d['total_neto_clp'] or 0)
        iva = float(self.d['iva_clp'] or 0)
        monto_exento = float(self.d['monto_exento_clp'] or 0)
        total_iva = float(self.d['total_con_iva_clp'] or 0)

        col_w = CONTENT_W / 4

        self._rect(MARGIN_L, y - row_h, CONTENT_W, row_h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - row_h, CONTENT_W, row_h, stroke=1)
        labels = ['Total Neto', 'IVA', 'Monto Exento', 'Total con IVA']
        for i, label in enumerate(labels):
            self._text(MARGIN_L + i * col_w + 5, y - 14, label, size=9, bold=True, color=WHITE)
        y -= row_h

        self._rect(MARGIN_L, y - row_h, CONTENT_W, row_h)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - row_h, CONTENT_W, row_h, stroke=1)
        values = [fmt_clp(total_neto), fmt_clp(iva), fmt_clp(monto_exento), fmt_clp(total_iva)]
        for i, val in enumerate(values):
            self.c.setStrokeColor(colors.Color(0.85, 0.85, 0.85))
            self.c.rect(MARGIN_L + i * col_w, y - row_h, col_w, row_h, stroke=1)
            self._text(MARGIN_L + (i + 1) * col_w - 5, y - 14, val, size=10, align='right')

        self.y = y - row_h - 12

    def _chart(self):
        y = self.y
        title_h = 20

        self._rect(MARGIN_L, y - title_h, CONTENT_W, title_h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - title_h, CONTENT_W, title_h, stroke=1)
        self._text(PAGE_W / 2, y - 14, 'GRAFICO ENERGIA KWH ULTIMOS 13 MESES',
                   size=10, bold=True, color=WHITE, align='center')
        y -= title_h + 5

        chart_h = 120
        chart_w = CONTENT_W - 40
        chart_x = MARGIN_L + 35
        chart_y = y - chart_h

        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, chart_y - 25, CONTENT_W, chart_h + 30, stroke=1)

        if not self.history:
            self._text(PAGE_W / 2, y - 60, 'Sin datos historicos', size=9, align='center')
            self.y = chart_y - 30
            return

        max_kwh = max((h[1] for h in self.history), default=1)
        if max_kwh == 0:
            max_kwh = 1

        scale_max = max_kwh * 1.2
        n_ticks = 6
        tick_step = scale_max / n_ticks

        self.c.saveState()
        self.c.translate(MARGIN_L + 6, chart_y + chart_h / 2)
        self.c.rotate(90)
        self._text(0, 0, 'KWH', size=7, bold=True, align='center')
        self.c.restoreState()

        for i in range(n_ticks + 1):
            val = int(tick_step * i)
            ty = chart_y + (chart_h * i / n_ticks)
            self._text(chart_x - 3, ty - 3, str(val), size=6, align='right')
            self.c.setStrokeColor(colors.Color(0.9, 0.9, 0.9))
            self.c.setLineWidth(0.3)
            self.c.line(chart_x, ty, chart_x + chart_w, ty)

        n_slots = 13
        bar_spacing = chart_w / n_slots
        bar_w = bar_spacing * 0.6

        kwh_map = {h[0]: h[1] for h in self.history}

        ref = self.d['month'] if isinstance(self.d['month'], date) else date.fromisoformat(str(self.d['month']))
        ref = ref.replace(day=1)
        slots = []
        m = ref
        for _ in range(n_slots - 1):
            if m.month == 1:
                m = date(m.year - 1, 12, 1)
            else:
                m = m.replace(month=m.month - 1)
        for _ in range(n_slots):
            slots.append(m)
            if m.month == 12:
                m = date(m.year + 1, 1, 1)
            else:
                m = m.replace(month=m.month + 1)

        for i, slot_month in enumerate(slots):
            bx = chart_x + i * bar_spacing + (bar_spacing - bar_w) / 2
            kwh = kwh_map.get(slot_month, 0)

            if kwh > 0:
                bar_h = (kwh / scale_max) * chart_h
                self.c.setFillColor(ORANGE_BAR)
                self.c.setStrokeColor(colors.Color(0.85, 0.60, 0.10))
                self.c.rect(bx, chart_y, bar_w, bar_h, fill=1, stroke=1)

            label = fmt_month_label(slot_month)
            self.c.saveState()
            self.c.translate(bx + bar_w / 2, chart_y - 18)
            self.c.rotate(45)
            self._text(0, 0, label, size=5.5)
            self.c.restoreState()

        self.y = chart_y - 30

    def _bank_footer(self):
        y = self.y
        title_h = 20

        self._rect(MARGIN_L, y - title_h, CONTENT_W, title_h, fill=ORANGE)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - title_h, CONTENT_W, title_h, stroke=1)
        self._text(PAGE_W / 2, y - 14, 'DATOS PARA TRANSFERENCIA ELECTRONICA',
                   size=10, bold=True, color=WHITE, align='center')
        y -= title_h + 5

        box_h = 40
        self._rect(MARGIN_L, y - box_h, CONTENT_W, box_h)
        self.c.setStrokeColor(BLACK)
        self.c.rect(MARGIN_L, y - box_h, CONTENT_W, box_h, stroke=1)

        self._text(MARGIN_L + 10, y - 15,
                   'Razon Social: Globe Montajes Industriales Spa, Cuenta Corriente Banco de Chile', size=8)
        self._text(MARGIN_L + 10, y - 30,
                   'Num Cuenta: 8001486104, RUT: 76.301.545-9, Comprobante: admin@globemontaje.cl', size=8)


def generate_pdf_to_buffer(meter_id, month, conn):
    cur = conn.cursor()

    billing = fetch_billing_data(cur, meter_id, month)
    if not billing:
        return None, None

    store = fetch_store_info(cur, meter_id)
    tariff = fetch_tariff_info(cur, billing['building_name'], month)
    readings = fetch_readings_range(cur, meter_id, month)
    history = fetch_kwh_history(cur, meter_id, month)
    line_items = compute_line_items(billing, tariff)

    tariff_label = 'AT43'

    buf = io.BytesIO()
    pdf = BillingPDF(buf, billing, store, tariff_label, readings, history, line_items)
    pdf.draw()
    buf.seek(0)

    month_date = billing['month'] if isinstance(billing['month'], date) else date.fromisoformat(str(billing['month']))
    filename = f"{meter_id}-{fmt_period(month_date)}.pdf"

    return buf.getvalue(), filename


def handler(event, context):
    """Lambda handler. Expects { storeName, buildingName, month }."""
    body = event if isinstance(event, dict) else json.loads(event)
    store_name = body.get('storeName', '')
    building_name = body.get('buildingName', '')
    month = body.get('month', '')

    if not store_name or not building_name or not month:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'storeName, buildingName, and month are required'}),
        }

    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        meters = fetch_meters_for_store(cur, store_name, building_name, month)

        if not meters:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'No meters found for store "{store_name}" in "{building_name}" for {month}'}),
            }

        # Generate PDF for first meter (most stores have 1 meter)
        pdf_bytes, filename = generate_pdf_to_buffer(meters[0], month, conn)

        if not pdf_bytes:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'No billing data for meter {meters[0]} in {month}'}),
            }

        return {
            'statusCode': 200,
            'body': json.dumps({
                'pdf': base64.b64encode(pdf_bytes).decode('utf-8'),
                'filename': filename,
            }),
        }
    finally:
        conn.close()
