# API de Ingesta de Datos — Energy Monitor

## Información de Conexión

| Campo | Valor |
|-------|-------|
| **URL base** | `https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev` |
| **API Key** | `eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe` |
| **Autenticación** | Header `x-api-key` en cada request |
| **Límite por día** | 10,000 requests |
| **Límite por segundo** | 20 requests (burst: 50) |
| **Tamaño máximo por request** | 10 MB (para archivos más grandes, ver sección "Archivos grandes") |

---

## Endpoints

### 1. Enviar datos — `POST /dev/ingest`

Recibe cualquier tipo de dato (JSON, CSV, XML, Excel, binario, etc.) y lo almacena.

**Headers requeridos:**

| Header | Valor | Obligatorio |
|--------|-------|-------------|
| `x-api-key` | `eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe` | Sí |
| `Content-Type` | Tipo del contenido enviado (ej: `application/json`, `text/csv`) | Sí |
| `x-source-id` | Identificador de quien envía (ej: `empresa-xyz`) | Recomendado |
| `x-file-name` | Nombre original del archivo (ej: `lecturas-marzo.csv`) | Opcional |

**Ejemplo — Enviar JSON:**

```bash
curl -X POST https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest \
  -H "x-api-key: eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe" \
  -H "Content-Type: application/json" \
  -H "x-source-id: empresa-xyz" \
  -d '{
    "medidores": [
      {"id": "MED-001", "lectura_kwh": 1523.4, "timestamp": "2026-03-23T10:00:00Z"},
      {"id": "MED-002", "lectura_kwh": 872.1, "timestamp": "2026-03-23T10:00:00Z"}
    ]
  }'
```

**Ejemplo — Enviar CSV:**

```bash
curl -X POST https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest \
  -H "x-api-key: eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe" \
  -H "Content-Type: text/csv" \
  -H "x-source-id: empresa-xyz" \
  -H "x-file-name: lecturas-marzo.csv" \
  --data-binary @lecturas-marzo.csv
```

**Ejemplo — Enviar archivo Excel:**

```bash
curl -X POST https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest \
  -H "x-api-key: eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  -H "x-source-id: empresa-xyz" \
  -H "x-file-name: reporte-medidores.xlsx" \
  --data-binary @reporte-medidores.xlsx
```

**Respuesta exitosa (200):**

```json
{
  "ok": true,
  "key": "raw/external/empresa-xyz/2026-03-23/5a4b33e7-1964-45ff-b157-b7aa8ee439d4.json",
  "id": "5a4b33e7-1964-45ff-b157-b7aa8ee439d4",
  "size": 142,
  "contentType": "application/json"
}
```

**Errores posibles:**

| Código | Significado |
|--------|-------------|
| 400 | Body vacío — se debe enviar contenido |
| 403 | API Key faltante o inválida |
| 429 | Límite de requests excedido (esperar e intentar de nuevo) |
| 500 | Error interno (reportar a Hoktus) |

---

### 2. Subir archivos grandes — `POST /dev/ingest/upload-url`

Para archivos mayores a 10 MB (hasta 5 GB). Genera una URL temporal de subida directa.

**Paso 1 — Solicitar URL de subida:**

```bash
curl -X POST https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest/upload-url \
  -H "x-api-key: eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "empresa-xyz",
    "contentType": "text/csv",
    "fileName": "lecturas-historicas.csv"
  }'
```

**Respuesta:**

```json
{
  "ok": true,
  "uploadUrl": "https://energy-monitor-ingest-058310292956.s3.us-east-1.amazonaws.com/raw/external/...",
  "key": "raw/external/empresa-xyz/2026-03-23/c5388efe-93ac-4339-a782-5622dfe56dd3.csv",
  "id": "c5388efe-93ac-4339-a782-5622dfe56dd3",
  "expiresIn": 3600,
  "method": "PUT",
  "contentType": "text/csv"
}
```

**Paso 2 — Subir el archivo usando la URL obtenida:**

```bash
curl -X PUT "<uploadUrl del paso anterior>" \
  -H "Content-Type: text/csv" \
  --data-binary @lecturas-historicas.csv
```

> La URL expira en 1 hora. Si no se usa a tiempo, solicitar una nueva.

---

### 3. Verificar estado — `GET /dev/ingest/status`

Endpoint público (no requiere API Key). Sirve para verificar que la API esté operativa.

```bash
curl https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest/status
```

**Respuesta:**

```json
{
  "ok": true,
  "service": "external-ingest",
  "timestamp": "2026-03-23T19:40:27.171Z"
}
```

---

## Formatos aceptados

La API acepta cualquier formato. Configurar el `Content-Type` correspondiente:

| Formato | Content-Type |
|---------|-------------|
| JSON | `application/json` |
| CSV | `text/csv` |
| XML | `application/xml` o `text/xml` |
| Excel (.xlsx) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Excel (.xls) | `application/vnd.ms-excel` |
| Texto plano | `text/plain` |
| ZIP | `application/zip` |
| Otro | `application/octet-stream` |

---

## Ejemplo en Python

```python
import requests

API_URL = "https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest"
API_KEY = "eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe"

# Enviar JSON
response = requests.post(
    API_URL,
    headers={
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
        "x-source-id": "empresa-xyz",
    },
    json={
        "medidores": [
            {"id": "MED-001", "lectura_kwh": 1523.4, "timestamp": "2026-03-23T10:00:00Z"},
        ]
    },
)
print(response.json())

# Enviar archivo CSV
with open("lecturas.csv", "rb") as f:
    response = requests.post(
        API_URL,
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "text/csv",
            "x-source-id": "empresa-xyz",
            "x-file-name": "lecturas.csv",
        },
        data=f.read(),
    )
print(response.json())
```

---

## Ejemplo en JavaScript/Node.js

```javascript
const response = await fetch(
  "https://qops56u6g3.execute-api.us-east-1.amazonaws.com/dev/ingest",
  {
    method: "POST",
    headers: {
      "x-api-key": "eaHp4ICN8Y35OejThUen81P9X7UVxIfRB45hdxRe",
      "Content-Type": "application/json",
      "x-source-id": "empresa-xyz",
    },
    body: JSON.stringify({
      medidores: [
        { id: "MED-001", lectura_kwh: 1523.4, timestamp: "2026-03-23T10:00:00Z" },
      ],
    }),
  }
);
const result = await response.json();
console.log(result);
```

---

## Notas importantes

- **No hay esquema fijo**: pueden enviar los datos en la estructura que prefieran. Nosotros procesamos después.
- **Usar `x-source-id`**: ayuda a identificar el origen de los datos. Usar un nombre consistente (ej: `empresa-xyz`) en todos los envíos.
- **Frecuencia**: pueden enviar datos tan seguido como necesiten, respetando el límite de 10,000 requests/día.
- **Reintentos**: si reciben error 500 o timeout, reintentar después de unos segundos. Si el error persiste, contactar a Hoktus.
- **Soporte**: contacto técnico en Hoktus para problemas con la API.
