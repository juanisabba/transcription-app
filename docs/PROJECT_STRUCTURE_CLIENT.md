# Estructura Frontend - Vocali Client (Nuxt + TypeScript)

## Árbol de Carpetas
```
client/
├── app.vue                          # Root component
├── nuxt.config.ts                   # Configuración Nuxt
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts               # Tailwind config
│
├── public/                          # Assets estáticos
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   ├── components/                  # Componentes reutilizables
│   │   ├── Auth/
│   │   │   ├── LoginForm.vue
│   │   │   ├── RegisterForm.vue
│   │   │   └── LogoutButton.vue
│   │   ├── Transcription/
│   │   │   ├── UploadForm.vue
│   │   │   ├── RealtimeRecorder.vue
│   │   │   └── TranscriptionViewer.vue
│   │   ├── History/
│   │   │   ├── TranscriptionList.vue
│   │   │   └── Pagination.vue
│   │   └── Common/
│   │       ├── Navbar.vue
│   │       ├── Loading.vue
│   │       └── ErrorAlert.vue
│   │
│   ├── composables/                 # Lógica reutilizable
│   │   ├── useAuth.ts               # Login, register, logout
│   │   ├── useTranscription.ts      # Upload, list, download
│   │   ├── useMicrophone.ts         # Recording en tiempo real
│   │   └── usePagination.ts        # Paginación
│   │
│   ├── stores/                      # Pinia (estado global)
│   │   ├── auth.store.ts            # Usuario, token
│   │   ├── transcription.store.ts   # Historial
│   │   └── ui.store.ts              # Loading, errores
│   │
│   ├── services/                    # API calls
│   │   ├── api.ts                   # Instancia Axios
│   │   ├── auth.service.ts          # POST /auth/*
│   │   ├── transcription.service.ts # POST /transcriptions/*
│   │   └── speechmatics.service.ts  # WebSocket real-time
│   │
│   ├── types/                       # TypeScript interfaces
│   │   ├── auth.types.ts
│   │   ├── transcription.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/                       # Funciones helper
│   │   ├── validation.ts            # Validaciones
│   │   ├── format.ts                # Formateo
│   │   └── errors.ts                # Manejo errores
│   │
│   ├── middleware/                  # Middlewares Nuxt
│   │   └── auth.ts                  # Proteger rutas
│   │
│   └── pages/                       # Rutas/páginas
│       ├── index.vue                # Landing / Home
│       ├── auth/
│       │   ├── login.vue
│       │   ├── register.vue
│       │   └── logout.vue
│       ├── transcribe/
│       │   ├── upload.vue
│       │   └── realtime.vue
│       └── history/
│           ├── index.vue
│           └── [id]/download.vue
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   ├── composables/
│   │   └── services/
│   └── e2e/
│       ├── auth.cy.ts
│       ├── transcription.cy.ts
│       └── history.cy.ts
│
├── .env.local                       # Variables de entorno
├── package.json
└── README.md
```
