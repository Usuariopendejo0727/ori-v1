# Reporte de Auditoría de Código — Ori v1

**Fecha:** 2026-03-05
**Repositorio:** ori-v1
**Stack:** Node.js (Express) + React (Vite) + Supabase + OpenAI

---

## 🔴 CRÍTICO (5 issues)

---

### [C-01] Clave de encriptación hardcodeada con valor por defecto predecible
**Archivo:** `server/index.js:43`
**Categoría:** Seguridad
**Descripción:** La clave de cifrado AES-256 tiene un fallback hardcodeado directamente en el código fuente público. Cualquier despliegue que no configure `ENCRYPTION_KEY` usará `'default-32-char-encryption-key!!'`, haciendo que la "encriptación" sea completamente reversible por cualquier atacante que lea el repositorio.

```js
// ACTUAL (VULNERABLE)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!!'
```

**Impacto:** Todas las API keys de OpenAI almacenadas en la base de datos pueden descifrarse trivialmente. Comprometimiento total de credenciales de clientes.

**Corrección:**
```js
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY env var is required')
```

---

### [C-02] CORS completamente abierto — todos los orígenes permitidos
**Archivo:** `server/index.js:24`
**Categoría:** Seguridad
**Descripción:** `app.use(cors())` sin configuración permite peticiones desde cualquier origen a todos los endpoints, incluyendo los endpoints admin y de chat. No hay lista blanca de dominios permitidos en la capa CORS del servidor.

```js
// ACTUAL (VULNERABLE)
app.use(cors())
```

**Impacto:** Cualquier sitio web malicioso puede hacer peticiones autenticadas al API backend si un admin está logueado, facilitando ataques CSRF.

**Corrección:**
```js
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
}))
```

---

### [C-03] API Key de OpenAI guardada SIN cifrar desde el frontend
**Archivos:** `src/pages/ApiConfigPage.jsx:51-54`, `src/adapters/supabase-adapter.js:84-87`
**Categoría:** Seguridad / Bug lógico
**Descripción:** La página de configuración llama directamente a `upsertRow('ai_config', ...)` a través del cliente Supabase del frontend, saltándose completamente el servidor Express. Las funciones `encryptApiKey` y `decryptApiKey` del servidor **nunca se llaman al guardar**. La API key se almacena en texto plano en Supabase. El comentario en línea 104 del componente (`"La API key se almacena encriptada server-side. Nunca se expone en el frontend"`) es **falso**.

```js
// ApiConfigPage.jsx — guarda directo a Supabase sin pasar por el servidor
await upsertRow('ai_config', {
    ...config,
    org_id: orgId || config.org_id,
})
```

**Impacto:** La API key de OpenAI (alto valor económico) se almacena sin protección en Supabase, accesible a cualquier usuario con acceso a la tabla o con la anon key si RLS está mal configurado.

**Corrección:** Crear un endpoint POST `/admin/api-config` en el servidor que reciba la clave en texto plano, la encripte con `encryptApiKey()`, y luego la guarde en Supabase. El frontend debe llamar a ese endpoint en lugar de usar el adapter directamente.

---

### [C-04] `botId` ignorado al buscar `bot_settings` — IDOR potencial
**Archivo:** `server/index.js:148-153`
**Categoría:** Seguridad / Bug lógico
**Descripción:** El endpoint `/api/chat` recibe un `botId` del cliente pero cuando consulta `bot_settings`, lo ignora completamente y obtiene el primer registro con `.limit(1)`. Lo mismo ocurre en `/api/widget-config` (líneas 359-370) y `/api/leads` (líneas 287-291).

```js
// ACTUAL — botId recibido pero ignorado
const { message, sessionId, botId, language = 'es' } = req.body
// ...
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('*')
    .limit(1)        // ← botId completamente ignorado
    .single()
```

**Impacto:** En un sistema multi-tenant, cualquier `botId` (incluso falso) retornará la configuración del primer bot en la tabla. Permite acceder a configuraciones de otros clientes. También significa que la validación de dominio (`validateDomain`) filtra por `botId` pero los datos devueltos son de otro bot.

**Corrección:**
```js
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('id', botId)
    .single()
```

---

### [C-05] XSS en el widget — contenido no sanitizado insertado como innerHTML
**Archivo:** `widget/widget.js:474, 347, 350, 370, 384`
**Categoría:** Seguridad — XSS
**Descripción:** El contenido de los mensajes del bot se inserta directamente como HTML sin ningún tipo de escape o sanitización:

```js
// widget.js:474 — VULNERABLE
html += `<div class="ori-bubble">${m.content.replace(/\n/g, '<br>')}</div>`;
```

Adicionalmente, el nombre del bot y las respuestas rápidas (que provienen de la base de datos) también se inyectan en `innerHTML` sin escape:

```js
// Línea 347 — VULNERABLE
${avatarUrl ? `<img src="${avatarUrl}" alt="${botName}">` : botName.charAt(0)}
// Línea 350 — VULNERABLE
<div class="ori-hdr-name">${botName}</div>
// Línea 370 — VULNERABLE
${quickReplies.map(q => `<button class="ori-chip">${q}</button>`).join('')}
```

**Impacto:** Si un atacante compromete la base de datos o manipula las respuestas de OpenAI para incluir código HTML/JavaScript, puede ejecutar XSS en el navegador de cualquier usuario del widget. Permite robo de sesiones, keylogging, redirecciones maliciosas.

**Corrección:** Crear una función de escape HTML y usarla en todos los puntos:
```js
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
// Uso:
html += `<div class="ori-bubble">${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>`;
```

---

## 🟠 ALTO (5 issues)

---

### [A-01] Bypass total de la validación de dominio sin header `Origin`
**Archivo:** `server/index.js:113-114`
**Categoría:** Seguridad
**Descripción:** La función `validateDomain` retorna `true` automáticamente cuando no hay header `Origin`. Cualquier petición hecha desde un servidor, curl, Postman, o cualquier cliente no-browser puede usar el chat API sin estar en la lista de dominios aprobados.

```js
async function validateDomain(botId, origin) {
    if (!origin) return true // Allow server-to-server — BYPASS TOTAL
```

**Impacto:** La whitelist de dominios es completamente inútil para bloquear abusos de la API desde clientes no-browser. El rate limiter es la única defensa restante.

**Corrección:** Si la validación de dominio es importante para seguridad, se debe exigir una API key o secret adicional para peticiones server-to-server, en lugar de simplemente bypasear la validación.

---

### [A-02] Endpoint `/admin/crawl` retorna 401 siempre — falta el token JWT en el frontend
**Archivo:** `src/pages/KnowledgeBasePage.jsx:83-93`
**Categoría:** Bug de runtime
**Descripción:** El endpoint `/admin/crawl` está protegido por `authMiddleware` que requiere header `Authorization: Bearer <token>`, pero el frontend no lo incluye en la petición `fetch`:

```js
// KnowledgeBasePage.jsx:85 — falta Authorization header
const response = await fetch('/admin/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },  // ← sin Authorization
    body: JSON.stringify({ crawlUrlId: urlId }),
})
```

**Impacto:** El botón "Re-crawl" en la interfaz nunca funciona. Siempre retorna 401. La funcionalidad de crawl es completamente inutilizable desde la UI.

**Corrección:**
```js
const { data: { session } } = await supabase.auth.getSession()
const response = await fetch('/admin/crawl', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ crawlUrlId: urlId }),
})
```

---

### [A-03] Inserción de lead sin `org_id` cuando no hay `bot_settings`
**Archivo:** `server/index.js:287-298`
**Categoría:** Bug lógico / Runtime
**Descripción:** Si la tabla `bot_settings` está vacía, `botSettings` será `null`, `orgId` será `undefined`, y el lead se insertará sin `org_id`. No hay guard check antes del insert.

```js
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('org_id')
    .limit(1)
    .single()

const orgId = botSettings?.org_id  // puede ser undefined

// Sin validación — se inserta de todas formas
const { data: lead, error } = await supabase
    .from('leads')
    .insert({ org_id: orgId, ... })  // org_id: undefined
```

**Impacto:** Leads huérfanos en la base de datos sin organización asignada, pérdida de datos, posibles errores en dashboards y reportes.

**Corrección:**
```js
if (!botSettings?.org_id) {
    return res.status(500).json({ error: 'Configuración del bot no encontrada.' })
}
const orgId = botSettings.org_id
```

---

### [A-04] `message_count` de la sesión siempre incorrecto
**Archivo:** `server/index.js:239-245`
**Categoría:** Bug lógico
**Descripción:** El campo `message_count` se actualiza asignando un valor absoluto basado en `chatHistory.length + 2`, pero `chatHistory` está limitado a los últimos 10 mensajes. Para conversaciones de más de 10 mensajes, el conteo nunca superará 12.

```js
// chatHistory tiene máximo 10 elementos (por .limit(10))
const { data: recentMessages } = await supabase
    .from('chat_messages')
    .limit(10)

await supabase.from('chat_sessions').update({
    message_count: chatHistory.length + 2,  // máximo 12, nunca refleja el total real
})
```

**Impacto:** Las métricas del dashboard muestran datos incorrectos. Las conversaciones largas aparecen con conteos truncados en la tabla de "Conversaciones recientes".

**Corrección:** Usar un incremento en lugar de valor absoluto:
```js
// Opción A: incremento con RPC
await supabase.rpc('increment_message_count', { session_id: currentSessionId })
// Opción B: subquery o counter separado
```

---

### [A-05] SSRF en endpoint de webhook — URL arbitraria sin validación
**Archivo:** `server/index.js:322-331`
**Categoría:** Seguridad — SSRF
**Descripción:** En el endpoint `/api/leads`, el servidor realiza una petición HTTP a la URL de webhook configurada por el usuario sin ninguna validación. Un atacante puede configurar una URL apuntando a servicios internos (metadata de cloud, bases de datos, etc.).

```js
const webhookResponse = await fetch(integrationConfig.webhook_url, {  // URL no validada
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
})
```

**Impacto:** Server-Side Request Forgery (SSRF). En entornos cloud, permite acceder a `http://169.254.169.254/` (metadata de AWS/GCP/Azure), servicios internos de red, o actuar como proxy para ataques externos.

**Corrección:**
```js
function isAllowedWebhookUrl(url) {
    try {
        const parsed = new URL(url)
        const blockedHosts = ['169.254.169.254', 'metadata.google.internal', 'localhost', '127.0.0.1']
        if (!['http:', 'https:'].includes(parsed.protocol)) return false
        if (blockedHosts.some(h => parsed.hostname === h)) return false
        // Bloquear IPs privadas
        return true
    } catch { return false }
}
if (!isAllowedWebhookUrl(integrationConfig.webhook_url)) {
    console.warn('[Webhook] URL bloqueada:', integrationConfig.webhook_url)
    return
}
```

---

## 🟡 MEDIO (8 issues)

---

### [M-01] Supabase inicializado con strings vacíos si faltan variables de entorno
**Archivos:** `server/index.js:19-22`, `src/adapters/supabase-adapter.js:15`
**Categoría:** Error de configuración / Runtime
**Descripción:** Si las variables de entorno no están configuradas, Supabase se inicializa con strings vacíos sin lanzar error. Todas las operaciones de BD fallarán silenciosamente en runtime.

```js
const supabase = createClient(
    process.env.SUPABASE_URL || '',             // sin validación
    process.env.SUPABASE_SERVICE_ROLE_KEY || '' // sin validación
)
```

**Corrección:** Validar al inicio del servidor:
```js
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ENCRYPTION_KEY']
for (const v of requiredEnvVars) {
    if (!process.env[v]) throw new Error(`Missing required env var: ${v}`)
}
```

---

### [M-02] `chunkText` puede entrar en bucle infinito si `overlap >= chunkSize`
**Archivo:** `server/index.js:617-629`
**Categoría:** Bug de runtime — Loop infinito
**Descripción:** Si `overlap >= chunkSize`, `currentIndex += chunkSize - overlap` resulta en incremento 0 o negativo, causando un bucle infinito que bloquea el event loop de Node.js.

```js
function chunkText(text, chunkSize = 500, overlap = 50) {
    while (currentIndex < words.length) {
        chunks.push(chunk)
        currentIndex += chunkSize - overlap  // ← 0 o negativo si overlap >= chunkSize
    }
}
```

**Impacto:** El servidor se bloquea permanentemente si se llama con parámetros incorrectos. Actualmente se llama con valores fijos seguros (500, 50) pero la función es insegura por diseño.

**Corrección:**
```js
function chunkText(text, chunkSize = 500, overlap = 50) {
    if (overlap >= chunkSize) throw new Error('overlap must be less than chunkSize')
    // ...
}
```

---

### [M-03] `selectedModel` declarado pero nunca utilizado
**Archivo:** `src/pages/ApiConfigPage.jsx:64`
**Categoría:** Código muerto
**Descripción:** La variable `selectedModel` se computa pero nunca se usa en el JSX ni en ninguna otra parte del componente.

```js
const selectedModel = MODELS.find(m => m.id === config.model) || MODELS[1]
// selectedModel nunca se referencia después
```

**Impacto:** Código muerto que confunde la lectura. Potencialmente el desarrollador quería mostrar información de pricing del modelo seleccionado pero lo olvidó.

---

### [M-04] Exportación CSV sin escapado — datos corruptos con comas o saltos de línea
**Archivo:** `src/pages/ConversationsPage.jsx:37-46`
**Categoría:** Bug lógico
**Descripción:** La exportación CSV une campos con `,` sin escapar comillas ni comas dentro de los valores. Nombres o emails con comas (ej: `"García, Juan"`) o saltos de línea corrompen el archivo CSV.

```js
const rows = leadsList.map(l => [l.name || '', l.email || '', ...])
const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')  // sin escape
```

**Corrección:**
```js
function csvEscape(val) {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}
const csvContent = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
```

---

### [M-05] Cálculo innecesario y potencialmente rompible en fallback rate
**Archivo:** `src/pages/DashboardPage.jsx:67-69`
**Categoría:** Bug lógico / Performance
**Descripción:** Se usa `JSON.parse(JSON.stringify(m.sources))` para verificar si un array está vacío. Esto crea una copia profunda innecesaria en cada iteración y falla si `m.sources` no es serializable.

```js
// ACTUAL — innecesario y potencialmente buggy
const fallbackCount = messages.filter(m =>
    m.role === 'assistant' && m.sources && JSON.parse(JSON.stringify(m.sources)).length === 0
).length
```

**Corrección:**
```js
const fallbackCount = messages.filter(m =>
    m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length === 0
).length
```

---

### [M-06] Race condition entre `getCurrentUser` y `onAuthStateChange`
**Archivo:** `src/hooks/useAuth.jsx:10-21`
**Categoría:** Bug de estado / Race condition
**Descripción:** Se llama a `getCurrentUser()` asíncronamente y en paralelo se registra `onAuthStateChange`. Supabase dispara `INITIAL_SESSION` inmediatamente en `onAuthStateChange`, pudiendo sobreescribir el resultado de `getCurrentUser()` o viceversa en un orden impredecible.

```js
// Ambas operaciones corren en paralelo sin coordinación
getCurrentUser()
    .then((currentUser) => setUser(currentUser))  // puede llegar después de onAuthStateChange
    .finally(() => setIsLoading(false))

const { data: { subscription } } = onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null)  // puede ejecutarse antes o después
})
```

**Impacto:** Parpadeo del estado de auth, posible redirección incorrecta a `/login` durante el inicio.

**Corrección:** Confiar únicamente en `onAuthStateChange` para inicializar el estado, y usar el evento `INITIAL_SESSION` para terminar el loading:
```js
useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
        setUser(session?.user ?? null)
        if (event === 'INITIAL_SESSION') setIsLoading(false)
    })
    return () => subscription.unsubscribe()
}, [])
```

---

### [M-07] `document.currentScript` es null en scripts async/defer
**Archivo:** `widget/widget.js:9-10`
**Categoría:** Bug de runtime
**Descripción:** `document.currentScript` es `null` cuando el script se carga con `async` o `defer`. El optional chaining `?.` evita el crash, pero `BOT_ID` queda como string vacío, causando que todas las peticiones al API fallen silenciosamente o usen un botId incorrecto.

```js
const SCRIPT_TAG = document.currentScript;  // null con async/defer
const BOT_ID = SCRIPT_TAG?.getAttribute('data-bot-id') || '';  // '' — bug silencioso
```

**Impacto:** El widget no funciona si se carga con `<script async>` o `<script defer>`, lo que es una práctica común de optimización de rendimiento.

---

### [M-08] Funcionalidad de subir documentos no implementada (UI engañosa)
**Archivo:** `src/pages/KnowledgeBasePage.jsx:229`
**Categoría:** Código muerto / UX
**Descripción:** El botón "Subir archivo" muestra un input que acepta `.pdf,.txt,.docx` pero el handler es un comentario TODO:

```jsx
<input type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={() => {/* TODO: upload handler */ }} />
```

**Impacto:** Los usuarios intentan subir documentos sin recibir ningún feedback de error. La funcionalidad de la knowledge base queda incompleta.

---

## 🔵 BAJO (4 issues)

---

### [B-01] Gráficas del dashboard muestran datos hardcodeados, no datos reales
**Archivo:** `src/pages/DashboardPage.jsx:75-83`
**Categoría:** Bug lógico
**Descripción:** Los gráficos de "Conversaciones esta semana" y "Leads capturados" muestran datos ficticios hardcodeados en lugar de datos reales de la base de datos.

```js
// "Mock chart data (real data would come from aggregations)"
const chartData = [
    { name: 'Lun', conversations: 12, leads: 3 },
    { name: 'Mar', conversations: 19, leads: 5 },
    // ...
]
```

**Impacto:** Métricas engañosas en producción. Los usuarios toman decisiones basadas en datos falsos.

---

### [B-02] Crawl de URLs no normaliza query strings — contenido duplicado
**Archivo:** `server/index.js:523-530`
**Categoría:** Bug lógico
**Descripción:** El crawler solo elimina el fragment (`#`) pero no normaliza query parameters. URLs como `https://example.com/page?ref=google` y `https://example.com/page?utm_source=newsletter` se crawlean como páginas separadas aunque tengan el mismo contenido.

**Impacto:** Chunks duplicados en la knowledge base, mayor consumo de tokens de embedding, respuestas redundantes del bot.

---

### [B-03] Typo en nombre de variable — `positveFeedback` (falta 'i')
**Archivo:** `src/pages/DashboardPage.jsx:61`
**Categoría:** Código — calidad
**Descripción:** Typo menor que, aunque no causa bug funcional, dificulta la lectura y mantenimiento.

```js
const positveFeedback = messages.filter(m => m.feedback === 'positive').length
//    ↑ debería ser: positiveFeedback
```

---

### [B-04] Embed code usa `yourdomain.com` hardcodeado — debe ser dinámico
**Archivo:** `src/pages/WidgetCustomizerPage.jsx:77`
**Categoría:** Bug lógico
**Descripción:** El código de embed muestra una URL de ejemplo que los usuarios deben reemplazar manualmente. No hay guía de qué URL usar.

```js
const embedCode = `<script src="https://yourdomain.com/widget.js" data-bot-id="${widgetConfig.id || 'YOUR_BOT_ID'}"></script>`
```

**Impacto:** Los usuarios copian el código sin reemplazar la URL placeholder y el widget no funciona en producción.

---

## 📊 Resumen Ejecutivo

| Severidad | Cantidad | Issues |
|-----------|----------|--------|
| 🔴 Crítico | 5 | C-01 a C-05 |
| 🟠 Alto | 5 | A-01 a A-05 |
| 🟡 Medio | 8 | M-01 a M-08 |
| 🔵 Bajo | 4 | B-01 a B-04 |
| **Total** | **22** | |

### Archivos más problemáticos

| Archivo | Issues | Severidades |
|---------|--------|-------------|
| `server/index.js` | 10 | C-01, C-02, C-04, A-03, A-04, A-05, M-01, M-02, M-07(relacionado), B-02 |
| `widget/widget.js` | 3 | C-05, M-07, (relacionado B-04) |
| `src/pages/KnowledgeBasePage.jsx` | 2 | A-02, M-08 |
| `src/pages/ApiConfigPage.jsx` | 2 | C-03, M-03 |
| `src/pages/DashboardPage.jsx` | 3 | M-05, B-01, B-03 |
| `src/pages/ConversationsPage.jsx` | 1 | M-04 |
| `src/hooks/useAuth.jsx` | 1 | M-06 |

### Prioridades de acción inmediata

1. **[C-03]** La API key de OpenAI se guarda sin cifrar — pérdida económica directa
2. **[C-01]** Clave de cifrado hardcodeada — todas las keys existentes comprometidas
3. **[C-05]** XSS en el widget — afecta a todos los usuarios finales del chat
4. **[C-04]** botId ignorado — rompe el modelo de datos multi-tenant
5. **[A-02]** Crawl nunca funciona desde la UI — funcionalidad core rota
6. **[C-02]** CORS abierto — precondición para ataques CSRF
