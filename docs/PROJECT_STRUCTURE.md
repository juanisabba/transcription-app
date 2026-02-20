# 📂 Estructura del Proyecto: Transcription Service

Este documento define la jerarquía de carpetas y la organización del código para el **monorepo serverless**.

Utilizamos:

- **api/** para el backend Node.js + TypeScript + Serverless Framework
- **client/** para el frontend Nuxt.js + TypeScript + Tailwind
- **Arquitectura Hexagonal** para separar dominio de infraestructura
- **Domain-Driven Design (DDD)** con Bounded Contexts

---

## 📁 Directorio Raíz

```
transcription-app/
├── api/                       # Backend: Node.js + TS + Serverless
├── client/                    # Frontend: Nuxt.js + TS + Tailwind
├── docs/                      # Documentación técnica
├── pnpm-workspace.yaml        # Configuración monorepo pnpm
├── .cursorrules               # Instrucciones para la IA (Cursor/Cline)
├── .gitignore
├── package.json               # Root workspace scripts
└── README.md
```

---

## 🏗️ Backend Structure: `/api`

**Arquitectura Hexagonal:** El **dominio** es el centro. **Infraestructura** lo rodea implementando interfaces.

```
api/
│
├── src/
│   │
│   ├── domain/                          # 🎯 CAPA DE DOMINIO (Lógica Pura)
│   │   │                                # NO depende de nada externo
│   │   ├── entities/                    # Objetos de dominio
│   │   │   ├── User.ts                  # Propiedades + métodos de dominio
│   │   │   ├── Transcription.ts
│   │   │   └── TranscriptionStatus.ts
│   │   │
│   │   ├── value-objects/               # Objetos de valor inmutables
│   │   │   ├── Email.ts                 # Email validado
│   │   │   ├── UserId.ts                # ID tipado
│   │   │   └── FileSize.ts              # Tamaño de archivo validado
│   │   │
│   │   ├── repositories/                # Interfaces (Puertos de salida)
│   │   │   ├── IUserRepository.ts       # Contrato: findByEmail, save, etc
│   │   │   ├── ITranscriptionRepository.ts
│   │   │   └── index.ts                 # Exporta todas las interfaces
│   │   │
│   │   ├── services/                    # Lógica de dominio
│   │   │   ├── PasswordService.ts       # Hash y validación de contraseñas
│   │   │   ├── FileValidationService.ts # Validar tamaño, tipo de archivo
│   │   │   └── index.ts
│   │   │
│   │   └── exceptions/                  # Excepciones de dominio
│   │       ├── UserAlreadyExistsException.ts
│   │       ├── FileTooLargeException.ts
│   │       ├── InvalidEmailException.ts
│   │       └── index.ts
│   │
│   ├── application/                     # 🔄 CAPA DE APLICACIÓN (Orquestación)
│   │   │                                # Coordina domain + infrastructure
│   │   ├── use-cases/                   # Casos de uso
│   │   │   ├── auth/
│   │   │   │   ├── RegisterUserUseCase.ts
│   │   │   │   ├── LoginUserUseCase.ts
│   │   │   │   ├── LogoutUserUseCase.ts
│   │   │   │   └── ValidateTokenUseCase.ts
│   │   │   │
│   │   │   ├── transcription/
│   │   │   │   ├── UploadTranscriptionUseCase.ts
│   │   │   │   ├── CreateRealtimeSessionUseCase.ts
│   │   │   │   ├── SaveRealtimeTranscriptionUseCase.ts
│   │   │   │   ├── ProcessTranscriptionResultUseCase.ts
│   │   │   │   └── StartTranscriptionUseCase.ts
│   │   │   │
│   │   │   └── history/
│   │   │       ├── ListTranscriptionsUseCase.ts
│   │   │       ├── GetTranscriptionUseCase.ts
│   │   │       ├── DownloadTranscriptionUseCase.ts
│   │   │       └── DeleteTranscriptionUseCase.ts
│   │   │
│   │   ├── dto/                         # Data Transfer Objects
│   │   │   ├── auth/
│   │   │   │   ├── RegisterUserDTO.ts
│   │   │   │   ├── LoginUserDTO.ts
│   │   │   │   └── AuthResponseDTO.ts
│   │   │   │
│   │   │   ├── transcription/
│   │   │   │   ├── UploadTranscriptionDTO.ts
│   │   │   │   └── TranscriptionResponseDTO.ts
│   │   │   │
│   │   │   └── history/
│   │   │       ├── ListTranscriptionsDTO.ts
│   │   │       └── PaginationDTO.ts
│   │   │
│   │   └── ports/                       # Interfaces para infraestructura
│   │       ├── IAuthService.ts          # Cognito adapter contract
│   │       ├── IStorageService.ts       # S3 adapter contract
│   │       ├── IEmailService.ts         # Email adapter contract
│   │       ├── IExternalApiService.ts   # Speech Matics adapter contract
│   │       └── index.ts
│   │
│   ├── infrastructure/                  # 🛠️ CAPA DE INFRAESTRUCTURA
│   │   │                                # Implementaciones técnicas
│   │   ├── repositories/                # Implementan interfaces de domain/
│   │   │   ├── UserRepository.ts        # Implementa IUserRepository
│   │   │   ├── TranscriptionRepository.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── adapters/                    # Implementan interfaces de application/ports/
│   │   │   ├── auth/
│   │   │   │   ├── CognitoAuthAdapter.ts    # Implementa IAuthService
│   │   │   │   └── JwtValidator.ts
│   │   │   │
│   │   │   ├── storage/
│   │   │   │   ├── S3StorageAdapter.ts      # Implementa IStorageService
│   │   │   │   └── PresignedUrlGenerator.ts
│   │   │   │
│   │   │   ├── external-services/
│   │   │   │   ├── SpeechMaticsAdapter.ts   # Implementa IExternalApiService
│   │   │   │   └── WebSocketManager.ts
│   │   │   │
│   │   │   └── email/
│   │   │       └── EmailAdapter.ts          # Implementa IEmailService
│   │   │
│   │   └── persistence/                 # AWS SDK clients
│   │       ├── dynamodb/
│   │       │   ├── DynamoDBClient.ts
│   │       │   └── DynamoDBMapper.ts
│   │       │
│   │       └── s3/
│   │           └── S3Client.ts
│   │
│   ├── presentation/                    # 🔌 CAPA DE PRESENTACIÓN (Entry Points)
│   │   │                                # Handlers Lambda
│   │   ├── http/                        # Lambdas HTTP + API Gateway
│   │   │   ├── auth/
│   │   │   │   ├── RegisterHandler.ts
│   │   │   │   ├── LoginHandler.ts
│   │   │   │   ├── LogoutHandler.ts
│   │   │   │   └── ValidateHandler.ts
│   │   │   │
│   │   │   ├── transcription/
│   │   │   │   ├── UploadHandler.ts
│   │   │   │   ├── RealtimeSessionHandler.ts
│   │   │   │   ├── SaveRealtimeTranscriptionHandler.ts
│   │   │   │   ├── ListTranscriptionsHandler.ts
│   │   │   │   ├── DownloadTranscriptionHandler.ts
│   │   │   │   └── DeleteHandler.ts
│   │   │   │
│   │   ├── events/                      # Lambdas de eventos
│   │   │   ├── S3EventHandler.ts        # Activa al crear archivo en S3
│   │   │   ├── DynamoDBStreamHandler.ts # Activa al cambiar DynamoDB
│   │   │   └── WebhookHandler.ts        # Recibe webhook de Speech Matics
│   │   │
│   │   └── middleware/                  # Middleware HTTP (Middy)
│   │       ├── AuthMiddleware.ts        # Valida JWT + Cognito
│   │       ├── ErrorHandlingMiddleware.ts
│   │       ├── LoggingMiddleware.ts
│   │       ├── ValidationMiddleware.ts
│   │       └── CorsMiddleware.ts
│   │
│   └── shared/                          # ⚙️ CÓDIGO COMPARTIDO
│       │                                # Sin dependencias de otras capas
│       ├── utils/
│       │   ├── Logger.ts                # Winston/Pino logger
│       │   ├── ResponseFormatter.ts     # Wrapper de respuestas HTTP
│       │   ├── ErrorHandler.ts          # Error handling global
│       │   ├── DateUtils.ts
│       │   ├── ValidationUtils.ts
│       │   ├── CryptoUtils.ts
│       │   └── index.ts
│       │
│       ├── constants/
│       │   ├── HttpStatusCodes.ts       # 200, 400, 401, 409, etc
│       │   ├── ErrorCodes.ts            # VALIDATION_ERROR, UNAUTHORIZED, etc
│       │   ├── Limits.ts                # MAX_FILE_SIZE=20MB, PAGE_SIZE=10
│       │   ├── RegexPatterns.ts         # EMAIL_PATTERN, PASSWORD_PATTERN
│       │   └── index.ts
│       │
│       ├── types/
│       │   ├── HttpTypes.ts             # ApiResponse, ApiError, HttpStatus
│       │   ├── ErrorTypes.ts            # Error response structures
│       │   ├── PaginationTypes.ts       # Pagination request/response
│       │   └── index.ts
│       │
│       └── errors/
│           ├── AppError.ts              # Base error class
│           ├── ValidationError.ts       # 400 Bad Request
│           ├── NotFoundError.ts         # 404 Not Found
│           ├── UnauthorizedError.ts     # 401 Unauthorized
│           ├── ConflictError.ts         # 409 Conflict
│           └── index.ts
│
├── tests/                               # 🧪 TESTS
│   ├── unit/                            # Tests unitarios (use-cases sin BD)
│   │   ├── auth/
│   │   │   └── RegisterUserUseCase.test.ts
│   │   ├── transcription/
│   │   │   └── UploadTranscriptionUseCase.test.ts
│   │   └── history/
│   │       └── ListTranscriptionsUseCase.test.ts
│   │
│   ├── integration/                     # Tests de integración (use-cases + repos)
│   │   ├── auth/
│   │   │   └── RegisterUserUseCase.integration.test.ts
│   │   └── transcription/
│   │       └── UploadTranscriptionUseCase.integration.test.ts
│   │
│   ├── e2e/                             # End-to-end tests (con Cypress)
│   │   ├── auth.cy.ts
│   │   ├── transcription.cy.ts
│   │   └── download.cy.ts
│   │
│   ├── fixtures/                        # Datos de test
│   │   ├── users.fixture.ts
│   │   ├── transcriptions.fixture.ts
│   │   └── index.ts
│   │
│   └── mocks/                           # Mocks de repositorios/servicios
│       ├── MockUserRepository.ts
│       ├── MockTranscriptionRepository.ts
│       ├── MockStorageService.ts
│       ├── MockAuthService.ts
│       └── index.ts
│
├── serverless.yml                       # IaC: Lambdas, DynamoDB, S3, Cognito
├── tsconfig.json                        # Path aliases: @domain, @application, etc
├── jest.config.js                       # Configuración de tests
├── .env.example                         # Variables de entorno (plantilla)
├── .env.local                           # Variables locales (no commitear)
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── package.json
└── README.md
```

---

## 🎨 Frontend Structure: `/client`

Nuxt 3 con TypeScript, Pinia, y composables.

```
client/
│
├── src/
│   │
│   ├── components/                      # 🧩 Componentes UI
│   │   ├── auth/
│   │   │   ├── LoginForm.vue
│   │   │   ├── RegisterForm.vue
│   │   │   └── PasswordInput.vue
│   │   │
│   │   ├── transcription/
│   │   │   ├── UploadForm.vue
│   │   │   ├── TranscriptionCard.vue
│   │   │   ├── RealtimeTranscription.vue
│   │   │   └── DownloadButton.vue
│   │   │
│   │   └── common/
│   │       ├── Header.vue
│   │       ├── Navbar.vue
│   │       ├── Pagination.vue
│   │       ├── LoadingSpinner.vue
│   │       ├── Modal.vue
│   │       └── Alert.vue
│   │
│   ├── composables/                     # 🪝 Lógica Reactiva (Hooks)
│   │   ├── useAuth.ts                   # Login, register, logout
│   │   ├── useTranscription.ts          # Upload, transcribe, realtime
│   │   ├── useHistory.ts                # Listar, descargar
│   │   ├── usePagination.ts             # Paginación con cursor
│   │   ├── useWebSocket.ts              # WebSocket tiempo real
│   │   └── useApi.ts                    # Cliente fetch genérico
│   │
│   ├── pages/                           # 📄 Rutas (Nuxt Auto-routing)
│   │   ├── index.vue                    # /
│   │   ├── auth/
│   │   │   ├── login.vue                # /auth/login
│   │   │   ├── register.vue             # /auth/register
│   │   │   └── forgot-password.vue      # /auth/forgot-password
│   │   │
│   │   ├── dashboard.vue                # /dashboard (protegido)
│   │   │
│   │   ├── transcriptions/
│   │   │   ├── index.vue                # /transcriptions (lista)
│   │   │   ├── [id].vue                 # /transcriptions/[id] (detalle)
│   │   │   └── upload.vue               # /transcriptions/upload
│   │   │
│   │   └── settings.vue                 # /settings
│   │
│   ├── layouts/                         # 📐 Plantillas
│   │   ├── default.vue                  # Layout por defecto
│   │   └── auth.vue                     # Layout para páginas de auth
│   │
│   ├── stores/                          # 📦 Pinia (State Management)
│   │   ├── auth.store.ts                # Estado de autenticación
│   │   ├── transcription.store.ts       # Estado de transcripciones
│   │   └── ui.store.ts                  # Estado UI (theme, modals)
│   │
│   ├── services/                        # 🔌 Clientes API y WebSocket
│   │   ├── api.service.ts               # Cliente fetch genérico
│   │   ├── auth.service.ts              # Endpoints de auth
│   │   ├── transcription.service.ts     # Endpoints de transcripción
│   │   ├── history.service.ts           # Endpoints de historial
│   │   └── websocket.service.ts         # WebSocket
│   │
│   ├── middleware/                      # 🔐 Middleware de rutas
│   │   ├── auth.middleware.ts           # Proteger rutas autenticadas
│   │   └── guest.middleware.ts          # Solo para no-autenticados
│   │
│   ├── types/                           # 🔤 TypeScript Global
│   │   ├── auth.types.ts
│   │   ├── transcription.types.ts
│   │   ├── api.types.ts
│   │   └── ui.types.ts
│   │
│   ├── utils/                           # 🔧 Utilidades
│   │   ├── storage.util.ts              # LocalStorage helper
│   │   ├── date.util.ts                 # Formateo de fechas
│   │   ├── file.util.ts                 # Validación de archivos
│   │   └── format.util.ts               # Formateo general
│   │
│   ├── public/                          # 📁 Assets estáticos
│   │   ├── logo.png
│   │   ├── favicon.ico
│   │   └── icons/
│   │
│   ├── assets/                          # 🎨 Assets compilados
│   │   ├── css/
│   │   │   └── tailwind.css
│   │   ├── images/
│   │   └── fonts/
│   │
│   └── __tests__/                       # 🧪 Tests
│       ├── components/
│       │   └── LoginForm.test.ts
│       ├── composables/
│       │   └── useAuth.test.ts
│       ├── stores/
│       │   └── auth.store.test.ts
│       └── e2e/ (Cypress)
│           ├── auth.cy.ts
│           └── upload.cy.ts
│
├── cypress/                             # 🧪 E2E Tests
│   ├── e2e/
│   │   ├── auth.cy.ts
│   │   ├── upload.cy.ts
│   │   └── download.cy.ts
│   └── support/
│       └── commands.ts
│
├── nuxt.config.ts                       # Configuración Nuxt
├── tailwind.config.ts                   # Configuración Tailwind
├── tsconfig.json
├── jest.config.js
├── .env.example
└── package.json
```

---

## 🎯 Bounded Contexts (DDD)

El proyecto está organizado en 3 contextos de negocio independientes:

### 1️⃣ **Auth Context** - Autenticación y Usuarios

**Backend:**

```
domain/entities/User.ts
domain/repositories/IUserRepository.ts
domain/services/PasswordService.ts
domain/exceptions/UserAlreadyExistsException.ts
application/use-cases/auth/RegisterUserUseCase.ts
application/dto/RegisterUserDTO.ts
infrastructure/repositories/UserRepository.ts
infrastructure/adapters/auth/CognitoAuthAdapter.ts
presentation/http/auth/RegisterHandler.ts
```

**Frontend:**

```
stores/auth.store.ts
composables/useAuth.ts
services/auth.service.ts
pages/auth/login.vue
pages/auth/register.vue
```

---

### 2️⃣ **Transcription Context** - Upload y Transcripción

**Backend:**

```
domain/entities/Transcription.ts
domain/repositories/ITranscriptionRepository.ts
domain/value-objects/FileSize.ts
application/use-cases/transcription/UploadTranscriptionUseCase.ts
application/use-cases/transcription/TranscribeRealtimeUseCase.ts
application/dto/UploadTranscriptionDTO.ts
application/ports/IStorageService.ts
infrastructure/repositories/TranscriptionRepository.ts
infrastructure/adapters/storage/S3StorageAdapter.ts
infrastructure/adapters/external-services/SpeechMaticsAdapter.ts
presentation/http/transcription/UploadHandler.ts
presentation/events/WebhookHandler.ts
```

**Frontend:**

```
stores/transcription.store.ts
composables/useTranscription.ts
services/transcription.service.ts
components/transcription/UploadForm.vue
components/transcription/RealtimeTranscription.vue
pages/transcriptions/upload.vue
```

---

### 3️⃣ **History Context** - Listar y Descargar

**Backend:**

```
application/use-cases/history/ListTranscriptionsUseCase.ts
application/use-cases/history/DownloadTranscriptionUseCase.ts
application/dto/ListTranscriptionsDTO.ts
domain/repositories/ITranscriptionRepository.ts
infrastructure/repositories/TranscriptionRepository.ts
presentation/http/history/ListHandler.ts
presentation/http/history/DownloadHandler.ts
```

**Frontend:**

```
composables/useHistory.ts
services/history.service.ts
pages/transcriptions/index.vue
pages/transcriptions/[id].vue
```

---

## 🔄 Flujo de Dependencias (Hexagonal)

```
┌─────────────────────────┐
│   PRESENTATION          │
│   (Handlers Lambda)     │
└──────────┬──────────────┘
           │ importa
           ▼
┌─────────────────────────┐
│   APPLICATION           │
│   (Use Cases + DTOs)    │
└──────────┬──────────────┘
           │ importa
           ▼
┌─────────────────────────┐
│   DOMAIN                │
│   (Entities + Ports)    │
└──────────┬──────────────┘
           ▲
           │ implementa
           │
┌──────────┴─────────────┐
│   INFRASTRUCTURE       │
│   (Repos + Adapters)   │
└───────────────────────┘
```

**Regla de Oro:**

- ✅ PRESENTATION → APPLICATION → DOMAIN
- ✅ INFRASTRUCTURE implementa interfaces de DOMAIN
- ❌ DOMAIN NUNCA importa APPLICATION o INFRASTRUCTURE
- ❌ APPLICATION NUNCA importa INFRASTRUCTURE directamente (solo ports)

---

## 📏 Estándares de Codificación

### Strict Typing

```typescript
// ❌ Prohibido
const data: any = await repository.find();

// ✅ Requerido
const data: User = await userRepository.findById(userId);
```

### Inyección de Dependencias

```typescript
// ❌ Incorrecto (acoplado)
export class RegisterUserUseCase {
  private userRepository = new UserRepository();
}

// ✅ Correcto (desacoplado)
export class RegisterUserUseCase {
  constructor(private userRepository: IUserRepository) {}
}
```

### Aislamiento del Domain

```
✅ Permitido en domain/:
  - Importar de entities/, value-objects/, repositories/, services/, exceptions/

❌ NO permitido en domain/:
  - Importar de application/
  - Importar de infrastructure/
  - Importar de presentation/
  - Importar AWS SDK directamente

✅ Permitido en application/:
  - Importar de domain/ (entities, ports)
  - Importar de application/ (use-cases, dto)
  - ❌ NO importar de infrastructure/ directamente (solo ports)

✅ Permitido en infrastructure/:
  - Importar de domain/repositories (interfaces)
  - Importar de application/ports (interfaces)
  - Importar AWS SDK, librerías externas

✅ Permitido en presentation/:
  - Importar de application/use-cases
  - Importar de infrastructure/ (si necesario)
```

### Handlers Minimalistas

```typescript
// ✅ Excelente: 1. Parsear → 2. Ejecutar → 3. Responder
export const handler: APIGatewayProxyHandler = async (event) => {
  const request = parseRequest(event);
  const result = await registerUserUseCase.execute(request);
  return formatResponse(result, 201);
};

// ❌ Incorrecto: Lógica dentro del handler
export const handler = async (event) => {
  const email = JSON.parse(event.body).email;
  if (!email.includes("@")) return { statusCode: 400 };
  // ... más lógica aquí
};
```

### Naming Conventions

```
Use Cases:    {Verb}{Noun}UseCase.ts
              RegisterUserUseCase.ts
              UploadTranscriptionUseCase.ts

DTOs:         {Noun}{Verb}DTO.ts
              RegisterUserDTO.ts
              AuthResponseDTO.ts

Repositories: {Entity}Repository.ts
              UserRepository.ts
              Interfaces: I{Entity}Repository.ts

Adapters:     {Service}Adapter.ts
              CognitoAuthAdapter.ts
              S3StorageAdapter.ts

Handlers:     {Action}Handler.ts
              RegisterHandler.ts

Services:     {Entity}Service.ts
              PasswordService.ts

Types:        {Entity}.types.ts
              user.types.ts
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

**Uso:**

```typescript
import { User } from "@domain/entities/User";
import { IUserRepository } from "@domain/repositories/IUserRepository";
import { RegisterUserUseCase } from "@application/use-cases/auth/RegisterUserUseCase";
import { UserRepository } from "@infrastructure/repositories/UserRepository";
import { RegisterHandler } from "@presentation/http/auth/RegisterHandler";
```

---

## 🧪 Testing Rules

- **Unit Tests**: Tests de use-cases (sin infraestructura real)
- **Integration Tests**: Use-cases + repositories reales (DynamoDB local)
- **E2E Tests**: Cypress desde el frontend (flujos completos)
- **Coverage Mínimo**: 85% en domain/ y application/
- **Mocks**: Implementar interfaces de `domain/repositories` y `application/ports` para testing

---

## 🚫 Persistencia y Cambios

- ❌ No borrar código funcional sin razón de peso
- ❌ No refactorizar solo por refactorizar
- ❌ No eliminar comentarios técnicos
- ✅ Solo cambios que añadan valor demostrable

---

## ✅ Checklist para Cursor/Cline

Cuando generes código, verifica:

- [ ] ¿DOMAIN es independiente (sin imports de infrastructure/presentation)?
- [ ] ¿APPLICATION solo importa domain/ y application/?
- [ ] ¿INFRASTRUCTURE implementa interfaces del domain?
- [ ] ¿El handler es delgado (solo parsea y llama)?
- [ ] ¿Estoy usando TypeScript stricto (sin any)?
- [ ] ¿Las dependencias son inyectadas?
- [ ] ¿Hay tests junto al código?
- [ ] ¿Estoy usando path aliases?
- [ ] ¿El código está en la carpeta correcta?
