import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AdminLayout from './components/organisms/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ApiConfigPage from './pages/ApiConfigPage'
import BotIdentityPage from './pages/BotIdentityPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import WidgetCustomizerPage from './pages/WidgetCustomizerPage'
import ConversationsPage from './pages/ConversationsPage'
import IntegrationsPage from './pages/IntegrationsPage'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="api-config" element={<ApiConfigPage />} />
            <Route path="bot-identity" element={<BotIdentityPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="widget" element={<WidgetCustomizerPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
