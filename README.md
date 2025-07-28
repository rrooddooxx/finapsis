# 💸 Finapsis 💸

Un chatbot financiero inteligente que te ayuda a manejar tus lucas de forma simple y visual.
Proyecto para hackathon de Desafío Latam x Equipo Finapsis.

## 🚀 ¿Qué hace?

- **Chatbot con IA**: Pregúntale sobre tus finanzas y te responde con gráficos y tarjetas
  interactivas
- **WhatsApp**: Mándale fotos de boletas, mensajes de voz o texto y los procesa automáticamente
- **Sincronización en tiempo real**: Lo que mandas por WhatsApp aparece al tiro en la web
- **Análisis inteligente**: Te dice en qué gastaste más, cómo ahorrar y te ayuda con tus metas

## 🛠 Stack Técnico

### Backend

- **Runtime**: Bun (más rápido que Node.js)
- **Framework**: Hono (minimalista y rápido)
- **IA**: Oracle Cloud AI + Vercel AI SDK
- **Base de datos**: Supabase (PostgreSQL + auth + realtime)
- **Cola de tareas**: BullMQ + Redis
- **WhatsApp**: Twilio

### Frontend

- **Build**: Vite + React + TypeScript
- **UI**: Tailwind CSS + Shadcn/ui
- **Estado**: Zustand + TanStack Query
- **Chat**: Vercel AI SDK con Generative UI

### Infraestructura

- **Cloud**: Oracle Cloud (VM + Object Storage)
- **Deploy**: Docker + GitHub Actions
- **Monorepo**: Bun workspaces

## 📁 Estructura del Proyecto

```
├── apps/
│   ├── api/          # Backend Hono
│   ├── web/          # Frontend React
│   └── workers/          # Workers BullMQ
├── packages/
│   ├── shared/       # Tipos compartidos + provider IA
│   └── supabase/     # Cliente y migraciones
└── docker-compose.yml
```

## 🏃‍♂️ Cómo correr el proyecto

### Prerrequisitos

- Bun instalado (`curl -fsSL https://bun.sh/install | bash`)
- Docker para Redis local
- Cuenta en Supabase
- Créditos de Oracle Cloud (para IA)

### Setup inicial

```bash
# Clonar el repo
git clone [repo-url]
cd financial-assistant

# Instalar dependencias
bun install

# Copiar variables de entorno
cp .env.example .env.local
# Llenar con tus claves de Supabase, Oracle, Twilio

# Levantar servicios locales
docker-compose up -d

# Correr migraciones
bun run db:migrate

# Iniciar desarrollo
bun run dev
```

Esto levanta:

- Backend en http://localhost:3000
- Frontend en http://localhost:5173

## 🔑 Variables de Entorno Necesarias

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Oracle Cloud (para IA)
OCI_COMPARTMENT_ID=
OCI_REGION=

# Twilio (para WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

## 🏗 Arquitectura Simplificada

```
Usuario (Web/WhatsApp)
         ↓
    Hono API (:3000)
         ↓
   ┌─────┴─────┐
   │           │
Chat Service   Workers (BullMQ)
   │           │
   └─────┬─────┘
         ↓
  Oracle Cloud AI
    + Supabase
```

### Flujo del Chat

1. **Usuario escribe**: "¿Cuánto gasté en comida?"
2. **Chat Service** procesa el mensaje
3. **Agent Orchestrator** decide qué agentes usar
4. **Balance Agent** consulta las transacciones
5. **LLM** genera respuesta con los datos
6. **Frontend** renderiza una tarjeta visual con el resultado

### Flujo de WhatsApp

1. **Usuario manda foto** de boleta por WhatsApp
2. **Twilio** manda webhook a nuestra API
3. **API** encola el trabajo en Redis
4. **Worker** procesa la imagen con OCR
5. **Worker** guarda la transacción
6. **Worker** responde por WhatsApp
7. **Web app** se actualiza en tiempo real

## 🎯 Decisiones Técnicas Clave

- **Monolito modular**: Todo en un servidor Hono (excepto workers) para simplificar
- **Generative UI**: Las respuestas del chat incluyen componentes React interactivos
- **Provider customizado**: Creamos un provider para Oracle AI compatible con Vercel AI SDK
- **Workers asincrónicos**: Procesamiento pesado (OCR, transcripción) no bloquea la API
- **Supabase todo-en-uno**: Auth + DB + Storage + Realtime en un solo servicio

## 🚢 Deploy

El proyecto se deploya automáticamente a Oracle Cloud cuando pusheas a `main`:

```bash
git push origin main
```

GitHub Actions se encarga de:

1. Buildear las imágenes Docker
2. Subirlas a Docker Hub
3. Conectarse por SSH al servidor
4. Actualizar los contenedores

## 💡 Tips para el Hackathon

- **Prioridad 1**: Que el chat funcione con respuestas visuales (Generative UI)
- **Prioridad 2**: Integración WhatsApp básica
- **Prioridad 3**: Agentes financieros que impresionen
- **Nice to have**: RAG con videos de influencers

## 🤝 Equipo

Proyecto desarrollado por equipo FINAPSIS.

---

Cualquier duda, revisa los archivos `CLAUDE.md` en cada carpeta para más detalles técnicos. ¡Dale
con todo! 🚀