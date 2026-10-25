import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth(); const loc = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-teal-600" /></div>
  return user ? children : <Navigate to="/login" replace state={{ from: loc.pathname }} />
}
