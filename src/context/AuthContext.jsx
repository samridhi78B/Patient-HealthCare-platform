import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '../api/client'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true)
  useEffect(() => { authApi.me().then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false)) }, [])
  useEffect(() => { const f = () => setUser(null); window.addEventListener('medlink:unauthorized', f); return () => window.removeEventListener('medlink:unauthorized', f) }, [])
  const login = useCallback(async creds => { const d = await authApi.login(creds); setUser(d.user); return d.user }, [])
  const logout = useCallback(async () => { try { await authApi.logout() } finally { setUser(null) } }, [])
  const updateUser = useCallback(updates => setUser(current => current ? { ...current, ...updates } : current), [])
  return <Ctx.Provider value={{ user, loading, login, logout, updateUser }}>{children}</Ctx.Provider>
}
