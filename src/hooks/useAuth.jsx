import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, onAuthStateChange, signInWithEmail, signOut } from '../adapters/supabase-adapter'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        getCurrentUser()
            .then((currentUser) => setUser(currentUser))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false))

        const { data: { subscription } } = onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
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
