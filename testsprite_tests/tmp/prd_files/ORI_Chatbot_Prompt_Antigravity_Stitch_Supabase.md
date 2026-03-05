# ORI — Asistente IA para Integro Suite
## Prompt de Desarrollo para Google Antigravity + Stitch MCP + Supabase

---

## CONTEXTO DEL PROYECTO

Construir un asistente de IA tipo chatbot llamado **"Ori"** para **Integro Suite**, una plataforma CRM enfocada en negocios colombianos y latinoamericanos.

El proyecto incluye: widget de chat embebible, backend RAG, web crawler, y un panel de administración completo — todo manejable sin tocar código.

---

## ENTORNO DE DESARROLLO

### IDE: Google Antigravity
- Usar **Google Antigravity** como IDE principal de desarrollo (antigravity.google)
- Modelo agéntico: **Gemini 3 Pro** como agente principal para planificación, ejecución y verificación autónoma
- Modo **Plan** para tareas complejas (genera Plan Artifact antes de actuar)
- Modo **Fast** para correcciones rápidas
- Usar el **Agent Manager** para delegar tareas de larga duración (crawlers, migraciones, tests)
- Activar **Browser Preview** integrado para testing automático del widget y del admin panel
- Configurar múltiples agentes simultáneos:
  - **Agente 1**: Backend (API + RAG + Crawler)
  - **Agente 2**: Admin Panel (React + Tailwind)
  - **Agente 3**: Widget embebible (Vanilla JS)
- Revisar los **Artifacts** generados por cada agente (task lists, implementation plans, screenshots, browser recordings) antes de aprobar

### UX/UI: Google Stitch + Stitch MCP
- Usar **Google Stitch** (stitch.withgoogle.com) para diseñar todas las interfaces UI/UX del proyecto
- **Stitch MCP Server** ya configurado en Antigravity para que los agentes accedan directamente a los diseños

**Workflow Stitch → Código:**
1. Diseñar cada pantalla del Admin Panel en Stitch con prompts detallados (ver sección de pantallas abajo)
2. Generar variantes para mobile y desktop
3. Usar `build_site` del MCP para mapear pantallas a rutas
4. Usar `get_screen_code` para extraer HTML/CSS limpio de cada pantalla
5. El agente de Antigravity transforma el código Stitch en componentes React + Tailwind
6. Extraer **Design Tokens** (colores, tipografías, espaciados) via `get_design_context` para mantener consistencia

**Pantallas a diseñar en Stitch:**
- Login del Admin Panel
- Dashboard de Analytics
- Configuración de API y Modelo
- Identidad y Comportamiento del Bot
- Knowledge Base Manager
- Personalización del Widget (con preview en vivo)
- Conversaciones y Leads
- Integraciones y Webhooks
- Widget de Chat (versión desktop y mobile)

### Base de Datos: Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)
- Usar **Supabase** como backend-as-a-service principal
- **PostgreSQL** con extensión **pgvector** para embeddings y búsqueda semántica
- **Supabase Auth** para autenticación del Admin Panel (reemplaza JWT manual)
- **Supabase Storage** para archivos subidos (PDFs, avatares, documentos)
- **Supabase Realtime** para actualización en vivo del dashboard de analytics y estado del crawler
- **Row Level Security (RLS)** en todas las tablas sensibles
- **Edge Functions** (Deno) para lógica serverless (webhooks, procesamiento de crawl)

---

## TECH STACK ACTUALIZADO

| Componente | Tecnología |
|---|---|
| IDE | Google Antigravity (Gemini 3 Pro) |
| Diseño UI/UX | Google Stitch + Stitch MCP |
| Frontend (Widget) | Vanilla JS (single script embebible, Shadow DOM, sin dependencias) |
| Frontend (Admin Panel) | React + Tailwind CSS (código generado desde Stitch) |
| Backend | Node.js + Express (o Supabase Edge Functions para endpoints ligeros) |
| Base de Datos | Supabase PostgreSQL con pgvector |
| Autenticación | Supabase Auth (email/password + magic link) |
| Almacenamiento | Supabase Storage (documentos, avatares) |
| Realtime | Supabase Realtime (dashboard, estado del crawler) |
| Vector Store | pgvector via Supabase (búsqueda semántica nativa) |
| Web Crawling | Crawlee + Cheerio |
| AI | OpenAI API (modelo seleccionable desde admin panel) |
| Embeddings | OpenAI text-embedding-3-small |
| Deployment | Vercel (admin panel) + Railway o Render (backend) |

---

## ESQUEMA DE BASE DE DATOS (Supabase)

### Habilitar extensiones
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Tablas principales

```sql
-- Configuración global del bot (una fila por organización)
CREATE TABLE bot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  bot_name TEXT DEFAULT 'Ori',
  avatar_url TEXT,
  welcome_message_es TEXT DEFAULT '¡Hola! 👋 Soy Ori, tu asistente de Integro Suite. ¿En qué te puedo ayudar hoy?',
  welcome_message_en TEXT DEFAULT 'Hi! 👋 I''m Ori, Integro Suite''s assistant. How can I help you today?',
  system_prompt TEXT NOT NULL,
  fallback_message_es TEXT,
  fallback_message_en TEXT,
  whatsapp_fallback_url TEXT,
  quick_replies JSONB DEFAULT '[]'::jsonb,
  business_hours JSONB DEFAULT '{}'::jsonb,
  out_of_office_message_es TEXT,
  out_of_office_message_en TEXT,
  timezone TEXT DEFAULT 'America/Bogota',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración del modelo AI
CREATE TABLE ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  openai_api_key_encrypted TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración visual del widget
CREATE TABLE widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  primary_color TEXT DEFAULT '#6366f1',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  width INTEGER DEFAULT 380,
  height INTEGER DEFAULT 600,
  show_powered_by BOOLEAN DEFAULT true,
  show_feedback_buttons BOOLEAN DEFAULT true,
  approved_domains TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- URLs para crawling
CREATE TABLE crawl_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  url TEXT NOT NULL,
  max_depth INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'completed', 'failed')),
  pages_indexed INTEGER DEFAULT 0,
  chunks_stored INTEGER DEFAULT 0,
  last_crawled_at TIMESTAMPTZ,
  auto_recrawl TEXT DEFAULT 'weekly' CHECK (auto_recrawl IN ('daily', 'weekly', 'monthly', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chunks de conocimiento con embeddings (pgvector)
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('crawl', 'document')),
  source_url TEXT,
  source_filename TEXT,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536),
  crawl_url_id UUID REFERENCES crawl_urls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsqueda semántica (cosine distance)
CREATE INDEX ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Documentos subidos manualmente
CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- ruta en Supabase Storage
  file_type TEXT NOT NULL,
  file_size INTEGER,
  chunks_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'indexed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones de chat
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  language TEXT DEFAULT 'es',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  lead_captured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Mensajes individuales
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  feedback TEXT CHECK (feedback IN ('positive', 'negative', NULL)),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads capturados
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  session_id TEXT REFERENCES chat_sessions(session_id),
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración de integraciones
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  webhook_url TEXT,
  email_notifications BOOLEAN DEFAULT false,
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Métricas de uso de tokens
CREATE TABLE token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  embedding_tokens INTEGER DEFAULT 0,
  estimated_cost NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Función de búsqueda semántica (pgvector)
```sql
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_org_id UUID,
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_url TEXT,
  source_filename TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.source_type,
    kc.source_url,
    kc.source_filename,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.org_id = match_org_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Row Level Security (RLS)
```sql
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Ejemplo de policy: solo el usuario autenticado de la org puede ver sus datos
CREATE POLICY "Users can view own org data" ON bot_settings
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id');

-- Repetir patrón para cada tabla
```

### Supabase Storage Buckets
```sql
-- Crear buckets via Supabase Dashboard o API
-- bucket: 'avatars' → avatares del bot
-- bucket: 'documents' → PDFs, TXT, DOCX subidos
-- bucket: 'exports' → CSVs exportados
```

---

## MÓDULO 1 — WIDGET DE CHAT EMBEBIBLE

### Sistema de Embed
- Generar snippet único desde el admin panel:
  ```html
  <script src="https://yourdomain.com/widget.js" data-bot-id="YOUR_BOT_ID"></script>
  ```
- Widget carga como componente **Shadow DOM** aislado (sin conflictos CSS con el sitio host)
- **Domain whitelist**: widget solo funciona en dominios aprobados en admin panel
- Validación server-side del dominio contra `widget_config.approved_domains`

### UI del Widget (diseñar en Stitch)
**Prompt para Stitch — Widget Desktop:**
> "Design a floating chat widget for a CRM assistant called Ori. Bottom-right position. Collapsed state shows a circular button with chat icon in indigo (#6366f1). Expanded state shows a chat panel 380px wide by 600px tall with: header showing bot name 'Ori' + avatar + close button, message bubbles (user right-aligned gray, bot left-aligned indigo), animated typing indicator with three dots, quick-reply suggestion chips below messages, thumbs up/down feedback buttons on bot messages, text input with send button at bottom, and a subtle 'Powered by Integro Suite' footer. Use Inter font, rounded corners, subtle shadows. Dark header, white chat area."

**Prompt para Stitch — Widget Mobile:**
> "Same chat widget but full-screen mobile version. 100% width, 100vh height. Larger touch targets, bottom-safe-area padding for iOS. Sticky input at bottom."

**Funcionalidades:**
- Botón flotante (bottom-right por defecto), color e ícono configurables desde admin
- Panel de chat con:
  - Header: nombre del bot + avatar (configurable)
  - Burbujas de mensaje (usuario vs bot)
  - Indicador de escritura (puntos animados)
  - Botones de respuesta rápida (configurables desde admin)
  - Botones 👍 👎 de feedback en cada respuesta del bot
  - Campo de input + botón enviar
  - Footer "Powered by Integro Suite" (toggleable)
- Totalmente responsive (mobile + desktop)
- Auto-detección de idioma del navegador (ES/EN), fallback a español
- Modo "Fuera de horario": mostrar mensaje personalizado fuera de horario laboral
- Tiempo de carga menor a 2 segundos

---

## MÓDULO 2 — RAG BACKEND

### Web Crawler
- Aceptar múltiples URLs desde el admin panel (sin cambios de código)
- Crawlear todas las subpáginas dentro del mismo dominio (profundidad configurable: 1-5)
- Extraer texto limpio (strip HTML, navegación, footers, ads)
- Dividir en chunks de ~500 tokens con overlap de 50 tokens
- Generar embeddings via OpenAI `text-embedding-3-small`
- Almacenar chunks + embeddings + source URL + fecha de crawl en `knowledge_chunks` (pgvector)
- Trigger manual desde admin panel: `POST /admin/crawl`
- Scheduler de re-crawl automático (configurable: diario / semanal / mensual)
- Mostrar estado del crawl por URL: último crawl, páginas indexadas, chunks almacenados
- Usar **Supabase Realtime** para actualizar el estado del crawl en vivo en el admin panel

### Subida de Documentos (Knowledge Base Manual)
- Subir PDFs, .txt, .docx desde el admin panel
- Archivos se almacenan en **Supabase Storage** (bucket `documents`)
- Extraer y chunkear contenido automáticamente
- Indexar junto con contenido crawleado en el mismo vector store (pgvector)
- Mostrar todos los documentos indexados con opción de eliminar chunks individuales

### API de Chat
```
POST /api/chat
  Input: { message, sessionId, botId, language }
  → Búsqueda semántica via match_knowledge_chunks() → top 5 chunks relevantes
  → Inyectar contexto en system prompt
  → Llamar OpenAI con historial de conversación (últimos 10 mensajes)
  Return: { reply, sessionId, sources[] }
  → Si no hay contexto relevante → trigger fallback (redirigir a WhatsApp)

POST /api/leads
  Input: { name, email, whatsapp, sessionId }
  → Almacenar lead en tabla leads + asociar con conversación
  → Trigger webhook a Integro Suite CRM (URL configurable en admin)
  → Opcional: enviar notificación por email al admin

GET /admin/sessions → todas las sesiones con búsqueda/filtro
GET /admin/leads → todos los leads, exportable a CSV
POST /admin/crawl → trigger manual de crawl (protegido por Supabase Auth)
```

**Autenticación de endpoints:**
- Endpoints `/api/*` (widget): validación por `bot_id` + domain whitelist + rate limiting
- Endpoints `/admin/*`: protegidos por **Supabase Auth** (JWT automático)

---

## MÓDULO 3 — ADMIN CONTROL PANEL

> **Nota**: Cada sección del admin panel se diseña primero en **Google Stitch**, luego se extrae el código via **Stitch MCP** y se convierte a componentes React + Tailwind en **Antigravity**.

### Sección: API y Configuración del Modelo
- Input para OpenAI API Key (almacenada encriptada en `ai_config`, nunca expuesta al frontend)
- Dropdown selector de modelo:

| Modelo | Input price | Output price |
|---|---|---|
| gpt-4o | $2.50 / 1M tok | $10.00 / 1M tok |
| gpt-4o-mini | $0.15 / 1M tok | $0.60 / 1M tok |
| gpt-4-turbo | $10.00 / 1M tok | $30.00 / 1M tok |
| gpt-3.5-turbo | $0.50 / 1M tok | $1.50 / 1M tok |

- Slider de temperatura (0.0 → 1.0) con descripción del efecto
- Max tokens por respuesta (slider: 200 → 2000)
- Costo estimado por conversación (cálculo en vivo basado en el modelo seleccionado)
- Contador de uso de tokens: total este mes + costo estimado (desde tabla `token_usage`)

### Sección: Identidad y Comportamiento del Bot
- Nombre del bot (default: "Ori")
- Upload de avatar → Supabase Storage bucket `avatars`
- Editor de mensaje de bienvenida (ES + EN por separado)
- Editor de system prompt (texto completo, editable en vivo)
- Editor de respuestas rápidas (agregar/remover/reordenar botones del widget)
- Editor de mensaje fallback + input de número/link de WhatsApp
- Configuración de horario laboral (timezone + schedule)
- Editor de mensaje fuera de horario

### Sección: Knowledge Base
- Lista de URLs de crawl con: estado, última fecha de crawl, páginas indexadas, acciones (re-crawl, eliminar)
- Agregar / eliminar URLs sin cambios de código
- Subir documentos (PDF, TXT, DOCX) → Supabase Storage
- Navegar todos los chunks indexados: fuente, preview del contenido, opción de eliminar
- Indicador de "frescura": destacar URLs no crawleadas en más de 7 días
- Estado de crawl en **tiempo real** via Supabase Realtime

### Sección: Personalización del Widget y Embed
- Color picker: color primario, background, texto
- Posición del widget: bottom-right / bottom-left
- Ancho y alto del panel de chat (px)
- Toggle: mostrar/ocultar footer "Powered by"
- Toggle: habilitar/deshabilitar botones 👍👎
- Lista de dominios aprobados (whitelist)
- **Preview en vivo del widget** (renderizado en iframe)
- Código de embed generado (copiar al clipboard):
  ```html
  <script src="https://yourdomain.com/widget.js" data-bot-id="YOUR_BOT_ID"></script>
  ```

### Sección: Dashboard de Analytics
- Total de conversaciones (hoy / esta semana / este mes)
- Total de leads capturados
- Tasa de fallback: % de conversaciones donde Ori no pudo responder
- Preguntas más frecuentes (word cloud o lista rankeada)
- Largo promedio de conversación
- Tasa de satisfacción 👍👎 por período
- Tiempo de respuesta promedio
- **Actualización en tiempo real** via Supabase Realtime

### Sección: Conversaciones y Leads
- Historial completo de conversaciones con búsqueda y filtro por fecha
- Cada conversación muestra: session ID, fecha, idioma, mensajes, lead capturado (S/N)
- Tabla de leads: nombre, email, WhatsApp, fecha, conversación asociada
- Botón exportar leads a CSV

### Sección: Integraciones
- Input de Webhook URL → POST datos del lead a Integro Suite CRM al capturar nuevo lead
- Toggle de notificación por email + email destinatario para nuevos leads
- Botón de test webhook

---

## MÓDULO 4 — COMPORTAMIENTO DE ORI

System prompt (editable desde admin panel, este es el default):

```
Eres Ori, el asistente virtual oficial de Integro Suite, una plataforma CRM
para negocios en Colombia y Latinoamérica.

TONO: Amigable, conversacional y profesional. Como un colega conocedor
que explica las cosas claramente sin jerga innecesaria. Usa emojis
ocasionalmente para mantener la conversación cálida, pero sin exagerar.

IDIOMA: Auto-detecta el idioma del usuario (español o inglés) y siempre
responde en el mismo idioma que usan.

CONOCIMIENTO: Responde SOLO basándote en el contexto recuperado proporcionado.
Nunca inventes características, precios o procedimientos.

CAPTURA DE LEADS: Cuando un usuario tiene un problema sin resolver,
pregunta naturalmente por: nombre, email y WhatsApp. Ejemplo:
'¿Me compartes tu nombre y un WhatsApp para que nuestro equipo
te dé seguimiento personalizado?'

FALLBACK: Si no puedes encontrar la respuesta, sé honesto y redirige
al soporte por WhatsApp.

RESTRICCIONES:
- Nunca menciones o compares con competidores
- Nunca des precios exactos — redirige al equipo de ventas
- Nunca prometas funciones futuras o no lanzadas
- Nunca respondas preguntas fuera de tema — redirige amablemente

MENSAJE DE BIENVENIDA (ES): '¡Hola! 👋 Soy Ori, tu asistente de
Integro Suite. ¿En qué te puedo ayudar hoy?'

MENSAJE DE BIENVENIDA (EN): 'Hi! 👋 I'm Ori, Integro Suite's assistant.
How can I help you today?'
```

---

## VARIABLES DE ENTORNO

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...                    # clave pública para el widget
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # clave privada para el backend (nunca en frontend)

# OpenAI (se ingresa desde el admin panel UI, se almacena encriptado en ai_config)
OPENAI_API_KEY=

# Seguridad
ENCRYPTION_KEY=                              # para encriptar/desencriptar la API key de OpenAI
ADMIN_SECRET=                                # legacy, reemplazado por Supabase Auth

# Integraciones opcionales
WEBHOOK_URL=                                 # Integro Suite CRM webhook
```

---

## SEGURIDAD

- OpenAI API key almacenada **encriptada** server-side, NUNCA enviada al frontend
- Todos los endpoints `/admin` protegidos por **Supabase Auth** (RLS + JWT)
- Rate limiting: máx 20 mensajes/minuto por IP
- Domain whitelist del widget aplicada server-side
- Sanitización de input en todos los mensajes del usuario
- **Row Level Security (RLS)** en todas las tablas de Supabase
- Service Role Key solo en el backend, nunca expuesta
- Supabase Storage con policies por bucket

---

## WORKFLOW DE DESARROLLO EN ANTIGRAVITY

### Fase 1: Diseño en Stitch
1. Abrir stitch.withgoogle.com
2. Crear proyecto "Ori Admin Panel"
3. Diseñar cada pantalla con los prompts proporcionados arriba
4. Generar variantes mobile/desktop
5. Refinar iterativamente con el chat de Stitch

### Fase 2: Setup en Antigravity
1. Abrir Google Antigravity
2. Crear nuevo workspace para el proyecto
3. Configurar Supabase CLI
4. Crear tres agentes:
   - `backend-agent`: "Build the RAG backend with Node.js, Express, Crawlee, and Supabase client"
   - `admin-agent`: "Build React admin panel using Stitch designs, convert to Tailwind components"
   - `widget-agent`: "Build embeddable Shadow DOM chat widget in vanilla JS"

### Fase 3: Base de Datos
1. Crear proyecto en Supabase
2. Habilitar extensión pgvector
3. Ejecutar las migraciones SQL de arriba
4. Configurar RLS policies
5. Crear Storage buckets (avatars, documents, exports)
6. Configurar Supabase Auth (email/password)

### Fase 4: Implementación (via Agentes de Antigravity)
1. Backend: API endpoints, crawler pipeline, embedding pipeline, búsqueda semántica
2. Admin Panel: componentes React desde código Stitch, conectar a Supabase
3. Widget: script vanilla JS, Shadow DOM, conexión a API de chat
4. Testing: agentes de Antigravity con Browser Preview para validación automática

### Fase 5: Deployment
1. Admin Panel → Vercel
2. Backend → Railway o Render
3. Widget JS → CDN (Vercel Edge / Cloudflare)
4. Base de datos → Supabase (ya en la nube)

---

## ENTREGABLES

1. Backend completo (Node.js/Express) con todos los endpoints API + Supabase client
2. Pipeline de Crawler + embedding
3. Widget embebible (single widget.js, Shadow DOM)
4. Admin panel (React + Tailwind, diseñado en Stitch)
5. Esquema de base de datos completo (migraciones SQL para Supabase)
6. README con setup completo, deploy y guía de configuración
7. .env.example con todas las variables documentadas
8. Proyecto de Stitch con todas las pantallas diseñadas
