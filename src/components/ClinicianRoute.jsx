import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { clinicianApi, errMsg } from '../api/client'

export default function ClinicianRoute({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    clinicianApi.me()
      .then(() => { if (active) setStatus('allowed') })
      .catch(reason => {
        if (!active) return
        setError(errMsg(reason))
        setStatus(reason.response?.status === 403 ? 'blocked' : 'signed-out')
      })
    return () => { active = false }
  }, [])

  if (status === 'checking') {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-teal-600" /></div>
  }
  if (status === 'allowed') return children
  if (status === 'blocked') {
    return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-semibold">Clinician access unavailable</h1><p role="alert" className="mt-3 text-navy-600">{error}</p><Link className="btn-outline mt-5 inline-flex" to="/clinician/login">Return to clinician sign in</Link></main>
  }
  return <Navigate to="/clinician/login" replace state={{ from: location.pathname }} />
}
