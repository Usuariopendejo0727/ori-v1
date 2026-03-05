import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, onAuthStateChange, signInWithEmail, signOut } from '../adapters/supabase-adapter'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            try {
                const currentUser = await getCurrentUser()
                if (mounted) setUser(currentUser)
            } catch {
                if (mounted) setUser(null)
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        checkSession()

        const { data: { subscription } } = onAuthStateChange((_event, session) => {
            if (mounted) {
                setUser(session?.user ?? null)
                setIsLoading(false)
            }
        })

        return () => {
            mounted = false;
            subscription.unsubscribe()
        }
    }, [])

    const login = async (email, password) => {
        const data = await signInWithEmail(email, password)
        setUser(data.user)
        return data
    }

    const logout = async () => {
        await signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider')
    }
    return context
}
