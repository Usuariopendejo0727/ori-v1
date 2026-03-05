import { useState, useEffect } from 'react'
import { fetchRows, upsertRow } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    Palette, Monitor, Copy, Check, Save, Loader2,
    CheckCircle2, AlertCircle, Eye, Plus, X, ThumbsUp
} from 'lucide-react'

export default function WidgetCustomizerPage() {
    const { user } = useAuth()
    const orgId = user?.user_metadata?.org_id
    const [widgetConfig, setWidgetConfig] = useState({
        primary_color: '#6366f1',
        background_color: '#ffffff',
        text_color: '#1f2937',
        position: 'bottom-right',
        width: 380,
        height: 600,
        show_powered_by: true,
        show_feedback_buttons: true,
        approved_domains: [],
    })
    const [newDomain, setNewDomain] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null)
    const [isCopied, setIsCopied] = useState(false)

    useEffect(() => { loadConfig() }, [])

    async function loadConfig() {
        try {
            const rows = await fetchRows('widget_config')
            if (rows.length > 0) setWidgetConfig(rows[0])
        } catch { /* defaults */ }
        finally { setIsLoading(false) }
    }

    async function handleSave() {
        setIsSaving(true)
        setSaveStatus(null)
        try {
            await upsertRow('widget_config', { ...widgetConfig, org_id: orgId || widgetConfig.org_id })
            setSaveStatus('success')
            setTimeout(() => setSaveStatus(null), 3000)
        } catch { setSaveStatus('error') }
        finally { setIsSaving(false) }
    }

    function updateConfig(field, value) {
        setWidgetConfig({ ...widgetConfig, [field]: value })
    }

    const [domainError, setDomainError] = useState('')

    function addDomain() {
        if (!newDomain.trim()) {
            setDomainError('El dominio es requerido.')
            return
        }
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
        if (!domainPattern.test(newDomain.trim())) {
            setDomainError('Formato de dominio inválido (ej: example.com)')
            return
        }
        setDomainError('')
        const updatedDomains = [...(widgetConfig.approved_domains || []), newDomain.trim()]
        setWidgetConfig({ ...widgetConfig, approved_domains: updatedDomains })
        setNewDomain('')
    }

    function removeDomain(index) {
        const updatedDomains = widgetConfig.approved_domains.filter((_, i) => i !== index)
        setWidgetConfig({ ...widgetConfig, approved_domains: updatedDomains })
    }

    const embedCode = `<script src="${window.location.origin}/widget.js" data-bot-id="${orgId || 'YOUR_BOT_ID'}" data-api-url="${window.location.origin}"></script>`

    function copyEmbed() {
        navigator.clipboard.writeText(embedCode)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Personalización del Widget</h1>
                <p className="text-surface-400 mt-1">Configura la apariencia y comportamiento del widget de chat</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Settings */}
                <div className="space-y-6">
                    {/* Colors */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-surface-200">
                            <Palette className="w-5 h-5 text-primary-400" />
                            <h2 className="text-lg font-semibold">Colores</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="color-primary" className="block text-xs text-surface-400 mb-1.5">Primario</label>
                                <div className="flex items-center gap-2">
                                    <input id="color-primary" type="color" value={widgetConfig.primary_color} onChange={(e) => updateConfig('primary_color', e.target.value)}
                                        className="w-8 h-8 rounded-md border border-surface-600 cursor-pointer" />
                                    <input type="text" value={widgetConfig.primary_color} onChange={(e) => updateConfig('primary_color', e.target.value)}
                                        className="flex-1 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-600 text-surface-200 text-xs font-mono" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="color-bg" className="block text-xs text-surface-400 mb-1.5">Fondo</label>
                                <div className="flex items-center gap-2">
                                    <input id="color-bg" type="color" value={widgetConfig.background_color} onChange={(e) => updateConfig('background_color', e.target.value)}
                                        className="w-8 h-8 rounded-md border border-surface-600 cursor-pointer" />
                                    <input type="text" value={widgetConfig.background_color} onChange={(e) => updateConfig('background_color', e.target.value)}
                                        className="flex-1 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-600 text-surface-200 text-xs font-mono" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="color-text" className="block text-xs text-surface-400 mb-1.5">Texto</label>
                                <div className="flex items-center gap-2">
                                    <input id="color-text" type="color" value={widgetConfig.text_color} onChange={(e) => updateConfig('text_color', e.target.value)}
                                        className="w-8 h-8 rounded-md border border-surface-600 cursor-pointer" />
                                    <input type="text" value={widgetConfig.text_color} onChange={(e) => updateConfig('text_color', e.target.value)}
                                        className="flex-1 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-600 text-surface-200 text-xs font-mono" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Position + Size */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-surface-200">
                            <Monitor className="w-5 h-5 text-primary-400" />
                            <h2 className="text-lg font-semibold">Posición y Tamaño</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-surface-400 mb-1.5">Posición</label>
                                <div className="flex gap-2">
                                    {['bottom-right', 'bottom-left'].map(pos => (
                                        <button key={pos} onClick={() => updateConfig('position', pos)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${widgetConfig.position === pos ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 border border-surface-600 hover:border-surface-500'
                                                }`}>{pos === 'bottom-right' ? 'Abajo-Derecha' : 'Abajo-Izquierda'}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="widget-width" className="block text-xs text-surface-400 mb-1.5">Ancho: {widgetConfig.width}px</label>
                                <input id="widget-width" type="range" min="320" max="500" value={widgetConfig.width} onChange={(e) => updateConfig('width', parseInt(e.target.value))}
                                    className="w-full accent-primary-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="widget-height" className="block text-xs text-surface-400 mb-1.5">Alto: {widgetConfig.height}px</label>
                            <input id="widget-height" type="range" min="400" max="800" value={widgetConfig.height} onChange={(e) => updateConfig('height', parseInt(e.target.value))}
                                className="w-full accent-primary-500" />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="glass-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-surface-200">Opciones</h2>
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-sm text-surface-300">Mostrar "Powered by Integro Suite"</span>
                            <button onClick={() => updateConfig('show_powered_by', !widgetConfig.show_powered_by)}
                                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${widgetConfig.show_powered_by ? 'bg-primary-600' : 'bg-surface-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${widgetConfig.show_powered_by ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-sm text-surface-300">Botones de feedback 👍👎</span>
                            <button onClick={() => updateConfig('show_feedback_buttons', !widgetConfig.show_feedback_buttons)}
                                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${widgetConfig.show_feedback_buttons ? 'bg-primary-600' : 'bg-surface-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${widgetConfig.show_feedback_buttons ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>
                    </div>

                    {/* Domains */}
                    <div className="glass-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-surface-200">Dominios Aprobados</h2>
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            {(widgetConfig.approved_domains || []).map((domain, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-700 text-surface-300 text-xs border border-surface-600">
                                    {domain}
                                    <button onClick={() => removeDomain(i)} className="hover:text-danger cursor-pointer"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newDomain} onChange={(e) => { setNewDomain(e.target.value); setDomainError('') }} placeholder="example.com"
                                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                                className={`flex-1 px-3 py-2 rounded-lg bg-surface-800 border text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm ${domainError ? 'border-danger' : 'border-surface-600'}`} />
                            <button type="button" onClick={addDomain} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm cursor-pointer hover:bg-primary-500">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {domainError && (
                            <p className="text-danger text-xs flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {domainError}
                            </p>
                        )}
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4 sticky top-8">
                        <div className="flex items-center gap-2 text-surface-200">
                            <Eye className="w-5 h-5 text-primary-400" />
                            <h2 className="text-lg font-semibold">Preview</h2>
                        </div>
                        <div className="relative bg-surface-200 rounded-xl p-6 min-h-[500px] flex items-end" style={{ justifyContent: widgetConfig.position === 'bottom-right' ? 'flex-end' : 'flex-start' }}>
                            {/* Widget Preview */}
                            <div className="rounded-2xl shadow-xl overflow-hidden" style={{ width: Math.min(widgetConfig.width, 340), maxHeight: 480 }}>
                                {/* Header */}
                                <div className="px-4 py-3 flex items-center gap-3" style={{ background: widgetConfig.primary_color }}>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">O</span>
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-semibold">Ori</p>
                                        <p className="text-white/70 text-xs">En línea</p>
                                    </div>
                                </div>
                                {/* Chat body */}
                                <div className="p-4 space-y-3" style={{ background: widgetConfig.background_color, minHeight: 280 }}>
                                    {/* Bot message */}
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: widgetConfig.primary_color }}>O</div>
                                        <div className="max-w-[80%]">
                                            <div className="px-3 py-2 rounded-xl rounded-tl-sm text-sm" style={{ background: `${widgetConfig.primary_color}15`, color: widgetConfig.text_color }}>
                                                ¡Hola! 👋 ¿En qué te puedo ayudar?
                                            </div>
                                            {widgetConfig.show_feedback_buttons && (
                                                <div className="flex gap-1 mt-1">
                                                    <button className="p-1 rounded hover:bg-gray-100 cursor-pointer"><ThumbsUp className="w-3 h-3 text-gray-400" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* User message */}
                                    <div className="flex justify-end">
                                        <div className="px-3 py-2 rounded-xl rounded-tr-sm text-white text-sm max-w-[80%]" style={{ background: widgetConfig.primary_color }}>
                                            ¿Qué es Integro Suite?
                                        </div>
                                    </div>
                                </div>
                                {/* Input */}
                                <div className="px-3 py-2 border-t flex items-center gap-2" style={{ background: widgetConfig.background_color, borderColor: '#e5e7eb' }}>
                                    <input disabled placeholder="Escribe un mensaje..." className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-sm" style={{ color: widgetConfig.text_color }} />
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: widgetConfig.primary_color }}>
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                    </div>
                                </div>
                                {widgetConfig.show_powered_by && (
                                    <div className="text-center py-1.5 text-xs" style={{ background: widgetConfig.background_color, color: '#9ca3af' }}>
                                        Powered by Integro Suite
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Embed Code */}
                    <div className="glass-card p-6 space-y-3">
                        <h2 className="text-lg font-semibold text-surface-200">Código de Embed</h2>
                        <div className="relative">
                            <pre className="p-4 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-300 font-mono overflow-x-auto">{embedCode}</pre>
                            <button onClick={copyEmbed}
                                className="absolute top-2 right-2 p-2 rounded-md bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-surface-200 cursor-pointer transition-colors">
                                {isCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar configuración'}
                </button>
                {saveStatus === 'success' && <span className="flex items-center gap-1 text-success text-sm animate-fade-in"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
                {saveStatus === 'error' && <span className="flex items-center gap-1 text-danger text-sm animate-fade-in"><AlertCircle className="w-4 h-4" /> Error</span>}
            </div>
        </div>
    )
}
