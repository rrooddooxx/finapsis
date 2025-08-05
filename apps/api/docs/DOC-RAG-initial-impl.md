Implementación de Drizzle, PostgreSQL Local y RAG Básico

## Resumen General
Implementación inicial de RAG (Retrieval-Augmented Generation) con PostgreSQL local y Drizzle ORM, introduciendo capacidades de búsqueda semántica y almacenamiento de embeddings para el asistente financiero.

## Cambios Principales

### 1. Configuración de Base de Datos PostgreSQL (Solo para trabajar en local)
- **Archivo**: `apps/api/docker-compose.yml`
- **Implementación**: PostgreSQL con extensión pgvector
- **Configuración**: Usuario `rag`, base de datos `finapsis-rag`
- **Puerto**: 5432

### 2. Integración de Drizzle ORM
- **Configuración**: `apps/api/drizzle.config.ts`
- **Scripts**: Migración, generación de esquemas, studio, push/pull
- **Esquemas**: Ubicados en `src/providers/supabase/schema`

### 3. Esquemas de Base de Datos

#### Tabla `resources`
```sql
CREATE TABLE resources (
  id varchar(191) PRIMARY KEY,
  content text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

#### Tabla `embeddings`
```typescript
export const embeddings = pgTable(
  'embeddings',
  {
    id: varchar('id', {length: 191}).primaryKey(),
    resourceId: varchar('resource_id').references(() => resources.id),
    content: text('content').notNull(),
    embedding: vector('embedding', {dimensions: 1536}).notNull(),
  },
  // Índice HNSW para búsqueda de vectores
  table => ({
    embeddingIndex: index('embeddingIndex')
      .using('hnsw', table.embedding.op('vector_cosine_ops'))
  })
);
```

### 4. Servicios de Embeddings

#### Generación de Embeddings
- **Modelo**: OpenAI `text-embedding-ada-002`
- **Chunking**: Inteligente por oraciones y párrafos (max 300 caracteres)
- **Batch Processing**: Múltiples chunks simultáneos

#### Búsqueda Semántica
```typescript
export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;
  
  return supabase.select({content: embeddings.content, similarity})
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(desc(similarity))
    .limit(4);
}
```

### 5. Herramientas del Asistente

#### ADD_KNOWLEDGE Tool
- **Propósito**: Agregar información a la base de conocimientos
- **Uso**: Automático cuando el usuario proporciona datos personales
- **Funcionalidad**: Genera embeddings y los almacena

#### FIND_RELEVANT_KNOWLEDGE Tool
- **Propósito**: Buscar información relevante antes de responder
- **Obligatorio**: Debe usarse para TODA pregunta del usuario
- **Threshold**: Similaridad mínima de 0.5

### 6. Personalidad del Asistente Financiero
```typescript
const CONTENT_ONLY_RAG = `Eres un asistente financiero especializado en el mercado chileno 🇨🇱
PERSONALIDAD Y TONO:
- Sé divertido y usa emojis apropiados 😊
- EXCEPCIÓN: Si hablan de deudas, mantén un tono serio
- No seas infantil, equilibrio profesional y amigable

MONEDA Y CÁLCULOS:
- Asume pesos chilenos (CLP) por defecto
- Sé MUY EXACTO con cálculos matemáticos

FUNCIONAMIENTO:
- OBLIGATORIO: PRIMERO usa FIND_RELEVANT_KNOWLEDGE
- NUNCA respondas sin buscar en la base de conocimientos
- Auto-guarda información personal con ADD_KNOWLEDGE
```

### 7. Configuración de Entorno
- **OpenAI API Key**: Para embeddings
- **DATABASE_URL**: PostgreSQL local
- **NODE_ENV**: Development con limpieza opcional de DB

### 8. Scripts de Base de Datos
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx src/providers/supabase/migrate.ts",
  "db:studio": "drizzle-kit studio",
  "dev:clear-db": "CLEAR_DB_ON_START=true bun run --hot src/index.ts"
}
```

## Arquitectura RAG Implementada

### Flujo de Almacenamiento
1. Usuario proporciona información → ADD_KNOWLEDGE
2. Contenido se divide en chunks semánticamente coherentes
3. Se generan embeddings con OpenAI ada-002
4. Se almacenan en PostgreSQL con índice HNSW

### Flujo de Recuperación
1. Usuario hace pregunta → FIND_RELEVANT_KNOWLEDGE (obligatorio)
2. Se genera embedding de la pregunta
3. Búsqueda por similaridad coseno (threshold 0.5)
4. Se retornan los 4 resultados más relevantes
5. El asistente responde basado en la información encontrada

### Chunking Inteligente
- Divide por oraciones con límite de 300 caracteres
- Preserva contexto semántico
- Maneja casos edge (textos cortos, una oración)

### Índice Vectorial Optimizado
- HNSW (Hierarchical Navigable Small World)
- Operador `vector_cosine_ops` para eficiencia
- Búsqueda aproximada de vecinos más cercanos

### Limpieza de Base de Datos
- Función `clearAllData()` para desarrollo
- Respeta constrains de foreign keys
- Activable con variable de entorno

## Impacto en la Aplicación

### Capacidades Nuevas
1. **Memoria Persistente**: El asistente recuerda información del usuario
2. **Búsqueda Semántica**: Encuentra información relevante contextualmente
4. **Personalización**: Adapta respuestas basado en datos del usuario

## Consideraciones de Rendimiento
- Embeddings se generan de forma asíncrona
- Índice HNSW optimiza búsquedas vectoriales
- Limit de 4 resultados por consulta para eficiencia
- Threshold de similaridad evita resultados irrelevantes
