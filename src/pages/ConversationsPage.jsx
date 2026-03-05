import { useState, useEffect } from 'react'
import { fetchRows } from '../adapters/supabase-adapter'
import {
    MessageSquare, Users, Search, Download, ChevronDown,
    ChevronUp, Loader2, Calendar, Globe
} from 'lucide-react'

export default function ConversationsPage() {
    const [sessions, setSessions] = useState([])
    const [leadsList, setLeadsList] = useState([])
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedSession, setExpandedSession] = useState(null)
    const [activeTab, setActiveTab] = useState('conversations')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            const [sessionsData, leadsData, messagesData] = await Promise.all([
                fetchRows('chat_sessions').catch(() => []),
                fetchRows('leads').catch(() => []),
                fetchRows('chat_messages').catch(() => []),
            ])
            setSessions(sessionsData)
            setLeadsList(leadsData)
            setMessages(messagesData)
        } finally { setIsLoading(false) }
    }

    function getSessionMessages(sessionId) {
        return messages.filter(m => m.session_id === sessionId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }

    function exportLeadsCsv() {
        const headers = ['Nombre', 'Email', 'WhatsApp', 'Session ID', 'Fecha']
        const rows = leadsList.map(l => [l.name || '', l.email || '', l.whatsapp || '', l.session_id || '', l.created_at || ''])
        const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const filteredSessions = sessions.filter(s =>
        !searchQuery || s.session_id?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Conversaciones y Leads</h1>
                <p className="text-surface-400 mt-1">Historial completo de interacciones con Ori</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-surface-800 w-fit">
                <button onClick={() => setActiveTab('conversations')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${activeTab === 'conversations' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'
                        }`}><MessageSquare className="w-4 h-4" />Conversaciones ({sessions.length})</button>
                <button onClick={() => setActiveTab('leads')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${activeTab === 'leads' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'
                        }`}><Users className="w-4 h-4" />Leads ({leadsList.length})</button>
            </div>

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por session ID..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:border-primary-500 outline-none text-sm" />
                    </div>

                    {filteredSessions.length === 0 ? (
                        <div className="glass-card p-10 text-center">
                            <MessageSquare className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                            <p className="text-surface-400">No hay conversaciones</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSessions.map(session => (
                                <div key={session.id} className="glass-card overflow-hidden">
                                    <button onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                                        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-800/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                                                <MessageSquare className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-surface-200 font-mono">{session.session_id?.substring(0, 16)}...</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                                                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{session.language?.toUpperCase()}</span>
                                                    <span>{session.message_count} mensajes</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(session.started_at).toLocaleDateString('es-CO')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {session.lead_captured && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">Lead</span>
                                            )}
                                            {expandedSession === session.id ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                                        </div>
                                    </button>
                                    {expandedSession === session.id && (
                                        <div className="px-4 pb-4 border-t border-surface-700/50 animate-fade-in">
                                            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                                                {getSessionMessages(session.session_id).map(msg => (
                                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                                            ? 'bg-primary-600 text-white rounded-tr-sm'
                                                            : 'bg-surface-700 text-surface-200 rounded-tl-sm'
                                                            }`}>
                                                            {msg.content}
                                                            <p className="text-[10px] mt-1 opacity-60">{new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {getSessionMessages(session.session_id).length === 0 && (
                                                    <p className="text-center text-xs text-surface-500 py-4">No hay mensajes en esta sesión</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Leads Tab */}
            {activeTab === 'leads' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={exportLeadsCsv}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm cursor-pointer transition-colors">
                            <Download className="w-4 h-4" />Exportar CSV
                        </button>
                    </div>
                    {leadsList.length === 0 ? (
                        <div className="glass-card p-10 text-center">
                            <Users className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                            <p className="text-surface-400">No hay leads capturados</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-surface-700">
                                            <th className="text-left py-3 px-4 text-surface-400 font-medium">Nombre</th>
                                            <th className="text-left py-3 px-4 text-surface-400 font-medium">Email</th>
                                            <th className="text-left py-3 px-4 text-surface-400 font-medium">WhatsApp</th>
                                            <th className="text-left py-3 px-4 text-surface-400 font-medium">Webhook</th>
                                            <th className="text-left py-3 px-4 text-surface-400 font-medium">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leadsList.map(lead => (
                                            <tr key={lead.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                                                <td className="py-3 px-4 text-surface-200">{lead.name || '—'}</td>
                                                <td className="py-3 px-4 text-surface-300">{lead.email || '—'}</td>
                                                <td className="py-3 px-4 text-surface-300">{lead.whatsapp || '—'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.webhook_sent ? 'bg-success/20 text-success' : 'bg-surface-700 text-surface-400'}`}>
                                                        {lead.webhook_sent ? 'Enviado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-surface-400 text-xs">{new Date(lead.created_at).toLocaleDateString('es-CO')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
