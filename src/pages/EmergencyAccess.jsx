import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { emergencyApi, errMsg } from '../api/client'
import EmergencyPatientView from '../components/EmergencyPatientView.jsx'

export default function EmergencyAccess() {
  const { token } = useParams()
  const location = useLocation()
  const [reason, setReason] = useState('')
  const [access, setAccess] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [signInRequired, setSignInRequired] = useState(false)

  const openAccess = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSignInRequired(false)
    try { setAccess(await emergencyApi.openByQr(token, reason.trim())) }
    catch (reasonError) {
      setError(errMsg(reasonError))
      setSignInRequired(reasonError.response?.status === 401 || ['INVALID_ROLE', 'NOT_VERIFIED'].includes(reasonError.response?.data?.code))
    } finally { setBusy(false) }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 py-8 sm:p-8">
      <header className="health-hero rounded-2xl border p-5 sm:p-7"><p className="section-kicker">MedLink emergency workflow</p><h1 className="mt-2 text-3xl">Emergency record access</h1>
        <p className="mt-2 text-sm text-navy-600">Scanning a QR code does not reveal medical information. A verified clinician must sign in, provide a reason, and access is time-limited and audited.</p></header>
      {!access ? <section className="health-panel p-5 sm:p-7">
        <form className="space-y-4" onSubmit={openAccess}>
          <label className="block text-xs font-semibold">Reason for emergency access<textarea className="input mt-1 min-h-24" required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe the reason for accessing this record" /></label>
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Verifying access…' : 'Verify and open emergency summary'}</button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {signInRequired && <p className="mt-3 text-sm"><Link className="font-semibold text-teal-700 underline" to="/clinician/login" state={{ from: location.pathname }}>Sign in with a verified clinician account</Link></p>}
      </section> : <EmergencyPatientView access={access} onClose={() => setAccess(null)} />}
    </main>
  )
}
