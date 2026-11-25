import { useState } from 'react'
import { Download, Loader2, ShieldCheck } from 'lucide-react'
import { emergencyApi, errMsg } from '../api/client'

const notProvided = value => value || 'Not provided'
const sourceLabel = item => {
  if (item.source === 'report-extracted') return 'Document-extracted'
  if (item.source === 'clinician-entered') return 'Doctor-entered'
  return 'Patient-entered'
}
const statusLabel = item => {
  if (item.verificationStatus === 'clinician-verified') return 'Clinician-verified'
  if (item.verificationStatus === 'patient-reviewed') return 'Patient-reviewed'
  if (item.source === 'patient-entered') return 'Patient-entered; not independently verified'
  return 'Unreviewed — AI-extracted, not a confirmed diagnosis'
}

export default function EmergencyPatientView({ access, onClose }) {
  const [records, setRecords] = useState(null)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [error, setError] = useState('')
  const [savingItem, setSavingItem] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ type: 'observation', title: '', details: '', observedAt: '' })
  const summary = access.summary
  const [history, setHistory] = useState(summary.history || [])

  const closeSession = async () => {
    setError('')
    try {
      await emergencyApi.close(access.accessToken)
      onClose?.()
    } catch (reason) { setError(errMsg(reason)) }
  }

  const loadRecords = async () => {
    setLoadingRecords(true)
    setError('')
    try {
      const result = await emergencyApi.records(access.accessToken)
      setRecords(result)
      setHistory(result.history)
    }
    catch (reason) { setError(errMsg(reason)) } finally { setLoadingRecords(false) }
  }

  const verifyFinding = async item => {
    setSavingItem(item._id || item.id)
    setError('')
    try {
      await emergencyApi.verifyHistoryItem(access.accessToken, item._id || item.id)
      const update = entry => (entry._id || entry.id) === (item._id || item.id)
        ? { ...entry, verificationStatus: 'clinician-verified' }
        : entry
      setHistory(current => current.map(update))
      if (records) setRecords(current => ({ ...current, history: current.history.map(update) }))
    } catch (reason) { setError(errMsg(reason)) } finally { setSavingItem('') }
  }

  const addRecord = async event => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const result = await emergencyApi.addHistoryItem(access.accessToken, form)
      setHistory(current => [result.item, ...current])
      setForm({ type: 'observation', title: '', details: '', observedAt: '' })
      if (records) await loadRecords()
    } catch (reason) { setError(errMsg(reason)) } finally { setCreating(false) }
  }

  const downloadReport = async report => {
    try {
      const response = await emergencyApi.reportFile(access.accessToken, report._id)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = report.originalName || 'medical-report'
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason) { setError(errMsg(reason)) }
  }

  return (
    <section className="health-panel space-y-5 p-5 sm:p-7" aria-label="Authorized emergency medical summary">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-4">
        <div><p className="section-kicker">Emergency medical summary</p><h2 className="mt-1 text-2xl">{notProvided(summary.patient.name)}</h2>
          <p className="mt-1 text-sm text-navy-500">Access expires at {new Date(access.expiresAt).toLocaleTimeString()}</p></div>
        {onClose && <button className="btn-outline" type="button" onClick={closeSession}>Close record</button>}
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="health-detail"><p>Patient ID</p><strong className="break-all">{summary.patient.id}</strong></div>
        <div className="health-detail"><p>Date of birth</p><strong>{notProvided(summary.patient.dateOfBirth)}</strong></div>
        <div className="health-detail"><p>Gender</p><strong>{notProvided(summary.patient.gender)}</strong></div>
        <div className="health-detail"><p>Phone</p><strong>{notProvided(summary.patient.phone)}</strong></div>
        <div className="health-detail"><p>Blood group</p><strong>{notProvided(summary.bloodGroup)}</strong></div>
        <div className="health-detail"><p>Information source</p><strong>Patient-entered profile</strong></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[['Known allergies', summary.allergies], ['Current medications', summary.currentMedications], ['Medical conditions', summary.medicalConditions]].map(([heading, values]) => (
          <div className="health-detail" key={heading}><p>{heading}</p><ul className="mt-2 space-y-1 text-sm">{values.map((value, index) => <li key={`${heading}-${index}`}>{value}</li>)}</ul></div>
        ))}
        <div className="health-detail"><p>Emergency contacts</p><ul className="mt-2 space-y-2 text-sm">{summary.emergencyContacts.map((contact, index) => <li key={`${contact.name}-${index}`}>{contact.name} · {contact.relationship || 'Relationship not provided'} · {contact.phone}</li>)}</ul></div>
        <div className="health-detail sm:col-span-2"><p>Patient-entered medical notes</p><p className="mt-2 whitespace-pre-wrap text-sm">{notProvided(summary.medicalNotes)}</p></div>
      </div>

      <section>
        <h3 className="text-lg font-semibold">Medical history and recent observations</h3>
        <p className="mt-1 text-xs text-navy-500">Sources and verification states are shown separately. AI-extracted observations are not confirmed diagnoses.</p>
        {!history.length ? <p className="mt-3 text-sm text-navy-500">Not provided</p> : <ul className="mt-3 space-y-3">
          {history.map(item => <li key={item._id || item.id} className="rounded-xl border border-ink/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.title}{item.value ? `: ${item.value} ${item.unit || ''}` : ''}</p>
              <p className="mt-1 text-xs text-navy-500">{sourceLabel(item)} · {statusLabel(item)}{item.referenceRange ? ` · Reference: ${item.referenceRange}` : ''}</p></div>
              {item.source === 'report-extracted' && item.verificationStatus !== 'clinician-verified' && <button className="btn-outline text-xs" type="button" disabled={savingItem === (item._id || item.id)} onClick={() => verifyFinding(item)}>{savingItem === (item._id || item.id) ? 'Saving…' : 'Verify as clinician'}</button>}
            </div>
            {item.details && <p className="mt-2 text-sm">{item.details}</p>}
            {item.evidence && <p className="mt-2 text-xs text-navy-500">Report evidence: “{item.evidence}”</p>}
            {(item.sourceReport || item.report) && <p className="mt-2 text-xs text-navy-500">Original report: {item.sourceReport?.title || item.report?.title}{item.sourceReport?.deleted ? ' (original deleted by patient)' : ''}</p>}
          </li>)}
        </ul>}
      </section>

      <details className="rounded-xl border border-ink/10 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><ShieldCheck size={17} />Add a clinician-verified medical record</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addRecord}>
          <label className="text-xs font-semibold">Record type<select className="input mt-1" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{['diagnosis', 'prescription', 'consultation', 'surgery', 'procedure', 'observation'].map(type => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-semibold">Date<input className="input mt-1" type="date" max={new Date().toISOString().slice(0, 10)} value={form.observedAt} onChange={event => setForm({ ...form, observedAt: event.target.value })} /></label>
          <label className="text-xs font-semibold sm:col-span-2">Title<input className="input mt-1" required maxLength={160} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
          <label className="text-xs font-semibold sm:col-span-2">Details<textarea className="input mt-1 min-h-20" maxLength={2000} value={form.details} onChange={event => setForm({ ...form, details: event.target.value })} /></label>
          <button className="btn-primary sm:col-span-2" type="submit" disabled={creating}>{creating ? <Loader2 className="animate-spin" size={16} /> : null}{creating ? 'Saving…' : 'Save clinician record'}</button>
        </form>
      </details>

      <section className="border-t border-ink/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Detailed medical records</h3><p className="text-xs text-navy-500">Original files are only sent through the authorized, time-limited session.</p></div>
          <button className="btn-outline" type="button" disabled={loadingRecords} onClick={loadRecords}>{loadingRecords ? 'Loading…' : records ? 'Refresh records' : 'View detailed records'}</button></div>
        {loadingRecords && <p role="status" className="mt-3 flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" />Loading authorized records…</p>}
        {records && <ul className="mt-3 divide-y divide-ink/10">{records.reports.map(report => <li key={report._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span>{report.title} · {report.category} · {new Date(report.createdAt).toLocaleDateString()}</span>
          <button type="button" className="btn-outline text-xs" onClick={() => downloadReport(report)}><Download size={14} />Download original</button>
        </li>)}</ul>}
      </section>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
