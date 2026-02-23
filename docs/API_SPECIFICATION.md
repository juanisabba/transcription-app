# API Endpoints

## Auth

POST /auth/register
Request: { email, password }
Response: { userId, accessToken, refreshToken }
Status: 201

POST /auth/login
Request: { email, password }
Response: { userId, accessToken, refreshToken }
Status: 200

## Transcription

POST /transcriptions/upload
Request: { fileName, fileSize, contentType? }
Response: { id, uploadUrl, status: "pending", expiresIn }
Status: 202

POST /transcriptions/realtime
Request: (vacío, requiere Bearer token)
Response: { token, wsUrl, ttl, transcriptionId }
Status: 200

POST /transcriptions/realtime/{id}/save
Request: { content: string }
Response: { ok: true }
Status: 200
Nota: El cliente debe llamar este endpoint al terminar la sesión WebSocket con el texto transcrito.

DELETE /transcriptions/{id}
Response: (vacío)
Status: 204

GET /transcriptions?page=1&pageSize=10
Response: { items: [Transcription], hasMore, totalPages, currentPage }
Status: 200

### Paginación (GET /transcriptions)

| Parámetro | Tipo | Default | Descripción |
|----------|------|---------|-------------|
| page | number | 1 | Número de página (1-based). |
| pageSize | number | 10 | Elementos por página (máx. 10). |

**Respuesta:**
- `items`: Array de transcripciones (batch, realtime, etc.).
- `hasMore`: `true` si hay más páginas.
- `totalPages`: Número total de páginas conocidas.
- `currentPage`: Página actual devuelta.

GET /transcriptions/{id}/download
Response: { downloadUrl } o contenido textual directo
Status: 200

## Webhook Speechmatics

`POST /webhook/speechmatics` — Recibe las notificaciones cuando Speechmatics termina una transcripción.

**URL en producción:** Se construye automáticamente en cada deploy (API Gateway). No requiere configurar `SPEECHMATICS_WEBHOOK_URL` manualmente. Para desarrollo local, usar ngrok apuntando a este path.

## Webhook Security

El webhook de Speechmatics soporta validación HMAC para garantizar la autenticidad de las peticiones.

**Configuración:**
- Variable de entorno: `SPEECHMATICS_WEBHOOK_SECRET`
- Si está definida, se **requiere** la cabecera `X-Webhook-Signature` con la firma HMAC-SHA256 (hex) del body.
- Cálculo: `HMAC-SHA256(secret, body)` → codificación hexadecimal.
- Si la firma no coincide o falta: `401 Unauthorized`.
- Si `SPEECHMATICS_WEBHOOK_SECRET` no está definida, la validación se omite (desarrollo local).

## Errores Globales

400: { code: "VALIDATION_ERROR", message }
400: { code: "INVALID_FILE_TYPE", message } — contentType no es audio/*
400: { code: "FILE_TOO_LARGE", message }
401: { code: "UNAUTHORIZED", message }
404: { code: "NOT_FOUND", message }
409: { code: "CONFLICT", message }
