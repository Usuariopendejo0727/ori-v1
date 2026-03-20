# Prompts de Correccion de Bugs — Ori v1

Cada seccion contiene un prompt independiente y autocontenido para que un agente de IA (Antigravity u otro) pueda corregir el bug sin contexto adicional.

---

## CRITICO

---

### PROMPT C-01: Clave de encriptacion hardcodeada con fallback predecible

```
Eres un ingeniero de seguridad backend. Corrige la siguiente vulnerabilidad critica en server/index.js.

PROBLEMA:
En la linea 43 de server/index.js, la clave de cifrado AES-256 tiene un valor por defecto hardcodeado:

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!!'

Esto significa que si la variable de entorno ENCRYPTION_KEY no esta configurada, todas las API keys cifradas en la base de datos pueden descifrarse trivialmente por cualquiera que lea el codigo fuente. Es un compromiso total de credenciales.

CORRECCION REQUERIDA:
1. Elimina el valor por defecto de ENCRYPTION_KEY en la linea 43.
2. Agrega una validacion al inicio del servidor (antes de que Express empiece a escuchar) que lance un error fatal si ENCRYPTION_KEY no esta definida o tiene menos de 32 caracteres.
3. Agrega validaciones similares para SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (lineas 20-21 que actualmente tienen fallback a string vacio '').

El codigo actual de las lineas 19-22 es:
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

El resultado debe ser:
// Validacion de variables de entorno requeridas
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ENCRYPTION_KEY']
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error('FATAL: La variable de entorno ' + varName + ' es requerida.')
        process.exit(1)
    }
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (ENCRYPTION_KEY.length < 32) {
    console.error('FATAL: ENCRYPTION_KEY debe tener al menos 32 caracteres.')
    process.exit(1)
}

Y para Supabase:
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 19-22 y linea 43)

NO modifiques ningun otro archivo ni funcionalidad. Solo corrige esta vulnerabilidad.
```

---

### PROMPT C-02: CORS completamente abierto en el servidor Express

```
Eres un ingeniero de seguridad backend. Corrige la siguiente vulnerabilidad de CORS en server/index.js.

PROBLEMA:
En la linea 24 de server/index.js, el middleware CORS esta configurado sin restricciones:

app.use(cors())

Esto permite que CUALQUIER sitio web en internet haga peticiones al backend, incluyendo endpoints admin protegidos. Facilita ataques CSRF si un admin esta logueado.

CORRECCION REQUERIDA:
Reemplaza app.use(cors()) en la linea 24 con una configuracion que use una lista de origenes permitidos desde una variable de entorno llamada ALLOWED_ORIGINS que acepte multiples origenes separados por coma. Si ALLOWED_ORIGINS no esta definida, usar ['http://localhost:5173'] como fallback solo para desarrollo.

El resultado debe ser:
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173']

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('No permitido por CORS'))
        }
    },
    credentials: true,
}))

ARCHIVOS A MODIFICAR:
- server/index.js (linea 24)

NO modifiques ningun otro archivo ni funcionalidad.
```

---

### PROMPT C-03: API Key de OpenAI guardada sin cifrar desde el frontend

```
Eres un ingeniero fullstack. Corrige la siguiente vulnerabilidad critica donde la API key de OpenAI se almacena sin cifrar en Supabase.

PROBLEMA:
El archivo src/pages/ApiConfigPage.jsx guarda la configuracion de AI directamente a Supabase usando upsertRow('ai_config', ...) (lineas 51-54), lo cual bypasea completamente las funciones encryptApiKey() y decryptApiKey() del servidor (server/index.js lineas 56-62). La API key se almacena EN TEXTO PLANO en la tabla ai_config. El comentario de la linea 104 que dice "La API key se almacena encriptada server-side" es FALSO.

El codigo actual en src/pages/ApiConfigPage.jsx lineas 47-62:
async function handleSave() {
    setIsSaving(true)
    setSaveStatus(null)
    try {
        await upsertRow('ai_config', {
            ...config,
            org_id: orgId || config.org_id,
        })
        setSaveStatus('success')
        setTimeout(() => setSaveStatus(null), 3000)
    } catch (saveError) {
        setSaveStatus('error')
    } finally {
        setIsSaving(false)
    }
}

CORRECCION REQUERIDA:

Paso 1 — Crear un endpoint en el servidor (server/index.js):
Agrega un nuevo endpoint POST /admin/ai-config protegido por authMiddleware que:
1. Reciba el body con los campos de ai_config (openai_api_key, model, temperature, max_tokens, org_id).
2. Si openai_api_key viene incluida y no esta vacia, la cifre usando encryptApiKey() antes de guardarla en el campo openai_api_key_encrypted.
3. Haga upsert en la tabla ai_config con la key cifrada.
4. Retorne success sin incluir la key en la respuesta.

Agrega tambien un endpoint GET /admin/ai-config que retorne la config SIN la key:
app.get('/admin/ai-config', authMiddleware, async (req, res) => {
    try {
        const { data } = await supabase
            .from('ai_config')
            .select('model, temperature, max_tokens, org_id')
            .limit(1)
            .single()
        res.json(data || { model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 800 })
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuracion.' })
    }
})

Paso 2 — Modificar el frontend (src/pages/ApiConfigPage.jsx):
1. Reemplaza handleSave para que haga fetch('/admin/ai-config', ...) en lugar de upsertRow.
2. Importa getSupabaseClient del adapter para obtener el token JWT.
3. Separa el campo de la API key del resto del estado. Crea un campo separado apiKeyInput para el input del usuario.
4. Actualiza loadConfig para usar el nuevo endpoint GET.
5. Corrige el comentario de la linea 104.
6. El input de la API key debe mostrar un placeholder como "sk-...••••" cuando ya hay una key guardada.

ARCHIVOS A MODIFICAR:
- server/index.js (agregar endpoints POST y GET /admin/ai-config)
- src/pages/ApiConfigPage.jsx (cambiar handleSave, loadConfig, y separar el campo de API key)
```

---

### PROMPT C-04: botId ignorado en todas las consultas a bot_settings

```
Eres un ingeniero backend. Corrige el siguiente bug critico de aislamiento de datos en server/index.js.

PROBLEMA:
Los endpoints /api/chat, /api/leads y /api/widget-config reciben un parametro botId del cliente pero cuando consultan las tablas bot_settings y widget_config, lo ignoran completamente y simplemente obtienen el primer registro con .limit(1). En un sistema multi-tenant, esto significa que TODOS los bots retornan la configuracion del primer bot en la base de datos.

Hay 3 puntos exactos que deben corregirse:

1. /api/chat — lineas 148-152:
ACTUAL (BUGGY):
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('*')
    .limit(1)
    .single()

CORREGIDO:
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('id', botId)
    .single()

2. /api/leads — lineas 287-291:
ACTUAL (BUGGY):
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('org_id')
    .limit(1)
    .single()

Debes agregar botId al destructuring del body en la linea 280:
const { name, email, whatsapp, sessionId, botId } = req.body

Y corregir la query:
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('org_id')
    .eq('id', botId)
    .single()

3. /api/widget-config — lineas 359-369:
ACTUAL (BUGGY):
const { botId } = req.query

const { data: widgetConfig } = await supabase
    .from('widget_config')
    .select('*')
    .limit(1)
    .single()

const { data: botSettings } = await supabase
    .from('bot_settings')
    .select(...)
    .limit(1)
    .single()

CORREGIDO:
const { botId } = req.query
if (!botId) return res.status(400).json({ error: 'botId es requerido.' })

const { data: widgetConfig } = await supabase
    .from('widget_config')
    .select('*')
    .eq('id', botId)
    .single()

const { data: botSettings } = await supabase
    .from('bot_settings')
    .select(...)
    .eq('id', botId)
    .single()

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 148-152, 280 y 287-291, 357-369)

NO modifiques ningun otro endpoint ni archivo.
```

---

### PROMPT C-05: XSS en el widget por contenido no sanitizado insertado como innerHTML

```
Eres un ingeniero de seguridad frontend. Corrige la siguiente vulnerabilidad XSS en widget/widget.js.

PROBLEMA:
El widget de chat inyecta contenido directamente en innerHTML sin ningun escape HTML en multiples puntos. Si el modelo de IA genera HTML malicioso, o si un atacante manipula las respuestas, puede ejecutar JavaScript arbitrario en el navegador de los usuarios finales.

Puntos vulnerables en widget/widget.js:
- Linea 474: m.content insertado sin sanitizar en ori-bubble
- Linea 347: avatarUrl y botName sin escapar en img src y alt
- Linea 350: botName como HTML directo en ori-hdr-name
- Linea 370: quickReplies sin sanitizar en botones ori-chip
- Linea 473: botName.charAt(0) sin sanitizar en ori-msg-ava
- Linea 476: m.id sin sanitizar en data-id del feedback
- Linea 481: botName.charAt(0) en typing indicator

CORRECCION REQUERIDA:

1. Agrega dos funciones de escape al inicio de la IIFE (despues de la linea 18):

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str != null ? str : '');
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str != null ? str : '')
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

2. Aplica escapeHtml y escapeAttr en cada punto vulnerable:

Linea 347: usar escapeAttr para src y alt del img, escapeHtml para el charAt(0)
Linea 350: usar escapeHtml para botName
Linea 370: usar escapeHtml para cada quick reply
Linea 473: usar escapeHtml para botName.charAt(0)
Linea 474: usar escapeHtml(m.content).replace(/\n/g, '<br>') en lugar de m.content.replace(...)
Linea 476: usar escapeAttr para m.id en data-id
Linea 481: usar escapeHtml para botName.charAt(0)
Linea 384: usar escapeAttr para el placeholder del textarea

ARCHIVOS A MODIFICAR:
- widget/widget.js

NO modifiques estilos, logica de negocio, ni ningun otro archivo. Solo agrega las funciones de escape y aplicalas en todos los puntos donde se inyecta contenido dinamico en HTML.
```

---

## ALTO

---

### PROMPT A-01: Bypass total de validacion de dominio sin header Origin

```
Eres un ingeniero de seguridad backend. Corrige la siguiente vulnerabilidad en server/index.js.

PROBLEMA:
En la linea 114 de server/index.js, la funcion validateDomain retorna true automaticamente cuando no hay header Origin:

async function validateDomain(botId, origin) {
    if (!origin) return true // Allow server-to-server

Cualquier peticion sin Origin (curl, Postman, bots) bypasea la whitelist de dominios.

El codigo completo de la funcion (lineas 113-127):
async function validateDomain(botId, origin) {
    if (!origin) return true
    const { data: config } = await supabase
        .from('widget_config')
        .select('approved_domains')
        .eq('id', botId)
        .single()
    if (!config || !config.approved_domains || config.approved_domains.length === 0) return true
    const originHostname = new URL(origin).hostname
    return config.approved_domains.some(domain =>
        originHostname === domain || originHostname.endsWith('.' + domain)
    )
}

CORRECCION REQUERIDA:
Modifica la funcion para que si hay dominios aprobados configurados Y no hay origin, rechace la peticion. Si NO hay dominios configurados, permita todo (modo abierto para desarrollo):

async function validateDomain(botId, origin) {
    const { data: config } = await supabase
        .from('widget_config')
        .select('approved_domains')
        .eq('id', botId)
        .single()
    if (!config || !config.approved_domains || config.approved_domains.length === 0) return true
    if (!origin) return false
    try {
        const originHostname = new URL(origin).hostname
        return config.approved_domains.some(domain =>
            originHostname === domain || originHostname.endsWith('.' + domain)
        )
    } catch {
        return false
    }
}

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 113-127)
```

---

### PROMPT A-02: El boton Re-crawl siempre falla con 401 por falta de token JWT

```
Eres un ingeniero frontend React. Corrige el siguiente bug en src/pages/KnowledgeBasePage.jsx.

PROBLEMA:
La funcion handleTriggerCrawl (lineas 83-93) hace fetch al endpoint /admin/crawl sin incluir el header Authorization con el token JWT. El endpoint esta protegido por authMiddleware que exige Authorization: Bearer <token>. Resultado: SIEMPRE retorna 401.

Codigo actual (lineas 83-93):
async function handleTriggerCrawl(urlId) {
    try {
        const response = await fetch('/admin/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crawlUrlId: urlId }),
        })
        if (!response.ok) throw new Error('Crawl failed')
        await loadCrawlUrls()
    } catch (err) { console.error(err) }
}

CORRECCION REQUERIDA:
1. Agrega getSupabaseClient al import de la linea 2:
ACTUAL: import { fetchRows, insertRow, deleteRow, subscribeToTable } from '../adapters/supabase-adapter'
NUEVO: import { fetchRows, insertRow, deleteRow, subscribeToTable, getSupabaseClient } from '../adapters/supabase-adapter'

2. Modifica handleTriggerCrawl:
async function handleTriggerCrawl(urlId) {
    try {
        const { data: { session } } = await getSupabaseClient().auth.getSession()
        const response = await fetch('/admin/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session?.access_token,
            },
            body: JSON.stringify({ crawlUrlId: urlId }),
        })
        if (!response.ok) throw new Error('Crawl failed')
        await loadCrawlUrls()
    } catch (err) { console.error(err) }
}

ARCHIVOS A MODIFICAR:
- src/pages/KnowledgeBasePage.jsx (linea 2 para imports, lineas 83-93 para la funcion)
```

---

### PROMPT A-03: Lead insertado sin org_id cuando no hay bot_settings

```
Eres un ingeniero backend. Corrige el siguiente bug en server/index.js.

PROBLEMA:
En las lineas 287-298 del endpoint /api/leads, si la tabla bot_settings esta vacia, botSettings sera null, orgId sera undefined, y el lead se inserta sin org_id. No hay validacion antes del insert.

Codigo actual (lineas 286-301):
const { data: botSettings } = await supabase
    .from('bot_settings')
    .select('org_id')
    .limit(1)
    .single()
const orgId = botSettings?.org_id
const { data: lead, error } = await supabase
    .from('leads')
    .insert({ org_id: orgId, session_id: sessionId, name, email, whatsapp })
    .select()
    .single()

CORRECCION REQUERIDA:
Agrega una validacion despues de obtener orgId:

const orgId = botSettings?.org_id

if (!orgId) {
    return res.status(500).json({ error: 'Configuracion del bot no encontrada. No se puede capturar el lead.' })
}

ARCHIVOS A MODIFICAR:
- server/index.js (entre lineas 293 y 296)
```

---

### PROMPT A-04: message_count siempre incorrecto para conversaciones largas

```
Eres un ingeniero backend. Corrige el siguiente bug en server/index.js.

PROBLEMA:
En las lineas 239-245 del endpoint /api/chat, message_count se asigna como chatHistory.length + 2. Pero chatHistory esta limitado a 10 mensajes (.limit(10) en linea 186). Para conversaciones de mas de 10 mensajes, message_count nunca superara 12.

Codigo del historial (lineas 181-186):
const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', currentSessionId)
    .order('created_at', { ascending: false })
    .limit(10)

Codigo de la actualizacion (lineas 239-245):
await supabase
    .from('chat_sessions')
    .update({
        last_message_at: new Date().toISOString(),
        message_count: chatHistory.length + 2,
    })
    .eq('session_id', currentSessionId)

CORRECCION REQUERIDA:
Reemplaza con un conteo real de mensajes:

const { count: realMessageCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', currentSessionId)

await supabase
    .from('chat_sessions')
    .update({
        last_message_at: new Date().toISOString(),
        message_count: realMessageCount || 0,
    })
    .eq('session_id', currentSessionId)

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 238-245)

NO modifiques el .limit(10) del historial (es correcto para el contexto de OpenAI).
```

---

### PROMPT A-05: SSRF en endpoint de webhook — URL arbitraria sin validacion

```
Eres un ingeniero de seguridad backend. Corrige la siguiente vulnerabilidad SSRF en server/index.js.

PROBLEMA:
En las lineas 320-330 del endpoint /api/leads, el servidor hace fetch a la URL de webhook configurada por el usuario sin ninguna validacion. Un atacante puede apuntar la URL a servicios internos como http://169.254.169.254/ (metadata de AWS/GCP/Azure).

Codigo actual (lineas 320-330):
if (integrationConfig?.webhook_url) {
    try {
        const webhookResponse = await fetch(integrationConfig.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({...}),
        })

CORRECCION REQUERIDA:
1. Agrega una funcion isAllowedWebhookUrl despues de la linea 127 (junto a los otros helpers):

function isAllowedWebhookUrl(url) {
    try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) return false
        const hostname = parsed.hostname
        const blockedHosts = [
            '169.254.169.254', 'metadata.google.internal',
            '100.100.100.200', 'localhost', '127.0.0.1', '::1', '0.0.0.0'
        ]
        if (blockedHosts.includes(hostname)) return false
        const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
        if (ipv4Match) {
            const [, a, b] = ipv4Match.map(Number)
            if (a === 10) return false
            if (a === 172 && b >= 16 && b <= 31) return false
            if (a === 192 && b === 168) return false
        }
        return true
    } catch { return false }
}

2. Modifica las lineas 320-321 para usar la validacion:

if (integrationConfig?.webhook_url) {
    if (!isAllowedWebhookUrl(integrationConfig.webhook_url)) {
        console.warn('[Webhook] URL bloqueada por politica de seguridad:', integrationConfig.webhook_url)
    } else {
        try {
            const webhookResponse = await fetch(integrationConfig.webhook_url, {
            // ...resto del codigo existente del try/catch del webhook
        }
    }
}

ARCHIVOS A MODIFICAR:
- server/index.js (agregar funcion helper y modificar lineas 320-341)
```

---

## MEDIO

---

### PROMPT M-01: Supabase del frontend inicializado con strings vacios

```
Eres un ingeniero frontend. Corrige el siguiente problema en src/adapters/supabase-adapter.js.

PROBLEMA:
En la linea 15, el cliente Supabase se inicializa con strings vacios si las variables de entorno no existen. Las lineas 11-13 tienen un console.warn pero la ejecucion continua con un cliente disfuncional.

Codigo actual (lineas 8-15):
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[SupabaseAdapter] Variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configuradas.')
}
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {

CORRECCION:
Reemplaza las lineas 11-13 con:

if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
    const msg = '[SupabaseAdapter] Variables de entorno faltantes: ' + missing.join(', ') + '. Crea un archivo .env con estas variables.'
    if (import.meta.env.DEV) {
        throw new Error(msg)
    }
    console.error(msg)
}

ARCHIVOS A MODIFICAR:
- src/adapters/supabase-adapter.js (lineas 11-13)
```

---

### PROMPT M-02: chunkText puede entrar en bucle infinito

```
Eres un ingeniero backend. Corrige el siguiente bug en server/index.js.

PROBLEMA:
La funcion chunkText (lineas 617-629) tiene un bug: si overlap >= chunkSize, currentIndex += chunkSize - overlap resulta en incremento 0 o negativo, causando bucle infinito que bloquea Node.js.

Codigo actual (lineas 617-629):
function chunkText(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/)
    const chunks = []
    let currentIndex = 0
    while (currentIndex < words.length) {
        const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ')
        chunks.push(chunk)
        currentIndex += chunkSize - overlap
    }
    return chunks
}

CORRECCION:
function chunkText(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    if (words.length === 0) return []
    if (overlap >= chunkSize) overlap = 0
    const chunks = []
    let currentIndex = 0
    const step = chunkSize - overlap
    while (currentIndex < words.length) {
        const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ')
        chunks.push(chunk)
        currentIndex += step
    }
    return chunks
}

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 617-629)
```

---

### PROMPT M-03: Variable selectedModel declarada pero nunca utilizada

```
Eres un ingeniero frontend. Elimina codigo muerto en src/pages/ApiConfigPage.jsx.

PROBLEMA:
En la linea 64, se declara selectedModel pero nunca se usa:
const selectedModel = MODELS.find(m => m.id === config.model) || MODELS[1]

CORRECCION:
Elimina la linea 64 completa.

ARCHIVOS A MODIFICAR:
- src/pages/ApiConfigPage.jsx (eliminar linea 64)
```

---

### PROMPT M-04: Exportacion CSV sin escape de caracteres especiales

```
Eres un ingeniero frontend React. Corrige el siguiente bug en src/pages/ConversationsPage.jsx.

PROBLEMA:
En las lineas 37-47 de exportLeadsCsv, los valores se unen con coma sin escapar comillas ni comas dentro de los datos. Si un nombre contiene comas (ej: "Garcia, Juan"), el CSV sera malformado.

Codigo actual (lineas 37-48):
function exportLeadsCsv() {
    const headers = ['Nombre', 'Email', 'WhatsApp', 'Session ID', 'Fecha']
    const rows = leadsList.map(l => [l.name || '', l.email || '', l.whatsapp || '', l.session_id || '', l.created_at || ''])
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leads-' + new Date().toISOString().split('T')[0] + '.csv'
    link.click()
    URL.revokeObjectURL(url)
}

CORRECCION:
function exportLeadsCsv() {
    function csvEscape(val) {
        const str = String(val != null ? val : '')
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
    }
    const headers = ['Nombre', 'Email', 'WhatsApp', 'Session ID', 'Fecha']
    const rows = leadsList.map(l => [l.name || '', l.email || '', l.whatsapp || '', l.session_id || '', l.created_at || ''])
    const csvContent = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leads-' + new Date().toISOString().split('T')[0] + '.csv'
    link.click()
    URL.revokeObjectURL(url)
}

ARCHIVOS A MODIFICAR:
- src/pages/ConversationsPage.jsx (lineas 37-48)
```

---

### PROMPT M-05: Deep clone innecesario para verificar array vacio

```
Eres un ingeniero frontend. Corrige el siguiente calculo en src/pages/DashboardPage.jsx.

PROBLEMA:
En las lineas 67-69, se usa JSON.parse(JSON.stringify(m.sources)) para verificar si un array esta vacio. Es innecesariamente costoso y puede fallar.

Codigo actual:
const fallbackCount = messages.filter(m =>
    m.role === 'assistant' && m.sources && JSON.parse(JSON.stringify(m.sources)).length === 0
).length

CORRECCION:
const fallbackCount = messages.filter(m =>
    m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length === 0
).length

ARCHIVOS A MODIFICAR:
- src/pages/DashboardPage.jsx (lineas 67-69)
```

---

### PROMPT M-06: Race condition entre getCurrentUser y onAuthStateChange

```
Eres un ingeniero frontend React. Corrige la siguiente race condition en src/hooks/useAuth.jsx.

PROBLEMA:
En las lineas 10-21, se llama a getCurrentUser() asincronamente y en paralelo se registra onAuthStateChange. Supabase dispara INITIAL_SESSION inmediatamente, causando que ambos compitan por setear user en orden impredecible.

Codigo actual (lineas 10-21):
useEffect(() => {
    getCurrentUser()
        .then((currentUser) => setUser(currentUser))
        .catch(() => setUser(null))
        .finally(() => setIsLoading(false))
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
}, [])

CORRECCION:
Elimina getCurrentUser y confia solo en onAuthStateChange:

useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
        setUser(session?.user ?? null)
        if (event === 'INITIAL_SESSION') {
            setIsLoading(false)
        }
    })
    return () => subscription.unsubscribe()
}, [])

Tambien actualiza el import de la linea 2:
ACTUAL: import { getCurrentUser, onAuthStateChange, signInWithEmail, signOut } from '../adapters/supabase-adapter'
NUEVO: import { onAuthStateChange, signInWithEmail, signOut } from '../adapters/supabase-adapter'

ARCHIVOS A MODIFICAR:
- src/hooks/useAuth.jsx (lineas 2 y 10-21)
```

---

### PROMPT M-07: document.currentScript es null con scripts async/defer

```
Eres un ingeniero frontend. Corrige el siguiente bug en widget/widget.js.

PROBLEMA:
En las lineas 9-11, se usa document.currentScript que es null cuando el script se carga con async o defer. BOT_ID queda como string vacio y el widget no funciona silenciosamente.

Codigo actual (lineas 9-11):
const SCRIPT_TAG = document.currentScript;
const BOT_ID = SCRIPT_TAG?.getAttribute('data-bot-id') || '';
const API_BASE = SCRIPT_TAG?.getAttribute('data-api-url') || window.location.origin;

CORRECCION:
const SCRIPT_TAG = document.currentScript || document.querySelector('script[data-bot-id]');
const BOT_ID = SCRIPT_TAG?.getAttribute('data-bot-id') || '';
const API_BASE = SCRIPT_TAG?.getAttribute('data-api-url') || window.location.origin;

if (!BOT_ID) {
    console.error('[Ori Widget] No se encontro data-bot-id en el script tag. El widget no se inicializara.');
}

Y en la funcion init (lineas 501-506), agrega early return:
async function init() {
    if (!BOT_ID) return;
    await fetchConfig();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
    else createWidget();
}

ARCHIVOS A MODIFICAR:
- widget/widget.js (lineas 9-11 y 501-506)
```

---

### PROMPT M-08: Upload de documentos no implementado pero UI sugiere que funciona

```
Eres un ingeniero frontend React. Corrige la UI enganosa en src/pages/KnowledgeBasePage.jsx.

PROBLEMA:
En la linea 229, hay un input de archivo con handler vacio. El boton aparece funcional pero no hace nada.

Codigo actual (lineas 227-230):
<label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm cursor-pointer transition-colors">
    <Upload className="w-4 h-4" /> Subir archivo
    <input type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={() => {/* TODO: upload handler */}} />
</label>

CORRECCION:
<label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-600 text-surface-400 text-sm cursor-not-allowed transition-colors" title="Proximamente">
    <Upload className="w-4 h-4" /> Subir archivo (proximamente)
    <input type="file" accept=".pdf,.txt,.docx" className="hidden" disabled />
</label>

ARCHIVOS A MODIFICAR:
- src/pages/KnowledgeBasePage.jsx (lineas 227-230)
```

---

## BAJO

---

### PROMPT B-01: Graficas del dashboard con datos hardcodeados

```
Eres un ingeniero frontend React. Reemplaza los datos mock del dashboard en src/pages/DashboardPage.jsx.

PROBLEMA:
En las lineas 74-83, los graficos muestran datos ficticios hardcodeados en lugar de datos reales.

Codigo actual:
const chartData = [
    { name: 'Lun', conversations: 12, leads: 3 },
    { name: 'Mar', conversations: 19, leads: 5 },
    ...
]

CORRECCION:
Reemplaza las lineas 74-83 con una agregacion real usando los datos de sessions y leadsList que ya estan cargados:

const chartData = (() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    const data = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        const dayConversations = sessions.filter(s => {
            const d = new Date(s.started_at)
            return d >= date && d < nextDate
        }).length
        const dayLeads = leadsList.filter(l => {
            const d = new Date(l.created_at)
            return d >= date && d < nextDate
        }).length
        data.push({ name: days[date.getDay()], conversations: dayConversations, leads: dayLeads })
    }
    return data
})()

ARCHIVOS A MODIFICAR:
- src/pages/DashboardPage.jsx (reemplazar lineas 74-83)
```

---

### PROMPT B-02: Crawler no normaliza query strings

```
Eres un ingeniero backend. Mejora la normalizacion de URLs en el crawler de server/index.js.

PROBLEMA:
En las lineas 522-530, el crawler solo elimina el hash pero no normaliza query parameters de tracking. URLs como ?ref=1 y ?utm_source=x se crawlean como paginas separadas generando chunks duplicados.

Codigo actual (lineas 526-529):
const fullUrl = new URL(href, url)
if (fullUrl.hostname === baseUrl.hostname && fullUrl.protocol.startsWith('http')) {
    fullUrl.hash = ''
    links.add(fullUrl.toString())
}

CORRECCION:
const fullUrl = new URL(href, url)
if (fullUrl.hostname === baseUrl.hostname && fullUrl.protocol.startsWith('http')) {
    fullUrl.hash = ''
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid']
    trackingParams.forEach(p => fullUrl.searchParams.delete(p))
    let normalized = fullUrl.toString()
    if (normalized.endsWith('/') && fullUrl.pathname !== '/') {
        normalized = normalized.slice(0, -1)
    }
    links.add(normalized)
}

ARCHIVOS A MODIFICAR:
- server/index.js (lineas 526-530)
```

---

### PROMPT B-03: Typo en nombre de variable positveFeedback

```
Eres un ingeniero frontend. Corrige el typo en src/pages/DashboardPage.jsx.

PROBLEMA:
En la linea 61, la variable se llama positveFeedback (falta la 'i' en positive). Se usa en lineas 63 y 65.

CORRECCION:
Renombra positveFeedback a positiveFeedback en las lineas 61, 63 y 65:

Linea 61: const positiveFeedback = messages.filter(m => m.feedback === 'positive').length
Linea 63: const totalFeedback = positiveFeedback + negativeFeedback
Linea 65: ? Math.round((positiveFeedback / totalFeedback) * 100)

ARCHIVOS A MODIFICAR:
- src/pages/DashboardPage.jsx (lineas 61, 63, 65)
```

---

### PROMPT B-04: Embed code usa URL placeholder hardcodeada

```
Eres un ingeniero frontend React. Corrige el embed code en src/pages/WidgetCustomizerPage.jsx.

PROBLEMA:
En la linea 77, el codigo de embed usa https://yourdomain.com/widget.js como placeholder. Los usuarios lo copian sin cambiarlo y el widget no funciona.

Codigo actual (linea 77):
const embedCode = '<script src="https://yourdomain.com/widget.js" data-bot-id="' + (widgetConfig.id || 'YOUR_BOT_ID') + '"></script>'

CORRECCION:
const serverUrl = import.meta.env.VITE_API_URL || window.location.origin
const embedCode = '<script src="' + serverUrl + '/widget.js" data-bot-id="' + (widgetConfig.id || 'YOUR_BOT_ID') + '"></script>'

ARCHIVOS A MODIFICAR:
- src/pages/WidgetCustomizerPage.jsx (linea 77)
```

---

## Resumen de prompts

| ID | Severidad | Archivo principal | Descripcion |
|----|-----------|------------------|-------------|
| C-01 | Critico | server/index.js | Encryption key hardcodeada |
| C-02 | Critico | server/index.js | CORS abierto |
| C-03 | Critico | ApiConfigPage + server | API key sin cifrar |
| C-04 | Critico | server/index.js | botId ignorado |
| C-05 | Critico | widget/widget.js | XSS innerHTML |
| A-01 | Alto | server/index.js | Bypass domain validation |
| A-02 | Alto | KnowledgeBasePage.jsx | Crawl siempre 401 |
| A-03 | Alto | server/index.js | Lead sin org_id |
| A-04 | Alto | server/index.js | message_count incorrecto |
| A-05 | Alto | server/index.js | SSRF webhook |
| M-01 | Medio | supabase-adapter.js | Env vars vacias |
| M-02 | Medio | server/index.js | chunkText loop infinito |
| M-03 | Medio | ApiConfigPage.jsx | Variable no usada |
| M-04 | Medio | ConversationsPage.jsx | CSV sin escape |
| M-05 | Medio | DashboardPage.jsx | JSON.parse innecesario |
| M-06 | Medio | useAuth.jsx | Race condition auth |
| M-07 | Medio | widget/widget.js | currentScript null |
| M-08 | Medio | KnowledgeBasePage.jsx | Upload no implementado |
| B-01 | Bajo | DashboardPage.jsx | Datos mock en graficas |
| B-02 | Bajo | server/index.js | URLs no normalizadas |
| B-03 | Bajo | DashboardPage.jsx | Typo positveFeedback |
| B-04 | Bajo | WidgetCustomizerPage.jsx | Embed URL placeholder |
