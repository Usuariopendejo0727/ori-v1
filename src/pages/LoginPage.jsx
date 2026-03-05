import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            setError('Por favor completa todos los campos.')
            return
        }
        setError(null)
        setIsSubmitting(true)
        try {
            await login(email, password)
            navigate('/')
        } catch (loginError) {
            setError(
                loginError.message === 'Invalid login credentials'
                    ? 'Email o contraseña incorrectos.'
                    : loginError.message || 'Error al iniciar sesión.'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div style={styles.page}>
            {/* Background gradient orbs */}
            <div style={styles.orbTopRight} />
            <div style={styles.orbBottomLeft} />

            <div style={styles.container}>
                {/* Logo */}
                <div style={styles.logoWrapper}>
                    <div style={styles.logoIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.912 5.813a2 2 0 001.272 1.278L21 12l-5.816 1.91a2 2 0 00-1.272 1.278L12 21l-1.912-5.813a2 2 0 00-1.272-1.278L3 12l5.816-1.91a2 2 0 001.272-1.277L12 3z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 style={styles.title}>Ori Admin</h1>
                <p style={styles.subtitle}>Panel de control de Integro Suite</p>

                {/* Login Card */}
                <div style={styles.card}>
                    <form onSubmit={handleSubmit}>
                        {/* Error */}
                        {error && (
                            <div style={styles.errorBox}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div style={styles.fieldGroup}>
                            <label htmlFor="login-email" style={styles.label}>Email</label>
                            <div style={styles.inputWrapper}>
                                <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="M22 7l-10 6L2 7" />
                                </svg>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@integrosuite.com"
                                    style={styles.input}
                                    autoComplete="email"
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#6366f1'
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#334155'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={styles.fieldGroup}>
                            <label htmlFor="login-password" style={styles.label}>Contraseña</label>
                            <div style={styles.inputWrapper}>
                                <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={styles.input}
                                    autoComplete="current-password"
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#6366f1'
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#334155'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                ...styles.submitButton,
                                opacity: isSubmitting ? 0.6 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) e.target.style.background = '#4f46e5'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#6366f1'
                            }}
                        >
                            {isSubmitting ? (
                                <span style={styles.buttonContent}>
                                    <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                                    </svg>
                                    Iniciando sesión...
                                </span>
                            ) : (
                                'Iniciar sesión'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={styles.footer}>Ori Admin Panel — Integro Suite © 2026</p>
            </div>

            {/* Spin animation */}
            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
    orbTopRight: {
        position: 'absolute',
        top: '-120px',
        right: '-120px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
    },
    orbBottomLeft: {
        position: 'absolute',
        bottom: '-120px',
        left: '-120px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
    },
    container: {
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        animation: 'fadeIn 0.4s ease-out',
    },
    logoWrapper: {
        display: 'inline-flex',
        marginBottom: '20px',
    },
    logoIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
    },
    title: {
        fontSize: '30px',
        fontWeight: '700',
        color: '#f1f5f9',
        margin: '0 0 6px',
        letterSpacing: '-0.5px',
    },
    subtitle: {
        fontSize: '15px',
        color: '#64748b',
        margin: '0 0 32px',
        fontWeight: '400',
    },
    card: {
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'left',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        fontSize: '13px',
        marginBottom: '20px',
    },
    fieldGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        color: '#cbd5e1',
        marginBottom: '8px',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        pointerEvents: 'none',
        flexShrink: 0,
    },
    input: {
        width: '100%',
        padding: '12px 16px 12px 44px',
        borderRadius: '10px',
        border: '1px solid #334155',
        background: '#1e293b',
        color: '#f1f5f9',
        fontSize: '14px',
        fontFamily: "'Inter', system-ui, sans-serif",
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    },
    submitButton: {
        width: '100%',
        padding: '13px 20px',
        borderRadius: '10px',
        border: 'none',
        background: '#6366f1',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'background 0.2s, opacity 0.2s',
        marginTop: '4px',
    },
    buttonContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    footer: {
        fontSize: '12px',
        color: '#475569',
        marginTop: '28px',
        fontWeight: '400',
    },
}
