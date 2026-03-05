/**
 * IE-02: Supabase Adapter
 * Wrapper para todas las interacciones con Supabase.
 * Ningún componente importa @supabase/supabase-js directamente.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[SupabaseAdapter] Variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configuradas.')
}

const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = supabaseAnonKey || 'placeholder'

const supabase = createClient(url, key, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})

/* ---------- Auth ---------- */

export async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
}

/* ---------- Generic CRUD ---------- */

export async function fetchRows(table, filters = {}) {
    let query = supabase.from(table).select('*')
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
    }
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function fetchSingleRow(table, filters = {}) {
    let query = supabase.from(table).select('*')
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
    }
    const { data, error } = await query.single()
    if (error) throw error
    return data
}

export async function insertRow(table, rowData) {
    const { data, error } = await supabase.from(table).insert(rowData).select().single()
    if (error) throw error
    return data
}

export async function updateRow(table, id, updates) {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
}

export async function deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
}

export async function upsertRow(table, rowData) {
    const { data, error } = await supabase.from(table).upsert(rowData).select().single()
    if (error) throw error
    return data
}

/* ---------- Storage ---------- */

export async function uploadFile(bucket, filePath, file) {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
    })
    if (error) throw error
    return data
}

export function getPublicUrl(bucket, filePath) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
}

export async function deleteFile(bucket, filePath) {
    const { error } = await supabase.storage.from(bucket).remove([filePath])
    if (error) throw error
}

/* ---------- Realtime ---------- */

export function subscribeToTable(table, callback) {
    const channel = supabase
        .channel(`realtime-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe()
    return () => supabase.removeChannel(channel)
}

/* ---------- RPC ---------- */

export async function callRpc(functionName, params = {}) {
    const { data, error } = await supabase.rpc(functionName, params)
    if (error) throw error
    return data
}

/* ---------- Raw client (escapatoria controlada) ---------- */

export function getSupabaseClient() {
    return supabase
}

export default supabase
