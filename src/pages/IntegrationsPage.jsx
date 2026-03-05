import { useState, useEffect } from 'react'
import { fetchRows, upsertRow } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    Webhook, Mail, Save, Loader2, CheckCircle2,
    AlertCircle, Send, Zap
} from 'lucide-react'

export default function IntegrationsPage() {
    const { user } = useAuth()
    const orgId = user?.user_metadata?.org_id
    const [integration, setIntegration] = useState({
        webhook_url: '',
        email_notifications: false,
        notification_email: '',
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null)
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState(null)

    useEffect(() => { loadIntegration() }, [])

    async function loadIntegration() {
        try {
            const rows = await fetchRows('integrations')
            if (rows.length > 0) setIntegration(rows[0])
        } catch { /* defaults */ }
        finally { setIsLoading(false) }
    }

    async function handleSave() {
        setIsSaving(true)
        setSaveStatus(null)
        try {
            await upsertRow('integrations', { ...integration, org_id: orgId || integration.org_id })
            setSaveStatus('success')
            setTimeout(() => setSaveStatus(null), 3000)
        } catch { setSaveStatus('error') }
        finally { setIsSaving(false) }
    }

    async function handleTestWebhook() {
        if (!integration.webhook_url) return
        setIsTesting(true)
        setTestResult(null)
        try {
            const response = await fetch(integration.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test',
                    timestamp: new Date().toISOString(),
                    data: {
                        name: 'Test Lead',
                        email: 'test@example.com',
                        whatsapp: '+573001234567',
                        message: 'Este es un lead de prueba desde Ori Admin Panel',
                    },
                }),
            })
            setTestResult(response.ok ? 'success' : 'error')
        } catch {
            setTestResult('error')
        } finally {
            setIsTesting(false)
            setTimeout(() => setTestResult(null), 5000)
        }
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Integraciones</h1>
                <p className="text-surface-400 mt-1">Configura webhooks y notificaciones para nuevos leads</p>
            </div>

            {/* Webhook */}
            <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2 text-surface-200">
                    <Webhook className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Webhook URL</h2>
                </div>
                <p className="text-xs text-surface-500">Ori enviará un POST con los datos del lead cada vez que se capture uno nuevo.</p>
                <div className="flex gap-3">
                    <input
                        id="webhook-url"
                        type="url"
                        value={integration.webhook_url || ''}
                        onChange={(e) => setIntegration({ ...integration, webhook_url: e.target.value })}
                        placeholder="https://tu-crm.com/api/webhook"
                        className="flex-1 px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm font-mono"
                    />
                    <button
                        onClick={handleTestWebhook}
                        disabled={isTesting || !integration.webhook_url}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Test
                    </button>
                </div>
                {testResult === 'success' && (
                    <div className="flex items-center gap-2 text-success text-sm animate-fade-in">
                        <CheckCircle2 className="w-4 h-4" /> Webhook respondió correctamente
                    </div>
                )}
                {testResult === 'error' && (
                    <div className="flex items-center gap-2 text-danger text-sm animate-fade-in">
                        <AlertCircle className="w-4 h-4" /> Error al conectar con el webhook
                    </div>
                )}
            </div>

            {/* Email notifications */}
            <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2 text-surface-200">
                    <Mail className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Notificaciones por Email</h2>
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <span className="text-sm text-surface-300">Recibir email al capturar un lead</span>
                        <p className="text-xs text-surface-500 mt-0.5">Recibe una notificación instantánea por cada nuevo lead</p>
                    </div>
                    <button
                        onClick={() => setIntegration({ ...integration, email_notifications: !integration.email_notifications })}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${integration.email_notifications ? 'bg-primary-600' : 'bg-surface-600'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${integration.email_notifications ? 'translate-x-5' : ''}`} />
                    </button>
                </label>

                {integration.email_notifications && (
                    <div className="animate-fade-in">
                        <label htmlFor="notification-email" className="block text-sm font-medium text-surface-300 mb-1.5">
                            Email destinatario
                        </label>
                        <input
                            id="notification-email"
                            type="email"
                            value={integration.notification_email || ''}
                            onChange={(e) => setIntegration({ ...integration, notification_email: e.target.value })}
                            placeholder="admin@tuempresa.com"
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Payload example */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Zap className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Formato del Payload</h2>
                </div>
                <pre className="p-4 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-300 font-mono overflow-x-auto">{`{
  "event": "lead_captured",
  "timestamp": "2026-03-04T22:00:00Z",
  "data": {
    "name": "Juan Pérez",
    "email": "juan@empresa.co",
    "whatsapp": "+573001234567",
    "session_id": "abc123...",
    "conversation_summary": "..."
  }
}`}</pre>
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
