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
Request: { fileName, fileSize, contentType }
Response: { id, uploadUrl, status: "pending" }
Status: 202

GET /transcriptions?page=1&pageSize=10
Response: { items: [Transcription], hasMore, nextCursor }
Status: 200

GET /transcriptions/{id}/download
Response: { downloadUrl }
Status: 200

## Errores Globales

400: { code: "VALIDATION_ERROR", message }
401: { code: "UNAUTHORIZED", message }
404: { code: "NOT_FOUND", message }
409: { code: "CONFLICT", message }
