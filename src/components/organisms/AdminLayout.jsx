import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
    LayoutDashboard, Settings, Bot, BookOpen,
    Palette, MessageSquare, Webhook, LogOut, Sparkles
} from 'lucide-react'

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/api-config', icon: Settings, label: 'API y Modelo' },
    { to: '/bot-identity', icon: Bot, label: 'Identidad del Bot' },
    { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
    { to: '/widget', icon: Palette, label: 'Widget' },
    { to: '/conversations', icon: MessageSquare, label: 'Conversaciones' },
    { to: '/integrations', icon: Webhook, label: 'Integraciones' },
]

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-surface-900 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col border-r border-surface-700/50 bg-surface-900/80 backdrop-blur-sm shrink-0">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-700/50">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-surface-50 tracking-tight">Ori</h1>
                        <p className="text-xs text-surface-400">Integro Suite</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${isActive
                                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                                }`
                            }
                        >
                            <Icon className="w-[18px] h-[18px] shrink-0" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-3 py-4 border-t border-surface-700/50">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary-400">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-surface-200 truncate">{user?.email || 'Admin'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-surface-400 hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors duration-200"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
