import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Activity, ArrowLeft, Download, FileHeart, HeartPulse, QrCode, Save, ShieldCheck } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { doctorApi, emergencyApi, errMsg } from '../api/client'
import EmergencyPatientView from '../components/EmergencyPatientView.jsx'

const prettyDate = value => value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not recorded'
const ageLabel = age => age === null || age === undefined ? 'Not provided' : `${age} years`
const empty = values => values?.length ? values : ['Not provided']

export default function DoctorPatientProfile() {
  const { patientId } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [prescription, setPrescription] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [access, setAccess] = useState(null)
  const [reason, setReason] = useState('')
  const [openingEmergency, setOpeningEmergency] = useState(false)
  const [fileBusy, setFileBusy] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    doctorApi.patient(patientId)
      .then(data => { if (active) setRecord(data) })
      .catch(reasonError => { if (active) setError(errMsg(reasonError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  const saveNote = async event => {
    event.preventDefault()
    setSavingNote(true)
    setError('')
    try {
      const result = await doctorApi.addNote(patientId, { note, prescription })
      setRecord(current => ({ ...current, notes: [result.note, ...(current.notes || [])] }))
      setNote('')
      setPrescription('')
    } catch (reasonError) { setError(errMsg(reasonError)) } finally { setSavingNote(false) }
  }

  const openEmergency = async event => {
    event.preventDefault()
    setOpeningEmergency(true)
    setError('')
    try { setAccess(await emergencyApi.openByPatientId(patientId, reason.trim(), true)) }
    catch (reasonError) { setError(errMsg(reasonError)) } finally { setOpeningEmergency(false) }
  }

  const useReportFile = async (report, preview = false) => {
    setFileBusy(report._id)
    setError('')
    try {
      const response = await doctorApi.reportFile(report._id, preview)
      const url = URL.createObjectURL(response.data)
      if (preview) window.open(url, '_blank', 'noopener,noreferrer')
      else {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = report.originalName || report.title || 'medical-report'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (reasonError) { setError(errMsg(reasonError)) } finally { setFileBusy('') }
  }

  const patient = record?.patient
  const metrics = record?.measurements || []
  const chartData = metrics.map(item => ({
    date: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.measuredAt)),
    weight: item.weightKg,
    height: item.heightCm,
  }))

  if (loading) return <p role="status" className="health-panel p-6 text-sm text-navy-500">Loading patient profile…</p>
  if (!patient) return <div className="space-y-4"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Patient profile is unavailable.'}</p><Link className="btn-outline" to="/doctor/patients"><ArrowLeft size={16} />Back to patients</Link></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/doctor/patients" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><ArrowLeft size={16} />All patients</Link><span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-navy-700">Read-only patient record</span></div>
      <header className="health-hero flex flex-wrap items-center justify-between gap-5 rounded-2xl border p-5 sm:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-blue-100 text-xl font-bold text-blue-800">{patient.name.split(/\s+/).map(item => item[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div className="min-w-0"><p className="section-kicker">Patient profile</p><h1 className="mt-1 truncate text-3xl">{patient.name}</h1><p className="mt-1 text-sm text-navy-500">{patient.email} · {patient.phone}</p><p className="mt-1 break-all text-xs text-navy-500">Patient ID · {patient._id}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-64"><div className="health-detail"><p>Age</p><strong>{ageLabel(patient.age)}</strong></div><div className="health-detail"><p>Blood group</p><strong>{patient.bloodGroup || 'Not provided'}</strong></div></div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Patient health information">
        {[
          ['Gender', patient.gender],
          ['Date of birth', prettyDate(patient.dateOfBirth)],
          ['Allergies', patient.allergies],
          ['Chronic conditions', patient.medicalConditions],
          ['Current medications', patient.currentMedications],
          ['Address', patient.address ? [patient.address] : []],
        ].map(([label, values]) => <div className="health-panel p-4" key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
          {Array.isArray(values) ? <ul className="mt-2 space-y-1 text-sm">{empty(values).map((value, index) => <li key={`${label}-${index}`}>{value}</li>)}</ul> : <p className="mt-2 text-sm font-medium">{values || 'Not provided'}</p>}
        </div>)}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="health-panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><Activity size={18} className="text-teal-700" /><div><p className="section-kicker">Record history</p><h2 className="text-xl">Health timeline</h2></div></div>
          {!record.timeline?.length ? <p className="mt-4 text-sm text-navy-500">No timeline events have been recorded.</p>
            : <ol className="mt-5 space-y-4 border-l border-ink/15 pl-5">{record.timeline.map(item => <li key={`${item.type}-${item._id}`} className="relative"><span className="absolute -left-[1.58rem] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-600 ring-4 ring-white" /><p className="text-xs text-navy-500">{prettyDate(item.date)} · <span className="capitalize">{item.type}</span></p><p className="mt-1 text-sm font-semibold">{item.title}</p>{item.details && <p className="mt-1 whitespace-pre-wrap text-sm text-navy-500">{item.details}</p>}</li>)}</ol>}
        </div>
        <div className="health-panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><HeartPulse size={18} className="text-teal-700" /><div><p className="section-kicker">Patient-entered metrics</p><h2 className="text-xl">Health metrics</h2></div></div>
          {chartData.length > 1 && <div className="mt-4 h-52" role="img" aria-label="Patient health metrics chart">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis yAxisId="weight" tick={{ fontSize: 11 }} /><YAxis yAxisId="height" orientation="right" tick={{ fontSize: 11 }} /><Tooltip /><Line yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#4f83cc" strokeWidth={2} dot={false} /><Line yAxisId="height" type="monotone" dataKey="height" name="Height (cm)" stroke="#78c7a7" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </div>}
          {!metrics.length ? <p className="mt-4 text-sm text-navy-500">No health measurements recorded.</p>
            : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[380px] text-left text-sm"><thead><tr className="border-b border-ink/10 text-xs text-navy-500"><th className="py-2">Date</th><th>Height</th><th>Weight</th><th>Waist</th></tr></thead><tbody>{[...metrics].reverse().map(item => <tr key={item._id} className="border-b border-ink/5"><td className="py-2">{prettyDate(item.measuredAt)}</td><td>{item.heightCm} cm</td><td>{item.weightKg} kg</td><td>{item.waistCm ? `${item.waistCm} cm` : '—'}</td></tr>)}</tbody></table></div>}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="health-panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><FileHeart size={18} className="text-teal-700" /><div><p className="section-kicker">Patient uploads</p><h2 className="text-xl">Medical reports</h2></div></div>
          {!record.reports?.length ? <p className="mt-4 text-sm text-navy-500">No reports uploaded.</p>
            : <ul className="mt-4 divide-y divide-ink/10">{record.reports.map(report => <li key={report._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{report.title}</p><p className="mt-1 text-xs text-navy-500">{report.category} · {prettyDate(report.createdAt)}</p></div>
              <div className="flex gap-2"><button type="button" className="btn-outline px-3 py-2 text-xs" disabled={fileBusy === report._id} onClick={() => useReportFile(report, true)}>View</button><button type="button" className="btn-outline px-3 py-2 text-xs" disabled={fileBusy === report._id} onClick={() => useReportFile(report)}><Download size={14} />Download</button></div>
            </li>)}</ul>}
        </div>
        <div className="health-panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><Activity size={18} className="text-teal-700" /><div><p className="section-kicker">Patient journal</p><h2 className="text-xl">Health journal</h2></div></div>
          {!record.journal?.length ? <p className="mt-4 text-sm text-navy-500">No journal entries recorded.</p>
            : <ul className="mt-4 divide-y divide-ink/10">{record.journal.map(item => <li key={item._id} className="py-3"><p className="text-sm font-semibold">{item.symptom} <span className="font-normal text-navy-500">· Severity {item.severity}/10</span></p><p className="mt-1 text-xs text-navy-500">{prettyDate(item.occurredAt)} · {item.category}</p>{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-navy-600">{item.notes}</p>}</li>)}</ul>}
          {!!record.wellness?.length && <div className="mt-5 border-t border-ink/10 pt-4"><h3 className="font-semibold">Wellness metrics</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><thead><tr className="border-b border-ink/10 text-navy-500"><th className="py-2">Date</th><th>Sleep</th><th>Water</th><th>Activity</th></tr></thead><tbody>{[...record.wellness].reverse().slice(0, 10).map(item => <tr key={item._id}><td className="py-2">{prettyDate(item.date)}</td><td>{item.sleepHours} hr</td><td>{item.waterLitres} L</td><td>{item.activityMinutes} min</td></tr>)}</tbody></table></div></div>}
        </div>
      </section>

      <section className="health-panel p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sage-100 text-teal-700"><QrCode size={19} /></span><div><p className="section-kicker">Emergency access</p><h2 className="text-xl">Emergency QR details</h2><p className="mt-1 text-sm text-navy-500">{patient.emergencyQr?.active ? 'The patient has an active emergency QR. Open a logged, time-limited emergency session to view emergency details.' : 'No active emergency QR is available for this patient.'}</p></div></div>
        {patient.emergencyQr?.active && <form onSubmit={openEmergency} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="text-xs font-semibold">Reason for emergency access<input className="input mt-1" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe the care context" /></label>
          <button type="submit" disabled={openingEmergency} className="btn-primary self-end"><ShieldCheck size={16} />{openingEmergency ? 'Opening…' : 'View emergency details'}</button>
        </form>}
      </section>
      {access && <EmergencyPatientView access={access} onClose={() => setAccess(null)} readOnly />}

      <section className="health-panel p-5 sm:p-6">
        <div><p className="section-kicker">Clinical notes</p><h2 className="text-xl">Doctor notes & prescription</h2><p className="mt-1 text-sm text-navy-500">Add a care note or prescription. Other patient details remain read-only.</p></div>
        <form className="mt-4 space-y-3" onSubmit={saveNote}>
          <label className="block text-xs font-semibold">Doctor note<textarea className="input mt-1 min-h-24" required maxLength={5000} value={note} onChange={event => setNote(event.target.value)} /></label>
          <label className="block text-xs font-semibold">Prescription<textarea className="input mt-1 min-h-20" maxLength={5000} value={prescription} onChange={event => setPrescription(event.target.value)} /></label>
          <button type="submit" className="btn-primary" disabled={savingNote}><Save size={16} />{savingNote ? 'Saving…' : 'Save note'}</button>
        </form>
        {record.notes?.length > 0 && <ul className="mt-5 divide-y divide-ink/10 border-t border-ink/10">{record.notes.map(item => <li key={item._id} className="py-4"><p className="text-sm font-semibold">{item.clinicianId?.name || 'Doctor'} <span className="font-normal text-navy-500">· {prettyDate(item.createdAt)}</span></p><p className="mt-2 whitespace-pre-wrap text-sm">{item.note}</p>{item.prescription && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-sage-100/50 p-3 text-sm"><strong>Prescription:</strong> {item.prescription}</p>}</li>)}</ul>}
      </section>
      <div className="flex justify-start"><Link to="/doctor/appointments" className="btn-outline">View appointments</Link></div>
    </div>
  )
}
