import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { emergencyApi, errMsg } from '../api/client'
import { Loader2 } from 'lucide-react'
import EmergencyPatientView from '../components/EmergencyPatientView.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function EmergencyAccess() {
  const { token } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [checkingDoctor, setCheckingDoctor] = useState(true)
  const [reason, setReason] = useState('')
  const [access, setAccess] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (user?.role === 'Doctor') {
      setCheckingDoctor(false)
      return
    }
    if (!user) {
      navigate('/login', { replace: true, state: { from: location.pathname } })
      return
    }
    navigate('/overview', { replace: true, state: { accessDenied: true } })
  }, [authLoading, location.pathname, navigate, user])

  const openAccess = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { setAccess(await emergencyApi.openByQr(token, reason.trim())) }
    catch (reasonError) {
      if ([401, 403].includes(reasonError.response?.status)) {
        navigate('/login', {
          replace: true,
          state: { from: location.pathname },
        })
        return
      }
      setError(errMsg(reasonError))
    } finally { setBusy(false) }
  }

  if (checkingDoctor) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-teal-600" /></div>
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 py-8 sm:p-8">
      <header className="health-hero rounded-2xl border p-5 sm:p-7"><p className="section-kicker">MedLink emergency workflow</p><h1 className="mt-2 text-3xl">Emergency record access</h1>
        <p className="mt-2 text-sm text-navy-600">Scanning a QR code does not reveal medical information. A clinician must sign in, provide a reason, and access is time-limited and audited.</p></header>
      {!access ? <section className="health-panel p-5 sm:p-7">
        <form className="space-y-4" onSubmit={openAccess}>
          <label className="block text-xs font-semibold">Reason for emergency access<textarea className="input mt-1 min-h-24" required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe the reason for accessing this record" /></label>
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Verifying access…' : 'Verify and open emergency details'}</button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </section> : <EmergencyPatientView
        access={access}
        onClose={() => setAccess(null)}
        onAuthDenied={() => navigate('/login', {
          replace: true,
          state: { from: location.pathname },
        })}
        readOnly
      />}
    </main>
  )
}
