import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import crypto from 'crypto'
import * as cheerio from 'cheerio'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

/* ========================================
   Configuración
   ======================================== */

const app = express()
const PORT = process.env.PORT || 3001

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

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
app.use(express.json())

/* ========================================
   Middleware: Rate Limiting
   ======================================== */

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
})

/* ========================================
   Helpers: Encriptación
   ======================================== */

// ENCRYPTION_KEY is now validated during initialization
const IV_LENGTH = 16

function decryptApiKey(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

function encryptApiKey(text) {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
}

/* ========================================
   Helpers: OpenAI
   ======================================== */

async function getOpenAIClient(orgId) {
    const { data: config } = await supabase
        .from('ai_config')
        .select('*')
        .eq('org_id', orgId)
        .single()

    if (!config) throw new Error('AI config no encontrada para esta organización.')

    const apiKey = decryptApiKey(config.openai_api_key_encrypted)
    return {
        client: new OpenAI({ apiKey }),
        model: config.model || 'gpt-4o-mini',
        temperature: parseFloat(config.temperature) || 0.7,
        maxTokens: config.max_tokens || 800,
    }
}

/* ========================================
   Helpers: Búsqueda Semántica
   ======================================== */

async function generateEmbedding(openaiClient, text) {
    const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    })
    return response.data[0].embedding
}

async function searchKnowledge(orgId, queryEmbedding) {
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_org_id: orgId,
        match_threshold: 0.78,
        match_count: 5,
    })
    if (error) throw error
    return data || []
}

/* ========================================
   Helpers: Domain Whitelist
   ======================================== */

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
            originHostname === domain || originHostname.endsWith(`.${domain}`)
        )
    } catch {
        return false
    }
}

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
            if (a === 172 && (b >= 16 && b <= 31)) return false
            if (a === 192 && b === 168) return false
        }
        return true
    } catch { return false }
}

/* ========================================
   POST /api/chat — Chat con RAG
   ======================================== */

app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        const { message, sessionId, botId, language = 'es' } = req.body

        if (!message || !botId) {
            return res.status(400).json({ error: 'message y botId son requeridos.' })
        }

        // Validar dominio
        const isValidDomain = await validateDomain(botId, req.headers.origin)
        if (!isValidDomain) {
            return res.status(403).json({ error: 'Dominio no autorizado.' })
        }

        // Obtener config del bot
        const { data: botSettings } = await supabase
            .from('bot_settings')
            .select('*')
            .eq('id', botId)
            .single()

        if (!botSettings) {
            return res.status(404).json({ error: 'Bot no encontrado.' })
        }

        const orgId = botSettings.org_id

        // Obtener OpenAI client
        const { client: openai, model, temperature, maxTokens } = await getOpenAIClient(orgId)

        // Generar embedding de la pregunta
        const queryEmbedding = await generateEmbedding(openai, message)

        // Buscar contexto relevante
        const relevantChunks = await searchKnowledge(orgId, queryEmbedding)

        // Obtener o crear sesión
        let currentSessionId = sessionId
        if (!currentSessionId) {
            currentSessionId = crypto.randomUUID()
            await supabase.from('chat_sessions').insert({
                org_id: orgId,
                session_id: currentSessionId,
                language,
            })
        }

        // Obtener historial reciente
        const { data: recentMessages } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', currentSessionId)
            .order('created_at', { ascending: false })
            .limit(10)

        const chatHistory = (recentMessages || []).reverse()

        // Guardar mensaje del usuario
        await supabase.from('chat_messages').insert({
            session_id: currentSessionId,
            role: 'user',
            content: message,
        })

        // Construir contexto
        const contextText = relevantChunks.length > 0
            ? relevantChunks.map((chunk, i) => `[Fuente ${i + 1}]: ${chunk.content}`).join('\n\n')
            : 'No se encontró información relevante en la base de conocimiento.'

        const systemPrompt = `${botSettings.system_prompt}\n\nCONTEXTO RECUPERADO:\n${contextText}`

        // Preparar mensajes para OpenAI
        const openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
        ]

        // Llamar a OpenAI
        const completion = await openai.chat.completions.create({
            model,
            messages: openaiMessages,
            temperature,
            max_tokens: maxTokens,
        })

        const reply = completion.choices[0]?.message?.content || ''
        const tokensUsed = completion.usage?.total_tokens || 0

        // Preparar fuentes
        const sources = relevantChunks.map(chunk => ({
            url: chunk.source_url,
            filename: chunk.source_filename,
            type: chunk.source_type,
        }))

        // Guardar respuesta del bot
        await supabase.from('chat_messages').insert({
            session_id: currentSessionId,
            role: 'assistant',
            content: reply,
            sources,
            tokens_used: tokensUsed,
        })

        const { count: realMessageCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', currentSessionId)

        // Actualizar sesión
        await supabase
            .from('chat_sessions')
            .update({
                last_message_at: new Date().toISOString(),
                message_count: realMessageCount || 0,
            })
            .eq('session_id', currentSessionId)

        // Registrar uso de tokens
        await supabase.from('token_usage').insert({
            org_id: orgId,
            model,
            input_tokens: completion.usage?.prompt_tokens || 0,
            output_tokens: completion.usage?.completion_tokens || 0,
        })

        // Verificar si necesita fallback
        const needsFallback = relevantChunks.length === 0
        const fallbackMessage = language === 'en'
            ? botSettings.fallback_message_en
            : botSettings.fallback_message_es

        res.json({
            reply: needsFallback ? `${reply}\n\n${fallbackMessage}` : reply,
            sessionId: currentSessionId,
            sources,
            needsFallback,
            whatsappUrl: needsFallback ? botSettings.whatsapp_fallback_url : null,
        })
    } catch (error) {
        console.error('[Chat Error]:', error.message)
        res.status(500).json({ error: 'Error al procesar el mensaje.' })
    }
})

/* ========================================
   POST /api/leads — Capturar Lead
   ======================================== */

app.post('/api/leads', chatLimiter, async (req, res) => {
    try {
        const { name, email, whatsapp, sessionId, botId } = req.body

        if (!name && !email && !whatsapp) {
            return res.status(400).json({ error: 'Se requiere al menos un dato de contacto.' })
        }

        // Obtener org_id del bot_settings
        const { data: botSettings } = await supabase
            .from('bot_settings')
            .select('org_id')
            .eq('id', botId)
            .single()

        const orgId = botSettings?.org_id
        if (!orgId) {
            return res.status(500).json({ error: 'Configuracion del bot no encontrada. No se puede capturar el lead.' })
        }

        // Insertar lead
        const { data: lead, error } = await supabase
            .from('leads')
            .insert({ org_id: orgId, session_id: sessionId, name, email, whatsapp })
            .select()
            .single()

        if (error) throw error

        // Marcar sesión como lead capturado
        if (sessionId) {
            await supabase
                .from('chat_sessions')
                .update({ lead_captured: true })
                .eq('session_id', sessionId)
        }

        // Obtener webhook config
        const { data: integrationConfig } = await supabase
            .from('integrations')
            .select('*')
            .eq('org_id', orgId)
            .single()

        // Enviar webhook si está configurado
        if (integrationConfig?.webhook_url) {
            if (!isAllowedWebhookUrl(integrationConfig.webhook_url)) {
                console.warn('[Webhook] URL bloqueada por politica de seguridad:', integrationConfig.webhook_url)
            } else {
                try {
                    const webhookResponse = await fetch(integrationConfig.webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event: 'lead_captured',
                            timestamp: new Date().toISOString(),
                            data: { name, email, whatsapp, session_id: sessionId },
                        }),
                    })

                    await supabase
                        .from('leads')
                        .update({
                            webhook_sent: true,
                            webhook_response: { status: webhookResponse.status },
                        })
                        .eq('id', lead.id)
                } catch (webhookError) {
                    console.error('[Webhook Error]:', webhookError.message)
                }
            }
        }

        res.json({ success: true, leadId: lead.id })
    } catch (error) {
        console.error('[Lead Error]:', error.message)
        res.status(500).json({ error: 'Error al capturar el lead.' })
    }
})

/* ========================================
   GET /api/widget-config — Config para el widget
   ======================================== */

app.get('/api/widget-config', async (req, res) => {
    try {
        const { botId } = req.query
        if (!botId) return res.status(400).json({ error: 'botId es requerido.' })

        const { data: widgetConfig } = await supabase
            .from('widget_config')
            .select('*')
            .eq('id', botId)
            .single()

        const { data: botSettings } = await supabase
            .from('bot_settings')
            .select('bot_name, avatar_url, welcome_message_es, welcome_message_en, quick_replies, business_hours, out_of_office_message_es, out_of_office_message_en, timezone')
            .eq('id', botId)
            .single()

        res.json({ widget: widgetConfig, bot: botSettings })
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración.' })
    }
})

/* ========================================
   POST /api/feedback — Feedback del usuario
   ======================================== */

app.post('/api/feedback', async (req, res) => {
    try {
        const { messageId, feedback } = req.body
        if (!messageId || !['positive', 'negative'].includes(feedback)) {
            return res.status(400).json({ error: 'messageId y feedback (positive/negative) requeridos.' })
        }

        await supabase
            .from('chat_messages')
            .update({ feedback })
            .eq('id', messageId)

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar feedback.' })
    }
})

/* ========================================
   Admin Endpoints (protegidos por Supabase Auth)
   ======================================== */

async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Token requerido.' })

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Token inválido.' })

    req.user = user
    next()
}

app.get('/admin/sessions', authMiddleware, async (req, res) => {
    try {
        const { data } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(100)
        res.json(data || [])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.get('/admin/leads', authMiddleware, async (req, res) => {
    try {
        const { data } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
        res.json(data || [])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/admin/ai-config', authMiddleware, async (req, res) => {
    try {
        const { openai_api_key, model, temperature, max_tokens, org_id } = req.body
        const payload = { model, temperature, max_tokens, org_id }
        if (openai_api_key && openai_api_key.trim() !== '') {
            payload.openai_api_key_encrypted = encryptApiKey(openai_api_key)
        }

        const { error } = await supabase
            .from('ai_config')
            .upsert(payload, { onConflict: 'org_id' })

        if (error) throw error

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar configuracion AI.' })
    }
})

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

app.post('/admin/crawl', authMiddleware, async (req, res) => {
    try {
        const { crawlUrlId } = req.body

        // Actualizar estado
        await supabase
            .from('crawl_urls')
            .update({ status: 'crawling' })
            .eq('id', crawlUrlId)

        // Obtener URL info
        const { data: crawlUrl } = await supabase
            .from('crawl_urls')
            .select('*')
            .eq('id', crawlUrlId)
            .single()

        if (!crawlUrl) return res.status(404).json({ error: 'URL no encontrada.' })

        // Responder inmediatamente, crawl en background
        res.json({ success: true, message: 'Crawl iniciado.' })

        // Ejecutar crawl en background
        runCrawlPipeline(crawlUrl).catch(err => {
            console.error('[Crawl Error]:', err.message)
            supabase
                .from('crawl_urls')
                .update({ status: 'failed' })
                .eq('id', crawlUrlId)
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

/* ========================================
   Pipeline de Crawl
   ======================================== */

async function runCrawlPipeline(crawlUrl) {
    console.log(`[Crawl Start] ${crawlUrl.url} (depth: ${crawlUrl.max_depth})`)
    const pagesContent = []
    const visited = new Set()
    const maxPages = crawlUrl.max_depth * 15

    async function crawlPage(url, depth) {
        if (depth > crawlUrl.max_depth || visited.has(url) || visited.size >= maxPages) return
        visited.add(url)

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10000)

            const response = await fetch(url, {
                headers: { 'User-Agent': 'OriBot/1.0 (Integro Suite Crawler)' },
                signal: controller.signal,
                redirect: 'follow',
            })
            clearTimeout(timeout)

            if (!response.ok) return
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.includes('text/html')) return

            const html = await response.text()
            const $ = cheerio.load(html)

            // Remove non-content elements
            $('script, style, nav, footer, header, aside, iframe, noscript, .ad, .advertisement, .cookie-banner, .popup').remove()
            const text = $('body').text().replace(/\s+/g, ' ').trim()

            if (text.length > 100) {
                const title = $('title').text().trim() || url
                pagesContent.push({ url, title, content: text })
                console.log(`  [Crawled] ${url} (${text.length} chars)`)
            }

            // Extract same-domain links
            if (depth < crawlUrl.max_depth) {
                const baseUrl = new URL(crawlUrl.url)
                const links = new Set()

                $('a[href]').each((_, el) => {
                    try {
                        const href = $(el).attr('href')
                        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
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
                    } catch { }
                })

                for (const link of links) {
                    if (visited.size >= maxPages) break
                    await crawlPage(link, depth + 1)
                }
            }
        } catch (err) {
            console.log(`  [Skip] ${url}: ${err.message}`)
        }
    }

    // Start crawl
    await crawlPage(crawlUrl.url, 0)
    console.log(`[Crawl Done] ${crawlUrl.url}: ${pagesContent.length} pages found`)

    if (pagesContent.length === 0) {
        await supabase.from('crawl_urls').update({ status: 'completed', pages_indexed: 0, chunks_stored: 0, last_crawled_at: new Date().toISOString() }).eq('id', crawlUrl.id)
        console.log('[Crawl] No content found, skipping embeddings.')
        return
    }

    // Get AI config for embeddings
    const { data: aiConfig } = await supabase
        .from('ai_config')
        .select('*')
        .eq('org_id', crawlUrl.org_id)
        .single()

    if (!aiConfig) {
        console.warn('[Crawl] No AI config found — saving chunks WITHOUT embeddings.')
        // Save text chunks without embeddings (can be embedded later)
        await supabase.from('knowledge_chunks').delete().eq('crawl_url_id', crawlUrl.id)
        let chunksStored = 0
        for (const page of pagesContent) {
            const chunks = chunkText(page.content, 500, 50)
            for (const chunkContent of chunks) {
                await supabase.from('knowledge_chunks').insert({
                    org_id: crawlUrl.org_id,
                    source_type: 'crawl',
                    source_url: page.url,
                    content: chunkContent,
                    token_count: Math.ceil(chunkContent.length / 4),
                    crawl_url_id: crawlUrl.id,
                })
                chunksStored++
            }
        }
        await supabase.from('crawl_urls').update({ status: 'completed', pages_indexed: pagesContent.length, chunks_stored: chunksStored, last_crawled_at: new Date().toISOString() }).eq('id', crawlUrl.id)
        console.log(`[Crawl Complete] ${pagesContent.length} pages, ${chunksStored} chunks (no embeddings)`)
        return
    }

    const apiKey = decryptApiKey(aiConfig.openai_api_key_encrypted)
    const openai = new OpenAI({ apiKey })

    // Delete previous chunks
    await supabase.from('knowledge_chunks').delete().eq('crawl_url_id', crawlUrl.id)

    let totalChunks = 0
    for (const page of pagesContent) {
        const chunks = chunkText(page.content, 500, 50)
        for (const chunkContent of chunks) {
            try {
                const embedding = await generateEmbedding(openai, chunkContent)
                await supabase.from('knowledge_chunks').insert({
                    org_id: crawlUrl.org_id,
                    source_type: 'crawl',
                    source_url: page.url,
                    content: chunkContent,
                    token_count: Math.ceil(chunkContent.length / 4),
                    embedding,
                    crawl_url_id: crawlUrl.id,
                })
                totalChunks++
            } catch (err) {
                console.error(`  [Embedding Error] ${page.url}: ${err.message}`)
            }
        }
    }

    await supabase.from('crawl_urls').update({ status: 'completed', pages_indexed: pagesContent.length, chunks_stored: totalChunks, last_crawled_at: new Date().toISOString() }).eq('id', crawlUrl.id)
    console.log(`[Crawl Complete] ${crawlUrl.url}: ${pagesContent.length} pages, ${totalChunks} chunks`)
}

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

/* ========================================
   Start Server
   ======================================== */

app.listen(PORT, () => {
    console.log(`🚀 Ori Backend corriendo en http://localhost:${PORT}`)
})

export default app
