import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Download, FileHeart, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appointmentsApi, errMsg, reportsApi } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'

const dateOnly = value => new Date(value).toISOString().slice(0, 10)
const formatDate = value => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
const testKey = result => `${result.testName.trim().toLocaleLowerCase()}|${result.unit.trim()}`
const numberLabel = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(value)
const today = () => new Date().toISOString().slice(0, 10)
const emptyResult = () => ({ testName: '', value: '', unit: '', testDate: today() })

function ResultForm({ initial, saving, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    try { await onSave({ ...form, value: Number(form.value) }) }
    catch (e) { setError(errMsg(e)) }
  }
  return <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2">
    <label className="text-sm font-semibold">Test name<input className="input mt-1" name="testName" required maxLength="120" placeholder="e.g. Hemoglobin" value={form.testName} onChange={change} /></label>
    <label className="text-sm font-semibold">Numeric value<input className="input mt-1" name="value" type="number" step="any" required value={form.value} onChange={change} /></label>
    <label className="text-sm font-semibold">Unit<input className="input mt-1" name="unit" required maxLength="40" placeholder="e.g. g/dL" value={form.unit} onChange={change} /></label>
    <label className="text-sm font-semibold">Test date<input className="input mt-1" name="testDate" type="date" required max={today()} value={form.testDate} onChange={change} /></label>
    <p className="text-xs leading-5 text-navy-500 sm:col-span-2">Enter values exactly as shown on your report. MedLink does not extract or infer results from uploaded files.</p>
    {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    <div className="flex gap-2 sm:col-span-2"><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save test result'}</button><button type="button" className="btn-outline" disabled={saving} onClick={onCancel}>Cancel</button></div>
  </form>
}

function TrendChart({ resultKey, reports }) {
  const points = useMemo(() => reports.flatMap(report => (report.testResults || [])
    .filter(result => testKey(result) === resultKey)
    .map(result => ({ ...result, reportTitle: report.title })))
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate)), [reports, resultKey])
  if (points.length < 2) return <p className="mt-4 text-sm text-navy-500">At least two dated results with the same test and unit are needed to show a trend.</p>

  const values = points.map(point => point.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) { min -= Math.abs(min) * 0.1 || 1; max += Math.abs(max) * 0.1 || 1 }
  const coords = points.map((point, index) => ({
    ...point,
    x: 36 + (index * 568) / Math.max(points.length - 1, 1),
    y: 205 - ((point.value - min) / (max - min)) * 170,
  }))
  const unit = points[0].unit
  return <div className="mt-4">
    <div className="overflow-x-auto"><svg className="min-w-[440px] w-full" viewBox="0 0 640 260" role="img" aria-label={`Trend chart for ${points[0].testName} in ${unit}`}>
      <line x1="32" y1="205" x2="608" y2="205" stroke="var(--chart-grid)" />
      <polyline points={coords.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="var(--chart-line)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((point, index) => <g key={`${point._id || point.testDate}-${index}`}>
        <circle cx={point.x} cy={point.y} r="5" fill="var(--chart-line)" />
        <text x={point.x} y={Math.max(18, point.y - 12)} textAnchor="middle" fontSize="12" fill="var(--ink)">{numberLabel(point.value)} {unit}</text>
        <text x={point.x} y="230" textAnchor="middle" fontSize="11" fill="var(--chart-label)">{formatDate(point.testDate)}</text>
      </g>)}
    </svg></div>
    <ul className="mt-3 grid gap-2 text-xs text-navy-500 sm:grid-cols-2">{coords.map((point, index) => <li key={`${point._id || point.testDate}-label-${index}`}>{formatDate(point.testDate)} · {numberLabel(point.value)} {point.unit} <span className="text-navy-400">({point.reportTitle})</span></li>)}</ul>
  </div>
}

export default function HealthTimeline() {
  const toast = useToast()
  const [reports, setReports] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportError, setReportError] = useState('')
  const [appointmentError, setAppointmentError] = useState('')
  const [firstId, setFirstId] = useState('')
  const [secondId, setSecondId] = useState('')
  const [metricKey, setMetricKey] = useState('')
  const [entry, setEntry] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setReportError('')
    setAppointmentError('')
    const results = await Promise.allSettled([reportsApi.list({ sort: 'oldest' }), appointmentsApi.list()])
    if (results[0].status === 'fulfilled') setReports(results[0].value.reports)
    else setReportError(errMsg(results[0].reason))
    if (results[1].status === 'fulfilled') setAppointments(results[1].value.appointments)
    else setAppointmentError(errMsg(results[1].reason))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const firstReport = reports.find(report => report._id === firstId)
  const secondReport = reports.find(report => report._id === secondId)
  const comparable = useMemo(() => {
    if (!firstReport || !secondReport || firstReport._id === secondReport._id) return []
    const secondKeys = new Set((secondReport.testResults || []).map(testKey))
    return [...new Map((firstReport.testResults || [])
      .filter(result => secondKeys.has(testKey(result)))
      .map(result => [testKey(result), { key: testKey(result), testName: result.testName, unit: result.unit }])).values()]
  }, [firstReport, secondReport])
  const selectedMetric = comparable.find(metric => metric.key === metricKey) || comparable[0]
  const firstValue = selectedMetric && firstReport.testResults.find(result => testKey(result) === selectedMetric.key)
  const secondValue = selectedMetric && secondReport.testResults.find(result => testKey(result) === selectedMetric.key)
  const timeline = useMemo(() => [
    ...reports.map(report => ({ kind: 'report', id: report._id, date: report.createdAt, report })),
    ...appointments.map(appointment => ({ kind: 'appointment', id: appointment._id, date: appointment.appointmentAt, appointment })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)), [reports, appointments])

  const updateReport = report => setReports(current => current.map(item => item._id === report._id ? report : item))
  const saveResult = async data => {
    setSaving(true)
    try {
      const result = entry.result
        ? await reportsApi.updateTestResult(entry.report._id, entry.result._id, data)
        : await reportsApi.addTestResult(entry.report._id, data)
      updateReport(result.report)
      setEntry(null)
      toast.success(entry.result ? 'Test result updated' : 'Test result saved')
    } finally { setSaving(false) }
  }
  const deleteResult = async (report, result) => {
    if (!window.confirm(`Remove the manually entered ${result.testName} result?`)) return
    try {
      const response = await reportsApi.removeTestResult(report._id, result._id)
      updateReport(response.report)
      toast.success('Test result removed')
    } catch (e) { toast.error(errMsg(e)) }
  }
  const downloadSummary = () => {
    const lines = [
      'MedLink health summary',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'This summary presents recorded information only. It does not provide a diagnosis or treatment recommendation. Consult a healthcare professional to interpret results.',
      '',
      'MEDICAL REPORTS',
      ...(reports.length ? reports.flatMap(report => [
        `${formatDate(report.createdAt)} — ${report.title} (${report.category})`,
        ...(report.testResults || []).map(result => `  Test: ${result.testName} | Value: ${numberLabel(result.value)} ${result.unit} | Test date: ${formatDate(result.testDate)} (manually entered)`),
      ]) : ['No medical reports recorded.']),
      '',
      'APPOINTMENTS',
      ...(appointments.length ? appointments.map(item => `${formatDate(item.appointmentAt)} — ${item.doctor.name}, ${item.hospital.name} | ${item.status} | ${item.reason}`) : ['No appointments recorded.']),
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'medlink-health-summary.txt'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Health summary downloaded')
  }

  return <div className="space-y-7">
    <header className="page-intro flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
      <div><p className="section-kicker">Your health records</p><h1 className="mt-1 text-3xl sm:text-4xl">Medical history timeline</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">Review your saved reports and appointments, and compare patient-entered test results when the test and unit match.</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/reports" className="btn-outline"><FileHeart size={16} />Medical reports</Link><button type="button" className="btn-primary" onClick={downloadSummary} disabled={loading || !!reportError || !!appointmentError}><Download size={16} />Download health summary</button></div>
    </header>
    <div role="note" className="border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">MedLink presents recorded information, not diagnoses or treatment recommendations. Test results are manually entered and are not extracted from uploaded files. Please consult a healthcare professional to interpret your results.</div>

    <section className="panel p-5 sm:p-7" aria-labelledby="compare-heading">
      <div className="flex items-start gap-3"><Activity size={22} className="mt-1 text-teal-700" /><div><p className="section-kicker">Structured results only</p><h2 id="compare-heading" className="text-2xl">Compare two reports</h2><p className="mt-1 text-sm text-navy-500">Only the same test with the same unit can be compared.</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">First report<select className="input mt-1" value={firstId} onChange={event => { setFirstId(event.target.value); setMetricKey('') }}><option value="">Select a report</option>{reports.map(report => <option key={report._id} value={report._id}>{report.title} · {formatDate(report.createdAt)}</option>)}</select></label>
        <label className="text-sm font-semibold">Second report<select className="input mt-1" value={secondId} onChange={event => { setSecondId(event.target.value); setMetricKey('') }}><option value="">Select a report</option>{reports.map(report => <option key={report._id} value={report._id} disabled={report._id === firstId}>{report.title} · {formatDate(report.createdAt)}</option>)}</select></label>
      </div>
      {!loading && reports.length < 2 && <p className="mt-4 text-sm text-navy-500">Add at least two medical reports to compare them.</p>}
      {firstReport && secondReport && firstReport._id === secondReport._id && <p role="alert" className="mt-4 text-sm text-red-700">Select two different reports.</p>}
      {firstReport && secondReport && firstReport._id !== secondReport._id && !comparable.length && <p className="mt-4 border border-ink/10 bg-sage-100/50 p-4 text-sm leading-6 text-navy-500">These reports have no matching manually entered test with the same unit. Results with different test names or units cannot be compared. Add structured results to a report below if they are available on the original document.</p>}
      {comparable.length > 0 && selectedMetric && <div className="mt-5 space-y-4">
        <label className="block max-w-md text-sm font-semibold">Comparable test<select className="input mt-1" value={selectedMetric.key} onChange={event => setMetricKey(event.target.value)}>{comparable.map(metric => <option key={metric.key} value={metric.key}>{metric.testName} ({metric.unit})</option>)}</select></label>
        <div className="grid gap-3 md:grid-cols-2">
          {[{ report: firstReport, result: firstValue, label: 'First report' }, { report: secondReport, result: secondValue, label: 'Second report' }].map(item => <article className="border border-ink/10 bg-white p-4" key={item.label}><p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{item.label}</p><h3 className="mt-1 text-lg">{item.report.title}</h3><p className="mt-2 text-2xl font-semibold">{numberLabel(item.result.value)} <span className="text-sm font-normal text-navy-500">{item.result.unit}</span></p><p className="mt-1 text-sm text-navy-500">Test date: {formatDate(item.result.testDate)}</p></article>)}
        </div>
        <p className="border-l-2 border-teal-700 bg-sage-100/50 p-3 text-sm">Change (second report − first report): <strong>{numberLabel(secondValue.value - firstValue.value)} {firstValue.unit}</strong></p>
        <div className="border-t border-ink/10 pt-4"><h3 className="text-lg">Recorded trend · {selectedMetric.testName} ({selectedMetric.unit})</h3><TrendChart resultKey={selectedMetric.key} reports={reports} /></div>
      </div>}
    </section>

    <section aria-labelledby="timeline-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Reports and appointments</p><h2 id="timeline-heading" className="text-2xl">Health timeline</h2></div><span className="text-sm text-navy-500">{timeline.length} {timeline.length === 1 ? 'event' : 'events'}</span></div>
      {(reportError || appointmentError) && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reportError && <p>Reports: {reportError}</p>}{appointmentError && <p>Appointments: {appointmentError}</p>}<button type="button" className="mt-2 underline" onClick={load}>Retry loading timeline</button></div>}
      {loading ? <p className="panel p-6 text-sm text-navy-500" role="status">Loading medical history…</p>
        : !timeline.length && !reportError && !appointmentError ? <div className="panel p-7 text-center"><FileHeart className="mx-auto text-teal-700" size={28} /><h3 className="mt-3 text-lg">Your timeline is ready for your records</h3><p className="mt-2 text-sm text-navy-500">Uploaded medical reports and saved appointments will appear here.</p></div>
          : <ol className="space-y-4 border-l-2 border-sage-200 pl-4 sm:pl-6">
            {timeline.map(item => <li key={`${item.kind}-${item.id}`} className="relative"><span className="absolute -left-[1.54rem] top-5 grid h-7 w-7 place-items-center rounded-full bg-teal-100 text-teal-800 sm:-left-[2.04rem]">{item.kind === 'report' ? <FileHeart size={15} /> : <CalendarDays size={15} />}</span>
              {item.kind === 'report' ? <article className="panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Medical report · {item.report.category}</p><h3 className="mt-1 text-xl">{item.report.title}</h3><p className="mt-1 text-sm text-navy-500">Added {formatDate(item.report.createdAt)} · {item.report.originalName}</p></div>
                  <button type="button" className="btn-outline" onClick={() => setEntry({ report: item.report, result: null, initial: emptyResult() })}><Plus size={15} />Enter test result</button>
                </div>
                {item.report.testResults?.length ? <ul className="mt-4 divide-y divide-ink/10 border-t border-ink/10">{item.report.testResults.map(result => <li key={result._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{result.testName}: {numberLabel(result.value)} {result.unit}</p><p className="text-xs text-navy-500">Test date: {formatDate(result.testDate)} · Manually entered</p></div><div className="flex gap-3 text-sm"><button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setEntry({ report: item.report, result, initial: { testName: result.testName, value: String(result.value), unit: result.unit, testDate: dateOnly(result.testDate) } })}>Edit</button><button type="button" className="font-semibold text-red-700 hover:underline" onClick={() => deleteResult(item.report, result)}><Trash2 className="mr-1 inline" size={14} />Remove</button></div></li>)}</ul>
                  : <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-navy-500">No structured test results entered for this report. Values are never extracted automatically.</p>}
                {entry?.report._id === item.report._id && <ResultForm key={entry.result?._id || `${item.report._id}-new`} initial={entry.initial} saving={saving} onSave={saveResult} onCancel={() => setEntry(null)} />}
              </article> : <article className="panel p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Appointment · <span className="capitalize">{item.appointment.status}</span></p><h3 className="mt-1 text-xl">{item.appointment.reason}</h3><p className="mt-2 flex items-center gap-2 text-sm text-navy-500"><Stethoscope size={15} />{item.appointment.doctor.name} · {item.appointment.hospital.name}</p><p className="mt-1 text-sm text-navy-500">{formatDate(item.appointment.appointmentAt)} · {item.appointment.time}</p>
              </article>}
            </li>)}
          </ol>}
    </section>
  </div>
}
