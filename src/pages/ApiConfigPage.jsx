import { useState, useEffect } from 'react'
import { fetchRows, upsertRow } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    Key, Cpu, Thermometer, Hash,
    Save, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff
} from 'lucide-react'

const MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o', inputPrice: '$2.50 / 1M tok', outputPrice: '$10.00 / 1M tok' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputPrice: '$0.15 / 1M tok', outputPrice: '$0.60 / 1M tok' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', inputPrice: '$10.00 / 1M tok', outputPrice: '$30.00 / 1M tok' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', inputPrice: '$0.50 / 1M tok', outputPrice: '$1.50 / 1M tok' },
]

export default function ApiConfigPage() {
    const { user } = useAuth()
    const orgId = user?.user_metadata?.org_id
    const [config, setConfig] = useState({
        openai_api_key_encrypted: '',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 800,
    })
    const [showApiKey, setShowApiKey] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null)

    useEffect(() => {
        loadConfig()
    }, [])

    async function loadConfig() {
        try {
            const rows = await fetchRows('ai_config')
            if (rows.length > 0) {
                setConfig(rows[0])
            }
        } catch {
            // No config yet — use defaults
        } finally {
            setIsLoading(false)
        }
    }

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

    const selectedModel = MODELS.find(m => m.id === config.model) || MODELS[1]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">API y Configuración del Modelo</h1>
                <p className="text-surface-400 mt-1">Configura tu API key de OpenAI y los parámetros del modelo</p>
            </div>

            {/* API Key */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Key className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">API Key de OpenAI</h2>
                </div>
                <div className="relative">
                    <input
                        id="api-key-input"
                        type={showApiKey ? 'text' : 'password'}
                        value={config.openai_api_key_encrypted}
                        onChange={(e) => setConfig({ ...config, openai_api_key_encrypted: e.target.value })}
                        placeholder="sk-..."
                        className="w-full pr-12 pl-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm font-mono"
                    />
                    <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 cursor-pointer"
                    >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-xs text-surface-500">La API key se almacena encriptada server-side. Nunca se expone en el frontend.</p>
            </div>

            {/* Model Selection */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Cpu className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Modelo</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MODELS.map(model => (
                        <button
                            key={model.id}
                            onClick={() => setConfig({ ...config, model: model.id })}
                            className={`p-4 rounded-lg border text-left cursor-pointer transition-all duration-200 ${config.model === model.id
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-surface-600 bg-surface-800 hover:border-surface-500'
                                }`}
                        >
                            <p className="font-medium text-surface-100">{model.name}</p>
                            <p className="text-xs text-surface-400 mt-1">In: {model.inputPrice}</p>
                            <p className="text-xs text-surface-400">Out: {model.outputPrice}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Temperature + Max Tokens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-surface-200">
                        <Thermometer className="w-5 h-5 text-primary-400" />
                        <h2 className="text-lg font-semibold">Temperatura</h2>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                        className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-surface-400">
                        <span>0 — Preciso</span>
                        <span className="text-primary-400 font-medium">{config.temperature}</span>
                        <span>1 — Creativo</span>
                    </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-surface-200">
                        <Hash className="w-5 h-5 text-primary-400" />
                        <h2 className="text-lg font-semibold">Max Tokens</h2>
                    </div>
                    <input
                        type="range"
                        min="200"
                        max="2000"
                        step="100"
                        value={config.max_tokens}
                        onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                        className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-surface-400">
                        <span>200 — Corto</span>
                        <span className="text-primary-400 font-medium">{config.max_tokens}</span>
                        <span>2000 — Largo</span>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar configuración'}
                </button>
                {saveStatus === 'success' && (
                    <span className="flex items-center gap-1 text-success text-sm animate-fade-in">
                        <CheckCircle2 className="w-4 h-4" /> Guardado correctamente
                    </span>
                )}
                {saveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-danger text-sm animate-fade-in">
                        <AlertCircle className="w-4 h-4" /> Error al guardar
                    </span>
                )}
            </div>
        </div>
    )
}
