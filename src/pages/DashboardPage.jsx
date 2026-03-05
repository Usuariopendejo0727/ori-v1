import { useState, useEffect } from 'react'
import { fetchRows } from '../adapters/supabase-adapter'
import { useAuth } from '../hooks/useAuth'
import {
    MessageSquare, Users, TrendingDown, ThumbsUp,
    Clock, AlertCircle, Loader2
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

function StatCard({ icon: Icon, label, value, subtext, colorClass = 'text-primary-400' }) {
    return (
        <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-current/10 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-surface-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-surface-50">{value}</p>
            {subtext && <p className="text-xs text-surface-500 mt-1">{subtext}</p>}
        </div>
    )
}

export default function DashboardPage() {
    const { user } = useAuth()
    const [sessions, setSessions] = useState([])
    const [leadsList, setLeadsList] = useState([])
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        setIsLoading(true)
        setError(null)
        try {
            const [sessionsData, leadsData, messagesData] = await Promise.all([
                fetchRows('chat_sessions').catch(() => []),
                fetchRows('leads').catch(() => []),
                fetchRows('chat_messages').catch(() => []),
            ])
            setSessions(sessionsData)
            setLeadsList(leadsData)
            setMessages(messagesData)
        } catch (fetchError) {
            setError(fetchError.message)
        } finally {
            setIsLoading(false)
        }
    }

    const totalConversations = sessions.length
    const totalLeads = leadsList.length
    const positveFeedback = messages.filter(m => m.feedback === 'positive').length
    const negativeFeedback = messages.filter(m => m.feedback === 'negative').length
    const totalFeedback = positveFeedback + negativeFeedback
    const satisfactionRate = totalFeedback > 0
        ? Math.round((positveFeedback / totalFeedback) * 100)
        : 0
    const fallbackCount = messages.filter(m =>
        m.role === 'assistant' && m.sources && JSON.parse(JSON.stringify(m.sources)).length === 0
    ).length
    const fallbackRate = messages.filter(m => m.role === 'assistant').length > 0
        ? Math.round((fallbackCount / messages.filter(m => m.role === 'assistant').length) * 100)
        : 0

    // Mock chart data (real data would come from aggregations)
    const chartData = [
        { name: 'Lun', conversations: 12, leads: 3 },
        { name: 'Mar', conversations: 19, leads: 5 },
        { name: 'Mié', conversations: 15, leads: 4 },
        { name: 'Jue', conversations: 22, leads: 7 },
        { name: 'Vie', conversations: 28, leads: 9 },
        { name: 'Sáb', conversations: 8, leads: 2 },
        { name: 'Dom', conversations: 5, leads: 1 },
    ]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-50">Dashboard</h1>
                <p className="text-surface-400 mt-1">Métricas de rendimiento de Ori</p>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={MessageSquare}
                    label="Conversaciones"
                    value={totalConversations}
                    subtext="Total acumulado"
                    colorClass="text-primary-400"
                />
                <StatCard
                    icon={Users}
                    label="Leads capturados"
                    value={totalLeads}
                    subtext="Total acumulado"
                    colorClass="text-success"
                />
                <StatCard
                    icon={ThumbsUp}
                    label="Satisfacción"
                    value={`${satisfactionRate}%`}
                    subtext={`${totalFeedback} respuestas evaluadas`}
                    colorClass="text-warning"
                />
                <StatCard
                    icon={TrendingDown}
                    label="Tasa de Fallback"
                    value={`${fallbackRate}%`}
                    subtext="Respuestas sin contexto"
                    colorClass="text-danger"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversations Chart */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-surface-100 mb-4">Conversaciones esta semana</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="conversationGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#f1f5f9',
                                        fontSize: '13px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="conversations"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#conversationGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leads Chart */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-surface-100 mb-4">Leads capturados esta semana</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#f1f5f9',
                                        fontSize: '13px'
                                    }}
                                />
                                <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Conversations */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-surface-100 mb-4">Conversaciones recientes</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-700">
                                <th className="text-left py-3 px-4 text-surface-400 font-medium">Session ID</th>
                                <th className="text-left py-3 px-4 text-surface-400 font-medium">Idioma</th>
                                <th className="text-left py-3 px-4 text-surface-400 font-medium">Mensajes</th>
                                <th className="text-left py-3 px-4 text-surface-400 font-medium">Lead</th>
                                <th className="text-left py-3 px-4 text-surface-400 font-medium">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10">
                                        <MessageSquare className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                                        <p className="text-surface-400">No hay conversaciones todavía.</p>
                                        <p className="text-xs text-surface-500 mt-1">Las conversaciones aparecerán aquí cuando los usuarios interactúen con Ori.</p>
                                    </td>
                                </tr>
                            ) : (
                                sessions.slice(0, 5).map(session => (
                                    <tr key={session.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                                        <td className="py-3 px-4 font-mono text-surface-300 text-xs">{session.session_id?.substring(0, 12)}...</td>
                                        <td className="py-3 px-4 text-surface-300">{session.language?.toUpperCase()}</td>
                                        <td className="py-3 px-4 text-surface-300">{session.message_count}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.lead_captured ? 'bg-success/20 text-success' : 'bg-surface-700 text-surface-400'
                                                }`}>
                                                {session.lead_captured ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-surface-400 text-xs">
                                            {new Date(session.started_at).toLocaleDateString('es-CO')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
