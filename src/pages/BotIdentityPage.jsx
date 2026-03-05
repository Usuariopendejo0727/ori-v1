import { useState, useEffect } from 'react'
import { fetchRows, upsertRow, uploadFile, getPublicUrl } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    Bot, Image, MessageCircle, Zap, Clock,
    Save, Loader2, CheckCircle2, AlertCircle,
    Plus, X, GripVertical
} from 'lucide-react'

export default function BotIdentityPage() {
    const { user } = useAuth()
    const orgId = user?.user_metadata?.org_id
    const [settings, setSettings] = useState({
        bot_name: 'Ori',
        avatar_url: '',
        welcome_message_es: '¡Hola! 👋 Soy Ori, tu asistente de Integro Suite. ¿En qué te puedo ayudar hoy?',
        welcome_message_en: 'Hi! 👋 I\'m Ori, Integro Suite\'s assistant. How can I help you today?',
        system_prompt: 'Eres Ori, el asistente virtual oficial de Integro Suite.',
        fallback_message_es: 'No tengo una respuesta para eso. ¿Te gustaría hablar con nuestro equipo por WhatsApp?',
        fallback_message_en: 'I don\'t have an answer for that. Would you like to speak with our team on WhatsApp?',
        whatsapp_fallback_url: '',
        quick_replies: [],
        business_hours: {},
        out_of_office_message_es: 'Estamos fuera de horario. Te responderemos pronto.',
        out_of_office_message_en: 'We are currently out of office. We will get back to you soon.',
        timezone: 'America/Bogota',
    })
    const [newQuickReply, setNewQuickReply] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null)

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        try {
            const rows = await fetchRows('bot_settings')
            if (rows.length > 0) {
                setSettings(rows[0])
            }
        } catch { /* defaults */ }
        finally { setIsLoading(false) }
    }

    async function handleSave() {
        setIsSaving(true)
        setSaveStatus(null)
        try {
            await upsertRow('bot_settings', { ...settings, org_id: orgId || settings.org_id })
            setSaveStatus('success')
            setTimeout(() => setSaveStatus(null), 3000)
        } catch { setSaveStatus('error') }
        finally { setIsSaving(false) }
    }

    async function handleAvatarUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const filePath = `bot-avatar-${Date.now()}.${file.name.split('.').pop()}`
            await uploadFile('avatars', filePath, file)
            const publicUrl = getPublicUrl('avatars', filePath)
            setSettings({ ...settings, avatar_url: publicUrl })
        } catch (uploadError) {
            console.error('Error uploading avatar:', uploadError)
        }
    }

    function addQuickReply() {
        if (!newQuickReply.trim()) return
        const updatedReplies = [...(settings.quick_replies || []), newQuickReply.trim()]
        setSettings({ ...settings, quick_replies: updatedReplies })
        setNewQuickReply('')
    }

    function removeQuickReply(index) {
        const updatedReplies = settings.quick_replies.filter((_, i) => i !== index)
        setSettings({ ...settings, quick_replies: updatedReplies })
    }

    function updateField(field, value) {
        setSettings({ ...settings, [field]: value })
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Identidad y Comportamiento</h1>
                <p className="text-surface-400 mt-1">Personaliza el nombre, apariencia y personalidad de Ori</p>
            </div>

            {/* Bot Name + Avatar */}
            <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2 text-surface-200">
                    <Bot className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Nombre y Avatar</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="bot-name" className="block text-sm font-medium text-surface-300 mb-1.5">Nombre del bot</label>
                        <input id="bot-name" type="text" value={settings.bot_name} onChange={(e) => updateField('bot_name', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">Avatar</label>
                        <div className="flex items-center gap-4">
                            {settings.avatar_url ? (
                                <img src={settings.avatar_url} alt="Bot avatar" className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/30" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-primary-400" />
                                </div>
                            )}
                            <label className="px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm cursor-pointer transition-colors">
                                <Image className="w-4 h-4 inline mr-2" />Subir avatar
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Welcome Messages */}
            <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2 text-surface-200">
                    <MessageCircle className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Mensajes de Bienvenida</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="welcome-es" className="block text-sm font-medium text-surface-300 mb-1.5">Español</label>
                        <textarea id="welcome-es" rows={3} value={settings.welcome_message_es} onChange={(e) => updateField('welcome_message_es', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm resize-none" />
                    </div>
                    <div>
                        <label htmlFor="welcome-en" className="block text-sm font-medium text-surface-300 mb-1.5">English</label>
                        <textarea id="welcome-en" rows={3} value={settings.welcome_message_en} onChange={(e) => updateField('welcome_message_en', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 text-sm resize-none" />
                    </div>
                </div>
            </div>

            {/* System Prompt */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Zap className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">System Prompt</h2>
                </div>
                <textarea id="system-prompt" rows={8} value={settings.system_prompt} onChange={(e) => updateField('system_prompt', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 font-mono text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all duration-200 resize-none" />
                <p className="text-xs text-surface-500">Este prompt define la personalidad y comportamiento de Ori. Se inyecta al inicio de cada conversación.</p>
            </div>

            {/* Quick Replies */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Zap className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Respuestas Rápidas</h2>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {(settings.quick_replies || []).map((reply, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 text-primary-300 text-sm border border-primary-500/20">
                            {reply}
                            <button onClick={() => removeQuickReply(index)} className="hover:text-danger cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={newQuickReply} onChange={(e) => setNewQuickReply(e.target.value)} placeholder="Agregar respuesta rápida..."
                        onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
                        className="flex-1 px-4 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm" />
                    <button onClick={addQuickReply} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm cursor-pointer transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Fallback + WhatsApp */}
            <div className="glass-card p-6 space-y-5">
                <h2 className="text-lg font-semibold text-surface-200">Fallback y WhatsApp</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fallback-es" className="block text-sm font-medium text-surface-300 mb-1.5">Mensaje fallback (ES)</label>
                        <textarea id="fallback-es" rows={2} value={settings.fallback_message_es} onChange={(e) => updateField('fallback_message_es', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 outline-none text-sm resize-none" />
                    </div>
                    <div>
                        <label htmlFor="whatsapp-url" className="block text-sm font-medium text-surface-300 mb-1.5">URL de WhatsApp</label>
                        <input id="whatsapp-url" type="url" value={settings.whatsapp_fallback_url || ''} onChange={(e) => updateField('whatsapp_fallback_url', e.target.value)}
                            placeholder="https://wa.me/573001234567"
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm" />
                    </div>
                </div>
            </div>

            {/* Business Hours */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-surface-200">
                    <Clock className="w-5 h-5 text-primary-400" />
                    <h2 className="text-lg font-semibold">Horario Laboral</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="timezone" className="block text-sm font-medium text-surface-300 mb-1.5">Zona horaria</label>
                        <select id="timezone" value={settings.timezone} onChange={(e) => updateField('timezone', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 outline-none text-sm cursor-pointer">
                            <option value="America/Bogota">America/Bogota (COT)</option>
                            <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                            <option value="America/Lima">America/Lima (PET)</option>
                            <option value="America/Buenos_Aires">America/Buenos_Aires (ART)</option>
                            <option value="America/Santiago">America/Santiago (CLT)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="ooo-message" className="block text-sm font-medium text-surface-300 mb-1.5">Mensaje fuera de horario (ES)</label>
                        <textarea id="ooo-message" rows={2} value={settings.out_of_office_message_es} onChange={(e) => updateField('out_of_office_message_es', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 focus:border-primary-500 outline-none text-sm resize-none" />
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                {saveStatus === 'success' && <span className="flex items-center gap-1 text-success text-sm animate-fade-in"><CheckCircle2 className="w-4 h-4" /> Guardado</span>}
                {saveStatus === 'error' && <span className="flex items-center gap-1 text-danger text-sm animate-fade-in"><AlertCircle className="w-4 h-4" /> Error</span>}
            </div>
        </div>
    )
}
