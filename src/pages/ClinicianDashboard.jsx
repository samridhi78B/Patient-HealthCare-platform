import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clinicianApi, emergencyApi, errMsg } from '../api/client'
import EmergencyPatientView from '../components/EmergencyPatientView.jsx'

export default function ClinicianDashboard() {
  const navigate = useNavigate()
  const [clinician, setClinician] = useState(null)
  const [entries, setEntries] = useState([])
  const [patientId, setPatientId] = useState('')
  const [reason, setReason] = useState('')
  const [access, setAccess] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([clinicianApi.me(), clinicianApi.accessHistory()])
      .then(([me, history]) => {
        if (!active) return
        setClinician(me.clinician)
        setEntries(history.entries)
      })
      .catch(reason => { if (active) setError(errMsg(reason)) })
    return () => { active = false }
  }, [])

  const openPatient = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      setAccess(await emergencyApi.openByPatientId(patientId.trim(), reason.trim()))
      const history = await clinicianApi.accessHistory()
      setEntries(history.entries)
    } catch (reasonError) { setError(errMsg(reasonError)) } finally { setBusy(false) }
  }

  const signOut = async () => {
    await clinicianApi.logout()
    navigate('/clinician/login', { replace: true })
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker">MedLink clinician workspace</p><h1 className="mt-2 text-3xl">Clinician dashboard</h1>
          {clinician && <p className="mt-2 text-sm text-navy-600">{clinician.name} · License {clinician.licenseNumber} · {clinician.specialization}</p>}</div>
        <button className="btn-outline" type="button" onClick={signOut}>Sign out</button>
      </header>

      <section className="health-panel p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Find patient emergency information</h2>
        <p className="mt-1 text-sm text-navy-500">Enter a patient ID or scan their QR on the emergency access page. Access requires a reason and is audited.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={openPatient}>
          <label className="text-xs font-semibold">Patient ID<input className="input mt-1" required value={patientId} onChange={event => setPatientId(event.target.value)} /></label>
          <label className="text-xs font-semibold">Reason for access<input className="input mt-1" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Brief emergency reason" /></label>
          <button className="btn-primary self-end" type="submit" disabled={busy}>{busy ? 'Checking…' : 'View Emergency Data'}</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>

      {access && <EmergencyPatientView access={access} onClose={() => setAccess(null)} />}

      <section className="health-panel p-5 sm:p-7">
        <h2 className="text-xl font-semibold">My access history</h2>
        <p className="mt-1 text-sm text-navy-500">Recent patient record actions performed by this clinician.</p>
        {!entries.length ? <p className="mt-4 text-sm text-navy-500">No access events recorded.</p> : <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-ink/10 text-xs uppercase text-navy-500"><th className="py-2">When</th><th>Patient</th><th>Action</th><th>Reason</th></tr></thead>
            <tbody>{entries.map(entry => <tr className="border-b border-ink/10" key={entry._id}><td className="py-3">{new Date(entry.timestamp).toLocaleString()}</td><td>{entry.patientId?.name || 'Patient unavailable'}</td><td>{entry.action}</td><td>{entry.reason || 'Not provided'}</td></tr>)}</tbody></table>
        </div>}
      </section>
    </main>
  )
}
