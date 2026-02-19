# 🏛️ Arquitectura del Sistema: Transcription Service

Este documento define los principios arquitectónicos, patrones de diseño y la estructura técnica para el servicio de transcripción. Es la "fuente de verdad" para el desarrollo.

---

## 1. Patrón Arquitectónico: Arquitectura Hexagonal (Ports & Adapters)

Para garantizar **escalabilidad**, **testabilidad** y **mantenibilidad**, el proyecto se divide en tres capas desacopladas. La lógica de negocio **nunca** debe depender de los detalles de implementación (AWS SDK, Speechmatics API, etc.).

### A. Capa de Dominio (Core)

- **Ubicación:** `src/core`
- **Contenido:**
  - `entities/`: Modelos de negocio (`User.ts`, `Transcription.ts`)
  - `ports/`: Interfaces (Contratos con la infraestructura)
  - Lógica pura sin dependencias externas
- **Regla de Oro:** NO depende de AWS, bases de datos ni librerías externas
- **Ejemplo:** `src/core/entities/Transcription.ts` no sabe si se persiste en DynamoDB o PostgreSQL

### B. Capa de Aplicación (Use Cases)

- **Ubicación:** `src/core/use-cases`
- **Contenido:**
  - Orquestación de la lógica de negocio
  - Ejemplos: `RegisterUserUseCase.ts`, `UploadTranscriptionUseCase.ts`, `ListTranscriptionsUseCase.ts`
- **Regla de Oro:** Utiliza SOLO las interfaces definidas en `core/ports/` para interactuar con el exterior
- **Responsabilidades:**
  - Validar entrada
  - Orquestar servicios (repositorios, APIs externas)
  - Lanzar excepciones de negocio

### C. Capa de Infraestructura (Adapters)

- **Ubicación:** `src/infrastructure`
- **Contenido:**
  - `repositories/`: Implementaciones de IRepository (DynamoDB)
  - `storage/`: Cliente S3 (Presigned URLs, Download)
  - `auth/`: Integración AWS Cognito
  - `external-services/`: Adaptador Speechmatics API
  - `triggers/`: Handlers Lambda (HTTP, S3 Events, WebSockets)
- **Regla de Oro:** Implementa las interfaces del core. Puede usar AWS SDK sin restricción
- **Responsabilidad:** Traducir llamadas del core a operaciones técnicas reales

---

## 2. Inversión de Control: Regla Más Importante

**El core NUNCA importa infrastructure.**  
**Infrastructure IMPLEMENTA interfaces del core.**

```
❌ INCORRECTO:
┌──────────────────┐
│  core/use-cases/ │
│   UploadUseCase  │
└────────┬─────────┘
         │ imports
         ▼
┌──────────────────────────┐
│ infrastructure/repos/    │
│ TranscriptionRepository  │
└──────────────────────────┘
(El core depende de infraestructura → Acoplado)

✅ CORRECTO:
┌──────────────────┐
│  core/use-cases/ │
│   UploadUseCase  │
└────────┬─────────┘
         │ usa
         ▼
┌──────────────────┐
│  core/ports/     │
│ ITranscriptionRepository (interface)
└────────┬─────────┘
         ▲ implementa
         │
┌────────┴──────────────────┐
│ infrastructure/repos/     │
│ TranscriptionRepository   │
└──────────────────────────┘
(Infrastructure depende del core → Desacoplado)
```

---

## 3. Responsabilidades por Capa

| Tarea                     | Core | Use Cases | Infrastructure |
| ------------------------- | ---- | --------- | -------------- |
| Lógica de negocio pura    | ✅   | ✅        | ❌             |
| Validación de entrada     | ✅   | ✅        | ❌             |
| Persistencia en BD        | ❌   | ❌        | ✅             |
| Llamadas a APIs externas  | ❌   | ❌        | ✅             |
| AWS SDK directo           | ❌   | ❌        | ✅             |
| Manejo de errores         | ✅   | ✅        | ✅             |
| Logging                   | ❌   | ✅        | ✅             |
| Formato de respuesta HTTP | ❌   | ❌        | ✅             |

---

## 4. Flujos Críticos y Patrones de Diseño

### 🚀 Transcripción Asíncrona (Event-Driven)

Para evitar timeouts en AWS Lambda y mejorar la experiencia del usuario:

```
┌──────────────────┐
│     Frontend     │
└────────┬─────────┘
         │ 1. GET /transcriptions/upload-url
         ▼
┌────────────────────────────┐
│ Lambda: GetPresignedUrl    │
│ (triggers/http/upload.h)   │
└────────┬───────────────────┘
         │ 2. Retorna URL de S3
         ▼
┌──────────────────┐
│     Frontend     │
└────────┬─────────┘
         │ 3. PUT archivo directo a S3
         │    (evita pasar 20MB por Lambda)
         ▼
     ┌───────┐
     │   S3  │
     └───┬───┘
         │ 4. Event: s3:ObjectCreated
         ▼
┌────────────────────────────┐
│ Lambda: ProcessUpload      │
│ (triggers/s3/...)          │
│ - Crea record en DynamoDB  │
│ - Llama Speechmatics API   │
│ - Retorna 202 (Accepted)   │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Speechmatics (Async)        │
│ Procesa audio por minutos   │
└────────┬────────────────────┘
         │ 5. Webhook: transcription.complete
         ▼
┌────────────────────────────┐
│ Lambda: OnTranscriptionComplete
│ - Actualiza DynamoDB       │
│ - Envía notificación        │
└────────┬───────────────────┘
         │
         ▼
┌──────────────────┐
│     Frontend     │
│  (Polling cada   │
│    2 segundos)   │ 6. GET /transcriptions/{id}
└──────────────────┘
```

**Ventajas:**

- ✅ Frontend no espera 5 minutos
- ✅ Lambda no alcanza timeout (30s)
- ✅ Escalable a millones de archivos
- ✅ Bajo costo (pagar solo por tiempo real de procesamiento)

---

### 🔍 Paginación: Cursor-Based (NO Offset)

DynamoDB **no soporta offset** de forma eficiente. Usamos **cursor-based pagination**:

**Frontend solicita:**

```json
GET /transcriptions?pageSize=10&cursor=abc123xyz
```

**Backend responde:**

```json
{
  "items": [...10 transcriptions...],
  "total": 150,
  "nextCursor": "def456uvw",
  "hasMore": true
}
```

**Implementación en Use Case:**

```typescript
export class ListTranscriptionsUseCase {
  async execute(userId: string, pageSize: number, cursor?: string) {
    // DynamoDB Query con ExclusiveStartKey = cursor
    const result = await this.repository.findByUserId(
      userId,
      pageSize,
      cursor, // LastEvaluatedKey de consulta anterior
    );

    return {
      items: result.items,
      nextCursor: result.lastEvaluatedKey, // Para siguiente página
    };
  }
}
```

**Ventaja:** O(1) en lugar de O(n) con offset

---

### 🛡️ Seguridad y Autenticación

#### Flujo de Tokens

```
1. Frontend: POST /auth/login { email, password }
   ↓
2. Lambda: AuthUseCase valida en Cognito
   ↓
3. Cognito: Retorna AccessToken + RefreshToken
   ↓
4. Frontend: Guarda tokens en localStorage
   ↓
5. Siguientes requests incluyen: Authorization: Bearer {accessToken}
   ↓
6. API Gateway: Authorizer valida token (antes de invocar Lambda)
   ↓
7. Lambda: Token ya validado, extrae userId de claims
```

#### IAM Roles: Principio de Mínimo Privilegio

Cada Lambda solo puede:

```yaml
# ✅ CORRECTO
UploadLambda:
  Actions:
    - s3:PutObject # Solo subir a su bucket
    - dynamodb:PutItem # Solo en su tabla
  Resource:
    - arn:aws:s3:::vocali-uploads/*
    - arn:aws:dynamodb:region:account:table/vocali-transcriptions

# ❌ INCORRECTO
AnyLambda:
  Actions:
    - "*" # NUNCA
  Resource:
    - "*" # NUNCA
```

---

## 5. Decisiones Arquitectónicas (ADRs)

### ADR-001: Arquitectura Hexagonal vs Layered

**Decisión:** Hexagonal (Ports & Adapters)

**Razones:**

- ✅ Core NO depende de AWS → Testeable sin mocks
- ✅ Cambiar DynamoDB → PostgreSQL sin tocar core
- ✅ Alineado con Domain-Driven Design
- ✅ Fácil de mantener en equipos grandes

**Alternativa rechazada:**

- ❌ Layered: Core depende de infraestructura

---

### ADR-002: Serverless (Lambda) vs Servidor Tradicional

**Decisión:** AWS Lambda + API Gateway

**Razones:**

- ✅ **Costo:** $0 sin uso, pay-per-use después
- ✅ **Escalabilidad:** Auto-scaling automático
- ✅ **Operaciones:** Zero infraestructura
- ✅ **Integración:** Nativa con Cognito, DynamoDB, S3

**Alternativa rechazada:**

- ❌ EC2: Servidor siempre encendido (~$100/mes)
- ❌ ECS: Más complejo que Lambda para este caso

---

### ADR-003: DynamoDB (NoSQL) vs PostgreSQL

**Decisión:** DynamoDB

**Razones:**

- ✅ **Free Tier:** 25GB + 25 RCU/WCU permanente
- ✅ **Integración:** Lambda sin VPC
- ✅ **Auto-scaling:** On-demand billing
- ✅ **TTL:** Expiración automática de datos

**Tradeoff aceptado:**

- ⚠️ Menos flexible que SQL (no JOINs complejos)
- ⚠️ Requiere modelado especial de datos (denormalización)

---

### ADR-004: Cursor-Based vs Offset-Based Pagination

**Decisión:** Cursor-based

**Razones:**

- ✅ **Eficiencia:** O(1) en DynamoDB
- ✅ **Consistencia:** No falla si se insertan/borran durante paginación
- ✅ **Escalabilidad:** Soporta millones de registros

**Alternativa rechazada:**

- ❌ Offset: O(n), costoso en NoSQL

---

### ADR-005: Presigned URLs vs Lambda Upload

**Decisión:** Presigned URLs (S3 directo)

**Razones:**

- ✅ **Ancho de banda:** No pasa 20MB por Lambda
- ✅ **Latencia:** Upload directo a S3
- ✅ **Costo:** Lambda menos tiempo de ejecución
- ✅ **Confiabilidad:** Reintentos automáticos del navegador

**Flujo:**

```
1. Frontend: GET /presigned-url
2. Lambda: Genera URL firmada de S3
3. Frontend: PUT archivo directo a S3
4. S3: Dispara evento (S3:ObjectCreated)
5. Lambda separada: Procesa archivo
```

---

## 6. Stack Tecnológico

| Capa         | Tecnología           | Versión | Razón                |
| ------------ | -------------------- | ------- | -------------------- |
| **Runtime**  | Node.js              | 18.x    | LTS, estable         |
| **Lenguaje** | TypeScript           | 5.x     | Type safety          |
| **IaC**      | Serverless Framework | 3.x     | Diseñado para Lambda |
| **Database** | DynamoDB             | -       | NoSQL, free tier     |
| **Storage**  | S3                   | -       | Object storage       |
| **Auth**     | Cognito              | -       | AWS native           |
| **Frontend** | Nuxt.js              | 3.x     | Full-stack framework |
| **Styling**  | Tailwind CSS         | 3.x     | Utility-first        |
| **Testing**  | Jest                 | 29.x    | Rápido, snapshots    |
| **E2E**      | Cypress              | 13.x    | Modern, fácil        |

---

## 7. Monitoreo y Observabilidad

### Logs

```typescript
// shared/utils/logger.ts
export class Logger {
  info(message: string, meta?: any) {
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }),
    );
  }
}

// En Lambda
const logger = Logger.getInstance();
logger.info("User registered", { userId, email });
```

**Centralizado en CloudWatch Logs**

### Métricas

**CloudWatch Metrics:**

- Lambda Invocations (por función)
- Lambda Duration (percentiles: p50, p95, p99)
- Lambda Errors (rate)
- DynamoDB ConsumedWriteCapacityUnits
- S3 NumberOfObjects

### Alertas

```yaml
# serverless.yml
alarms:
  - functionName: register
    threshold: 5 # % error rate
    statistic: Average
    period: 300 # 5 minutos
    evaluationPeriods: 2
    alarmActions:
      - !Ref SNSAlarmTopic
```

**Alertas críticas:**

- ❌ Lambda Error Rate > 5%
- ❌ Lambda Duration p99 > 25s (timeout es 30s)
- ❌ DynamoDB Write Throttled > 0

---

## 8. Estrategia de Testing

### Piramide de Tests

```
           ▲
          /|\      E2E (Cypress)
         / | \     - Flujos completos desde frontend
        /  |  \    - Bajo volumen (20-30 tests)
       /   |   \
      /    |    \
     /  Integration (Jest)
    /  - Use-case + Repository (DynamoDB local)
   / - Bajo volumen (50-100 tests)
  /___________________
 /     Unit (Jest)
/___ - Use-cases (mocked)
     - Pure functions
     - Alto volumen (500+ tests)
```

### Cobertura Mínima

- **core/**: 90% (lógica crítica)
- **use-cases/**: 85%
- **infrastructure/**: 70%
- **triggers/**: 60%

### Ejemplo: Unit Test

```typescript
// src/core/use-cases/__tests__/RegisterUserUseCase.test.ts
describe("RegisterUserUseCase", () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = createMock<IUserRepository>();
    useCase = new RegisterUserUseCase(mockUserRepository);
  });

  it("should throw if email already exists", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-123",
      email: "test@test.com",
    } as any);

    await expect(
      useCase.execute({
        email: "test@test.com",
        password: "SecurePass123!",
      }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it("should register user successfully", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.createUser.mockResolvedValue({
      id: "user-123",
      email: "test@test.com",
    } as any);

    const result = await useCase.execute({
      email: "test@test.com",
      password: "SecurePass123!",
    });

    expect(result.userId).toBe("user-123");
    expect(mockUserRepository.createUser).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "SecurePass123!",
    });
  });
});
```

---

## 9. Versionamiento de API

### Estrategia: URL Versioning

```
GET /v1/transcriptions     # Actual
GET /v2/transcriptions     # Futura (backwards compatible)
```

### Reglas

- ❌ **NUNCA** eliminar endpoints. Deprecar 6 meses antes.
- ✅ **Soportar** múltiples versiones simultáneamente
- ✅ **Documentar** cambios en `CHANGELOG.md`
- ✅ **Respetar** contratos: si cambias Response, es v2

---

## 10. Estándares de Calidad

### Inyección de Dependencias

```typescript
// ✅ CORRECTO (testeable)
export class UploadUseCase {
  constructor(
    private transcriptionRepository: ITranscriptionRepository,
    private storageService: IStorageService,
  ) {}
}

// ❌ INCORRECTO (acoplado)
export class UploadUseCase {
  private transcriptionRepository = new TranscriptionRepository();
}
```

### Tipado Estricto

```typescript
// ✅ CORRECTO
async function register(request: RegisterRequest): Promise<AuthResponse> {
  const user: User = await repository.createUser(request);
  return { userId: user.id, accessToken: generateToken(user) };
}

// ❌ INCORRECTO
async function register(request: any): Promise<any> {
  const user = await repository.createUser(request);
  return { userId: user.id };
}
```

### Tratamiento Centralizado de Errores

```typescript
// src/shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super("USER_ALREADY_EXISTS", 409, `User ${email} already exists`);
  }
}

// En handler
try {
  await useCase.execute(request);
} catch (error) {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, body: error.toJSON() };
  }
  return { statusCode: 500, body: "Internal Server Error" };
}
```

### Persistencia de Código

- ❌ **NO** borrar código funcional sin razón de peso
- ❌ **NO** refactorizar solo por refactorizar
- ❌ **NO** eliminar comentarios técnicos
- ✅ **SÍ** cambios que añadan valor demostrable

---

## 11. Checklist para Desarrolladores y IA

Antes de hacer commit:

- [ ] ¿Las dependencias fluyen HACIA el core (no salen)?
- [ ] ¿Hay tests unitarios con mocks?
- [ ] ¿No hay `any` en TypeScript?
- [ ] ¿Los errores extienden AppError?
- [ ] ¿Las lambdas son delgadas (<20 líneas)?
- [ ] ¿El código está bien documentado?
- [ ] ¿Coverage mínimo 80%?
- [ ] ¿Path aliases usados (no rutas relativas)?

---

## Resumen: Los Tres Pilares

1. **Hexagonal Architecture:** Core protegido, infraestructura intercambiable
2. **Event-Driven Async:** Transcripción sin bloqueos, escalable
3. **Strict Quality:** TypeScript, DI, Testing, Logging
