import { useState, useEffect } from 'react'
import { fetchRows, insertRow, deleteRow, subscribeToTable } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    Globe, FileText, Plus, Trash2, RefreshCw, Loader2,
    AlertCircle, CheckCircle2, X, Upload, Clock,
    ChevronDown, ChevronUp, Search
} from 'lucide-react'

const STATUS_STYLES = {
    pending: 'bg-warning/20 text-warning',
    crawling: 'bg-info/20 text-info',
    completed: 'bg-success/20 text-success',
    failed: 'bg-danger/20 text-danger',
    processing: 'bg-info/20 text-info',
    indexed: 'bg-success/20 text-success',
}

export default function KnowledgeBasePage() {
    const { user } = useAuth()
    const orgId = user?.user_metadata?.org_id
    const [crawlUrls, setCrawlUrls] = useState([])
    const [documents, setDocuments] = useState([])
    const [chunks, setChunks] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [newUrl, setNewUrl] = useState('')
    const [newDepth, setNewDepth] = useState(2)
    const [showAddUrl, setShowAddUrl] = useState(false)
    const [showChunks, setShowChunks] = useState(false)
    const [chunkSearch, setChunkSearch] = useState('')

    useEffect(() => {
        loadData()
        const unsubscribe = subscribeToTable('crawl_urls', () => loadCrawlUrls())
        return unsubscribe
    }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            await Promise.all([loadCrawlUrls(), loadDocuments(), loadChunks()])
        } finally { setIsLoading(false) }
    }

    async function loadCrawlUrls() {
        try { setCrawlUrls(await fetchRows('crawl_urls')) } catch { setCrawlUrls([]) }
    }

    async function loadDocuments() {
        try { setDocuments(await fetchRows('uploaded_documents')) } catch { setDocuments([]) }
    }

    async function loadChunks() {
        try { setChunks(await fetchRows('knowledge_chunks')) } catch { setChunks([]) }
    }

    const [urlError, setUrlError] = useState('')

    async function handleAddUrl() {
        if (!newUrl.trim()) {
            setUrlError('La URL es requerida.')
            return
        }
        try {
            new URL(newUrl.trim())
        } catch {
            setUrlError('Ingresa una URL válida (ej: https://example.com)')
            return
        }
        setUrlError('')
        try {
            await insertRow('crawl_urls', { url: newUrl.trim(), max_depth: newDepth, org_id: orgId })
            setNewUrl('')
            setShowAddUrl(false)
            await loadCrawlUrls()
        } catch (err) { console.error(err) }
    }

    async function handleDeleteUrl(id) {
        try { await deleteRow('crawl_urls', id); await loadCrawlUrls() } catch (err) { console.error(err) }
    }

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

    async function handleDeleteChunk(id) {
        try { await deleteRow('knowledge_chunks', id); await loadChunks() } catch (err) { console.error(err) }
    }

    function isStale(crawledAt) {
        if (!crawledAt) return true
        const daysSince = (Date.now() - new Date(crawledAt).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > 7
    }

    const filteredChunks = chunks.filter(c =>
        !chunkSearch || c.content?.toLowerCase().includes(chunkSearch.toLowerCase())
    )

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Knowledge Base</h1>
                <p className="text-surface-400 mt-1">Gestiona las fuentes de conocimiento de Ori</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-surface-50">{crawlUrls.length}</p>
                    <p className="text-xs text-surface-400 mt-1">URLs configuradas</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-surface-50">{documents.length}</p>
                    <p className="text-xs text-surface-400 mt-1">Documentos subidos</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-surface-50">{chunks.length}</p>
                    <p className="text-xs text-surface-400 mt-1">Chunks indexados</p>
                </div>
            </div>

            {/* Crawl URLs */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-surface-200">
                        <Globe className="w-5 h-5 text-primary-400" />
                        <h2 className="text-lg font-semibold">URLs de Crawl</h2>
                    </div>
                    <button onClick={() => setShowAddUrl(!showAddUrl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm cursor-pointer transition-colors">
                        <Plus className="w-4 h-4" /> Agregar URL
                    </button>
                </div>

                {showAddUrl && (
                    <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700 animate-fade-in space-y-3">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label htmlFor="crawl-url" className="block text-xs text-surface-400 mb-1">URL</label>
                                <input id="crawl-url" type="url" value={newUrl} onChange={(e) => { setNewUrl(e.target.value); setUrlError('') }}
                                    placeholder="https://example.com" className={`w-full px-3 py-2 rounded-lg bg-surface-800 border text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm ${urlError ? 'border-danger' : 'border-surface-600'}`} />
                            </div>
                            <div className="w-24">
                                <label htmlFor="crawl-depth" className="block text-xs text-surface-400 mb-1">Profundidad</label>
                                <select id="crawl-depth" value={newDepth} onChange={(e) => setNewDepth(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm cursor-pointer">
                                    {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <button type="button" onClick={handleAddUrl} className="px-4 py-2 rounded-lg bg-success hover:bg-success/90 text-white text-sm cursor-pointer transition-colors">Agregar</button>
                            <button type="button" onClick={() => { setShowAddUrl(false); setUrlError('') }} className="px-3 py-2 rounded-lg bg-surface-700 text-surface-400 text-sm cursor-pointer hover:bg-surface-600"><X className="w-4 h-4" /></button>
                        </div>
                        {urlError && (
                            <p className="text-danger text-xs flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {urlError}
                            </p>
                        )}
                    </div>
                )}

                {crawlUrls.length === 0 ? (
                    <div className="text-center py-8">
                        <Globe className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                        <p className="text-surface-400">No hay URLs configuradas</p>
                        <p className="text-xs text-surface-500 mt-1">Agrega URLs para que Ori aprenda de tu sitio web.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {crawlUrls.map(url => (
                            <div key={url.id} className={`flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border transition-colors ${isStale(url.last_crawled_at) ? 'border-warning/30' : 'border-surface-700'
                                }`}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-surface-200 truncate font-mono">{url.url}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                                        <span>Profundidad: {url.max_depth}</span>
                                        <span>{url.pages_indexed} páginas</span>
                                        <span>{url.chunks_stored} chunks</span>
                                        {url.last_crawled_at && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(url.last_crawled_at).toLocaleDateString('es-CO')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[url.status] || 'bg-surface-700 text-surface-400'}`}>
                                        {url.status}
                                    </span>
                                    <button onClick={() => handleTriggerCrawl(url.id)} title="Re-crawl"
                                        className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-primary-400 cursor-pointer transition-colors">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUrl(url.id)} title="Eliminar"
                                        className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-danger cursor-pointer transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Documents */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-surface-200">
                        <FileText className="w-5 h-5 text-primary-400" />
                        <h2 className="text-lg font-semibold">Documentos</h2>
                    </div>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" /> Subir archivo
                        <input type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={() => {/* TODO: upload handler */ }} />
                    </label>
                </div>
                {documents.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                        <p className="text-surface-400">No hay documentos subidos</p>
                        <p className="text-xs text-surface-500 mt-1">Sube PDFs, TXT o DOCX para ampliar la base de conocimiento.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700">
                                <div>
                                    <p className="text-sm text-surface-200">{doc.filename}</p>
                                    <p className="text-xs text-surface-500 mt-1">{doc.file_type} — {doc.chunks_count} chunks</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[doc.status]}`}>
                                    {doc.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chunks Browser */}
            <div className="glass-card p-6 space-y-4">
                <button onClick={() => setShowChunks(!showChunks)} className="flex items-center justify-between w-full cursor-pointer">
                    <div className="flex items-center gap-2 text-surface-200">
                        <Search className="w-5 h-5 text-primary-400" />
                        <h2 className="text-lg font-semibold">Chunks Indexados ({chunks.length})</h2>
                    </div>
                    {showChunks ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                </button>
                {showChunks && (
                    <div className="space-y-3 animate-fade-in">
                        <input type="text" value={chunkSearch} onChange={(e) => setChunkSearch(e.target.value)}
                            placeholder="Buscar en chunks..." className="w-full px-4 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm" />
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredChunks.slice(0, 50).map(chunk => (
                                <div key={chunk.id} className="p-3 rounded-lg bg-surface-800/50 border border-surface-700">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-primary-400">{chunk.source_type === 'crawl' ? chunk.source_url : chunk.source_filename}</span>
                                        <button onClick={() => handleDeleteChunk(chunk.id)} className="p-1 text-surface-500 hover:text-danger cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <p className="text-xs text-surface-300 line-clamp-3">{chunk.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
