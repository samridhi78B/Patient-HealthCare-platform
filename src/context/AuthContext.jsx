import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { authApi } from '../api/client'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true)
  const authVersion = useRef(0)
  useEffect(() => {
    let active = true
    const version = authVersion.current
    authApi.me()
      .then(d => { if (active && authVersion.current === version) setUser(d.user) })
      .catch(() => { if (active && authVersion.current === version) setUser(null) })
      .finally(() => { if (active && authVersion.current === version) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const f = () => { authVersion.current++; setUser(null); setLoading(false) }
    window.addEventListener('medlink:unauthorized', f)
    return () => window.removeEventListener('medlink:unauthorized', f)
  }, [])
  const login = useCallback(async creds => {
    const d = await authApi.login(creds)
    authVersion.current++
    setUser(d.user)
    setLoading(false)
    return d.user
  }, [])
  const logout = useCallback(async () => {
    authVersion.current++
    try { await authApi.logout() } finally { setUser(null); setLoading(false) }
  }, [])
  const updateUser = useCallback(updates => setUser(current => current ? { ...current, ...updates } : current), [])
  return <Ctx.Provider value={{ user, loading, login, logout, updateUser }}>{children}</Ctx.Provider>
}
