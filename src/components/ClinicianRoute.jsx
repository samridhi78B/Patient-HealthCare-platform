import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ClinicianRoute({ children }) {
  const location = useLocation()
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-teal-600" /></div>
  }
  if (user?.role === 'Doctor') return children
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Navigate to="/overview" replace state={{ accessDenied: true }} />
}
