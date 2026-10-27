import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Download, NotebookPen, Plus, Trash2 } from 'lucide-react'
import { journalApi, errMsg } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'

const CATEGORIES = [
  ['general', 'General'],
  ['pain', 'Pain'],
  ['respiratory', 'Respiratory'],
  ['digestive', 'Digestive'],
  ['neurological', 'Neurological'],
  ['skin', 'Skin'],
  ['emotional', 'Emotional wellbeing'],
  ['other', 'Other'],
]
const today = () => new Date().toISOString().slice(0, 10)
const toLocalDate = value => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const toDateTimeInput = value => {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
const formatDate = value => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
const formatDateTime = value => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const freshEntry = () => ({
  symptom: '',
  category: 'general',
  severity: 5,
  occurredAt: toDateTimeInput(new Date()),
  durationValue: '',
  durationUnit: '',
  bodyLocation: '',
  notes: '',
  triggers: '',
  dailyImpact: '',
  appointmentId: '',
})
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

function EntryForm({ initial, appointments, saving, appointmentError, onSave, onCancel, onRetryAppointments }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    const occurredAt = new Date(form.occurredAt)
    if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date()) {
      setError('Choose a valid date and time that is not in the future.')
      return
    }
    if ((form.durationValue === '') !== (form.durationUnit === '')) {
      setError('Choose both a duration and its unit, or leave both blank.')
      return
    }
    try {
      await onSave({
        ...form,
        severity: Number(form.severity),
        occurredAt: occurredAt.toISOString(),
        durationValue: form.durationValue === '' ? null : Number(form.durationValue),
        appointmentId: form.appointmentId || null,
      })
    } catch (e) { setError(errMsg(e)) }
  }
  return <form onSubmit={submit} className="panel space-y-4 p-5 sm:p-7">
    <div className="flex items-center justify-between gap-3"><div><p className="section-kicker">{initial._id ? 'Update your record' : 'Patient-recorded entry'}</p><h2 className="mt-1 text-2xl">{initial._id ? 'Edit symptom entry' : 'Log a symptom'}</h2></div><button type="button" className="btn-outline" onClick={onCancel}>Cancel</button></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold">Symptom name or type<input className="input mt-1" name="symptom" required minLength="2" maxLength="100" placeholder="e.g. headache, fatigue, cough" value={form.symptom} onChange={update} /></label>
      <label className="text-sm font-semibold">Category<select className="input mt-1" name="category" required value={form.category} onChange={update}>{CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">Severity: {form.severity} / 10<input className="mt-3 w-full accent-teal-700" type="range" min="1" max="10" name="severity" value={form.severity} onChange={update} /><span className="flex justify-between text-xs font-normal text-navy-500"><span>1 · Mild</span><span>10 · Severe</span></span></label>
      <label className="text-sm font-semibold">Date and time<input className="input mt-1" type="datetime-local" name="occurredAt" required max={toDateTimeInput(new Date())} value={form.occurredAt} onChange={update} /></label>
      <fieldset className="grid grid-cols-[1fr_1fr] gap-2"><legend className="mb-1 text-sm font-semibold">Duration <span className="font-normal text-navy-500">(optional)</span></legend><input className="input" type="number" min="0" max="100000" step="any" name="durationValue" aria-label="Duration value" placeholder="e.g. 30" value={form.durationValue} onChange={update} /><select className="input" name="durationUnit" aria-label="Duration unit" value={form.durationUnit} onChange={update}><option value="">Unit</option><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></fieldset>
      <label className="text-sm font-semibold">Body location <span className="font-normal text-navy-500">(optional)</span><input className="input mt-1" name="bodyLocation" maxLength="100" placeholder="e.g. lower back" value={form.bodyLocation} onChange={update} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Notes <span className="font-normal text-navy-500">(optional)</span><textarea className="input mt-1" name="notes" rows="3" maxLength="2000" placeholder="Describe what you experienced" value={form.notes} onChange={update} /></label>
      <label className="text-sm font-semibold">Triggers or circumstances <span className="font-normal text-navy-500">(optional)</span><textarea className="input mt-1" name="triggers" rows="3" maxLength="1000" placeholder="Anything you noticed beforehand" value={form.triggers} onChange={update} /></label>
      <label className="text-sm font-semibold">Impact on daily activities <span className="font-normal text-navy-500">(optional)</span><textarea className="input mt-1" name="dailyImpact" rows="3" maxLength="1000" placeholder="How it affected your day" value={form.dailyImpact} onChange={update} /></label>
      <label className="text-sm font-semibold sm:col-span-2 lg:col-span-1">Related appointment <span className="font-normal text-navy-500">(optional)</span><select className="input mt-1" name="appointmentId" value={form.appointmentId || ''} onChange={update}><option value="">No appointment</option>{appointments.map(item => <option key={item._id} value={item._id}>{formatDate(item.appointmentAt)} · {item.doctor?.name || 'Provider'} · {item.status}</option>)}</select></label>
    </div>
    {appointmentError && <p role="status" className="text-sm text-amber-800">{appointmentError} <button type="button" className="underline" onClick={onRetryAppointments}>Retry</button></p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving entry…' : initial._id ? 'Save changes' : 'Save symptom entry'}</button><p className="text-xs text-navy-500">Only symptom name, category, severity, and date/time are required.</p></div>
  </form>
}

function TrendChart({ points, group }) {
  if (!points.length) return <div className="mt-4 border border-dashed border-ink/20 p-6 text-center text-sm text-navy-500">No symptom entries in this {group === 'week' ? 'weekly' : 'monthly'} view yet. Recorded entries will appear here.</div>
  const y = severity => 205 - ((severity - 1) / 9) * 165
  const coords = points.map((point, index) => ({ ...point, x: points.length === 1 ? 320 : 36 + index * (568 / (points.length - 1)), y: y(point.averageSeverity) }))
  return <div className="mt-4 overflow-x-auto">
    <svg className="min-w-[440px] w-full" viewBox="0 0 640 260" role="img" aria-label="Average recorded symptom severity over time, on a scale from 1 to 10">
      {[1, 5, 10].map(value => <g key={value}><line x1="34" y1={y(value)} x2="610" y2={y(value)} stroke="var(--chart-grid)" /><text x="7" y={y(value) + 4} fontSize="11" fill="var(--chart-label)">{value}</text></g>)}
      {coords.length > 1 && <polyline points={coords.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="var(--chart-line)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {coords.map((point, index) => <g key={point.period}><circle cx={point.x} cy={point.y} r="5" fill="var(--chart-line)" /><text x={point.x} y={Math.max(18, point.y - 12)} textAnchor="middle" fontSize="12" fill="var(--ink)">{point.averageSeverity.toFixed(1)} / 10</text><text x={point.x} y="230" textAnchor="middle" fontSize="11" fill="var(--chart-label)">{point.period}</text><text x={point.x} y="248" textAnchor="middle" fontSize="10" fill="var(--chart-label)">{point.count} {point.count === 1 ? 'entry' : 'entries'}</text></g>)}
    </svg>
  </div>
}

function MonthCalendar({ month, entries, selectedDay, onSelect, onMove }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysCount = new Date(year, monthIndex + 1, 0).getDate()
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysCount }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  const counts = entries.reduce((result, entry) => {
    const key = toLocalDate(entry.occurredAt)
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(month)
  return <section className="panel p-5 sm:p-6" aria-labelledby="journal-calendar-heading">
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="section-kicker">Daily view</p><h2 id="journal-calendar-heading" className="text-xl">{label}</h2></div><div className="flex gap-2"><button type="button" className="btn-outline px-2" aria-label="Previous month" onClick={() => onMove(-1)}><ChevronLeft size={18} /></button><button type="button" className="btn-outline px-2" aria-label="Next month" onClick={() => onMove(1)}><ChevronRight size={18} /></button></div></div>
    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-navy-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span className="py-2" key={day}>{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-1">{cells.map((day, index) => {
      if (!day) return <span key={`empty-${index}`} className="min-h-12 sm:min-h-14" />
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const count = counts[key] || 0
      const active = selectedDay === key
      return <button type="button" key={key} aria-pressed={active} aria-label={`${key}${count ? `, ${count} symptom entries` : ''}`} className={`flex min-h-12 flex-col items-center justify-center border text-sm sm:min-h-14 ${active ? 'border-teal-700 bg-teal-700 text-white' : count ? 'border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100' : 'border-transparent hover:bg-sage-100'}`} onClick={() => onSelect(key)}><span>{day}</span>{count > 0 && <span className={`text-[10px] ${active ? 'text-white/80' : 'text-teal-700'}`}>{count} {count === 1 ? 'entry' : 'entries'}</span>}</button>
    })}</div>
    <div className="mt-4 flex items-start gap-2 border-t border-ink/10 pt-3 text-xs leading-5 text-navy-500"><CalendarDays size={15} className="mt-0.5 shrink-0 text-teal-700" />Calendar counts reflect the current filters. Select a date to see that day's matching entries.</div>
  </section>
}

export default function HealthJournal() {
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [appointments, setAppointments] = useState([])
  const [appointmentsError, setAppointmentsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(true)
  const [entryError, setEntryError] = useState('')
  const [trendError, setTrendError] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [symptomFilter, setSymptomFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [period, setPeriod] = useState('week')
  const [trendSymptom, setTrendSymptom] = useState('')
  const [trendData, setTrendData] = useState(null)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(toLocalDate(new Date()))
  const dateRangeError = (from && !to) || (!from && to)
    ? 'Choose both a start and end date to filter or export by date.'
    : from && to && from > to ? 'The start date must be on or before the end date.' : ''

  const loadAppointments = useCallback(async () => {
    setAppointmentsError('')
    try {
      const result = await journalApi.appointments()
      setAppointments(result.appointments)
    } catch (e) { setAppointmentsError(errMsg(e)) }
  }, [])
  useEffect(() => { loadAppointments() }, [loadAppointments])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setEntryError('')
    try {
      const params = {}
      if (from && to) { params.from = from; params.to = to }
      if (category) params.category = category
      if (severity) params.severity = severity
      if (symptomFilter.trim()) params.symptom = symptomFilter.trim()
      const result = await journalApi.list(params)
      setEntries(result.entries)
    } catch (e) { setEntryError(errMsg(e)) }
    finally { setLoading(false) }
  }, [from, to, category, severity, symptomFilter])
  useEffect(() => { loadEntries() }, [loadEntries])

  const loadTrends = useCallback(async () => {
    setTrendLoading(true)
    setTrendError('')
    try {
      const todayDate = new Date()
      const defaultTo = today()
      const defaultFromDate = new Date(todayDate)
      defaultFromDate.setDate(defaultFromDate.getDate() - (period === 'week' ? 6 : 29))
      const params = {
        from: from && to ? from : defaultFromDate.toISOString().slice(0, 10),
        to: from && to ? to : defaultTo,
        groupBy: period === 'week' ? 'day' : 'week',
      }
      if (category) params.category = category
      if (severity) params.severity = severity
      if (trendSymptom) params.symptom = trendSymptom
      const result = await journalApi.trends(params)
      setTrendData(result)
    } catch (e) { setTrendError(errMsg(e)) }
    finally { setTrendLoading(false) }
  }, [from, to, period, category, severity, trendSymptom])
  useEffect(() => { loadTrends() }, [loadTrends])

  const saveEntry = async values => {
    setSaving(true)
    try {
      if (form?._id) await journalApi.update(form._id, values)
      else await journalApi.create(values)
      toast.success(form?._id ? 'Symptom entry updated' : 'Symptom entry saved')
      setForm(null)
      await Promise.all([loadEntries(), loadTrends()])
    } finally { setSaving(false) }
  }
  const removeEntry = async entry => {
    if (!window.confirm(`Delete the ${entry.symptom} entry from ${formatDateTime(entry.occurredAt)}?`)) return
    setBusyId(entry._id)
    try {
      await journalApi.remove(entry._id)
      toast.success('Symptom entry deleted')
      await Promise.all([loadEntries(), loadTrends()])
    } catch (e) { toast.error(errMsg(e)) }
    finally { setBusyId('') }
  }
  const editEntry = entry => setForm({
    _id: entry._id,
    symptom: entry.symptom,
    category: entry.category,
    severity: entry.severity,
    occurredAt: toDateTimeInput(entry.occurredAt),
    durationValue: entry.durationValue ?? '',
    durationUnit: entry.durationUnit || '',
    bodyLocation: entry.bodyLocation || '',
    notes: entry.notes || '',
    triggers: entry.triggers || '',
    dailyImpact: entry.dailyImpact || '',
    appointmentId: entry.appointment?._id || '',
  })

  const selectedEntries = useMemo(() => entries.filter(entry => toLocalDate(entry.occurredAt) === selectedDay), [entries, selectedDay])
  const currentMonthEntries = useMemo(() => entries.filter(entry => {
    const date = new Date(entry.occurredAt)
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  }), [entries, month])
  const moveMonth = amount => {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
    setSelectedDay('')
  }

  const exportHistory = async () => {
    if (!from || !to) {
      toast.error('Choose both a start and end date in the filters before exporting.')
      return
    }
    if (from > to) {
      toast.error('The start date must be on or before the end date.')
      return
    }
    try {
      const data = await journalApi.export({ from, to })
      if (!data.entries.length) {
        toast.error('There are no symptom entries in the selected date range.')
        return
      }
      const rows = data.entries.map(entry => `<article><h2>${escapeHTML(entry.symptom)} <span>· ${escapeHTML(entry.severity)}/10</span></h2><p><strong>Recorded:</strong> ${escapeHTML(formatDateTime(entry.occurredAt))} &nbsp; <strong>Category:</strong> ${escapeHTML(entry.category)}</p>${entry.durationValue !== null ? `<p><strong>Duration:</strong> ${escapeHTML(entry.durationValue)} ${escapeHTML(entry.durationUnit)}</p>` : ''}${entry.bodyLocation ? `<p><strong>Body location:</strong> ${escapeHTML(entry.bodyLocation)}</p>` : ''}${entry.notes ? `<p><strong>Notes:</strong> ${escapeHTML(entry.notes)}</p>` : ''}${entry.triggers ? `<p><strong>Triggers / circumstances:</strong> ${escapeHTML(entry.triggers)}</p>` : ''}${entry.dailyImpact ? `<p><strong>Impact on daily activities:</strong> ${escapeHTML(entry.dailyImpact)}</p>` : ''}</article>`).join('')
      const frequent = data.summary.frequentSymptoms.map(item => `<li>${escapeHTML(item.symptom)}: ${item.count} ${item.count === 1 ? 'entry' : 'entries'}, average recorded severity ${item.averageSeverity.toFixed(1)}/10</li>`).join('')
      const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MedLink Symptom History</title><style>body{font:15px/1.6 Arial,sans-serif;max-width:850px;margin:32px auto;padding:0 20px;color:#253536}h1{color:#123b40;border-bottom:2px solid #167d78;padding-bottom:12px}h2{font-size:18px;margin-bottom:4px}article{border-bottom:1px solid #ddd;padding:12px 0;break-inside:avoid}p{margin:5px 0}.notice{background:#f7f4ec;border-left:4px solid #167d78;padding:12px}@media print{body{margin:0;max-width:none}.no-print{display:none}}</style></head><body><p class="no-print">To create a PDF, use your browser's Print command and choose “Save as PDF”.</p><h1>MedLink Symptom History</h1><p><strong>Patient:</strong> ${escapeHTML(data.patient.name)}</p><p><strong>Date range:</strong> ${escapeHTML(data.from)} to ${escapeHTML(data.to)}</p><p><strong>Recorded entries:</strong> ${data.summary.count}${data.summary.averageSeverity === null ? '' : ` · Average recorded severity: ${data.summary.averageSeverity.toFixed(1)}/10`}</p><h2>Frequently recorded symptoms</h2><ul>${frequent || '<li>No symptoms recorded in this range.</li>'}</ul><h2>Symptom entries</h2>${rows}<p class="notice">${escapeHTML(data.disclaimer)}</p></body></html>`
      const url = URL.createObjectURL(new Blob([document], { type: 'text/html;charset=utf-8' }))
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = `medlink-symptom-history-${from}-to-${to}.html`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Printable symptom history downloaded. Open it and use Print to save as PDF.')
    } catch (e) { toast.error(errMsg(e)) }
  }

  return <div className="space-y-7">
    <header className="page-intro flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8"><div><p className="section-kicker">Private patient journal</p><h1 className="mt-1 text-3xl sm:text-4xl">Health journal</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">Record symptoms between visits and organize the history you choose to share with your healthcare professional.</p></div><button type="button" className="btn-primary" onClick={() => setForm({ ...freshEntry() })}><Plus size={16} />Log a symptom</button></header>
    <div className="border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">This journal is for recording your experiences, not diagnosing conditions or recommending treatment. Trends do not establish causes or diagnoses. Please consult a healthcare professional for medical advice.</div>

    {form && <EntryForm key={form._id || 'new'} initial={form} appointments={appointments} appointmentError={appointmentsError} onRetryAppointments={loadAppointments} saving={saving} onSave={saveEntry} onCancel={() => setForm(null)} />}

    <section className="panel p-5 sm:p-6" aria-labelledby="journal-filter-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Your records</p><h2 id="journal-filter-heading" className="text-xl">Filter journal</h2></div><button type="button" className="btn-outline" disabled={!!dateRangeError || !from || !to} onClick={exportHistory}><Download size={15} />Export date range</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-semibold">From<input className="input mt-1" type="date" max={to || today()} value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label className="text-sm font-semibold">To<input className="input mt-1" type="date" min={from} max={today()} value={to} onChange={event => setTo(event.target.value)} /></label>
        <label className="text-sm font-semibold">Category<select className="input mt-1" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">Severity<select className="input mt-1" value={severity} onChange={event => setSeverity(event.target.value)}><option value="">All severity levels</option>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} / 10</option>)}</select></label>
        <label className="text-sm font-semibold">Symptom<input className="input mt-1" maxLength="100" placeholder="Exact symptom name" value={symptomFilter} onChange={event => setSymptomFilter(event.target.value)} /></label>
      </div>
      {dateRangeError && <p role="alert" className="mt-3 text-sm text-red-700">{dateRangeError}</p>}
    </section>

    <section className="panel p-5 sm:p-6" aria-labelledby="trends-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Recorded patterns only</p><h2 id="trends-heading" className="text-2xl">Symptom trends</h2></div><div className="flex items-center gap-2"><label htmlFor="trend-period" className="text-sm font-semibold">View</label><select id="trend-period" className="input w-auto" value={period} onChange={event => setPeriod(event.target.value)}><option value="week">Last 7 days</option><option value="month">Last 30 days</option></select></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold" htmlFor="trend-symptom">Symptom</label><select id="trend-symptom" className="input max-w-xs" value={trendSymptom} onChange={event => setTrendSymptom(event.target.value)}><option value="">All recorded symptoms</option>{trendData?.frequentSymptoms.map(item => <option key={item.symptom} value={item.symptom}>{item.symptom}</option>)}</select><span className="text-xs text-navy-500">{from && to ? `Filtered: ${from} to ${to}` : period === 'week' ? 'Showing the last 7 days' : 'Showing the last 30 days'}</span></div>
      {trendError ? <div role="alert" className="mt-4 text-sm text-red-700">{trendError} <button type="button" className="ml-2 underline" onClick={loadTrends}>Retry</button></div>
        : trendLoading ? <p role="status" className="mt-5 text-sm text-navy-500">Loading your symptom trends…</p>
          : <><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Entries in period</p><p className="mt-1 text-2xl font-semibold">{trendData?.count ?? 0}</p></div><div className="surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Average severity{trendSymptom ? ` · ${trendSymptom}` : ''}</p><p className="mt-1 text-2xl font-semibold">{trendData?.averageSeverity === null || trendData?.averageSeverity === undefined ? '—' : `${trendData.averageSeverity.toFixed(1)} / 10`}</p></div><div className="surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Frequently recorded</p><p className="mt-1 text-sm font-semibold">{trendData?.frequentSymptoms.length ? trendData.frequentSymptoms.map(item => `${item.symptom} (${item.count})`).join(' · ') : 'No recorded symptoms'}</p></div></div>
            <div className="mt-5 border-t border-ink/10 pt-4"><h3 className="flex items-center gap-2 text-lg"><Activity size={18} className="text-teal-700" />Average recorded severity over time</h3><p className="mt-1 text-xs text-navy-500">Scale 1–10 · Values are averages of actual entries in each displayed period, not diagnoses.</p><TrendChart points={trendData?.points || []} group={period} /></div></>}
    </section>

    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <MonthCalendar month={month} entries={currentMonthEntries} selectedDay={selectedDay} onSelect={setSelectedDay} onMove={moveMonth} />
      <section aria-labelledby="day-entries-heading"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-kicker">Calendar selection</p><h2 id="day-entries-heading" className="text-xl">{selectedDay ? formatDate(`${selectedDay}T00:00:00`) : 'Select a date'}</h2></div><span className="text-sm text-navy-500">{selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'}</span></div>
        {selectedDay && (loading ? <p role="status" className="panel p-5 text-sm text-navy-500">Loading journal entries…</p>
          : entryError ? <div role="alert" className="panel p-5 text-sm text-red-700">{entryError} <button type="button" className="ml-2 underline" onClick={loadEntries}>Retry</button></div>
            : selectedEntries.length ? <div className="space-y-3">{selectedEntries.map(entry => <article key={entry._id} className="panel p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg">{entry.symptom} <span className="text-sm font-normal text-navy-500">· {entry.severity}/10</span></h3><p className="mt-1 text-xs text-navy-500">{formatDateTime(entry.occurredAt)} · {CATEGORIES.find(([key]) => key === entry.category)?.[1] || entry.category}{entry.durationValue !== null && entry.durationValue !== undefined ? ` · ${entry.durationValue} ${entry.durationUnit}` : ''}</p></div><div className="flex gap-2"><button type="button" className="text-sm font-semibold text-teal-700 hover:underline" onClick={() => editEntry(entry)}>Edit</button><button type="button" aria-label={`Delete ${entry.symptom} entry`} className="rounded p-1 text-red-700 hover:bg-red-50" disabled={busyId === entry._id} onClick={() => removeEntry(entry)}><Trash2 size={16} /></button></div></div>
              {entry.bodyLocation && <p className="mt-2 text-sm"><strong>Location:</strong> {entry.bodyLocation}</p>}{entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Notes:</strong> {entry.notes}</p>}{entry.triggers && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Triggers:</strong> {entry.triggers}</p>}{entry.dailyImpact && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Daily impact:</strong> {entry.dailyImpact}</p>}
              {entry.appointment && <p className="mt-3 border-t border-ink/10 pt-2 text-xs text-navy-500">Linked appointment · {formatDate(entry.appointment.appointmentAt)} · {entry.appointment.doctor?.name || 'Provider'} · {entry.appointment.hospital?.name || 'Location'} · <span className="capitalize">{entry.appointment.status}</span></p>}{!entry.appointment && entry.appointmentId && <p className="mt-3 border-t border-ink/10 pt-2 text-xs text-navy-500">Previously linked appointment is no longer available.</p>}
            </article>)}</div>
              : <p className="panel p-5 text-sm text-navy-500">{entryError ? 'Journal entries could not be loaded.' : 'No matching journal entries for this date. Try another date or adjust the filters.'}</p>)}
      </section>
    </div>

    <section aria-labelledby="all-entries-heading">
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-kicker">Filtered history</p><h2 id="all-entries-heading" className="text-2xl">All journal entries</h2></div><span className="text-sm text-navy-500">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
      {entryError ? <div role="alert" className="panel p-5 text-sm text-red-700">{entryError} <button type="button" className="ml-2 underline" onClick={loadEntries}>Retry</button></div>
        : loading ? <p role="status" className="panel p-5 text-sm text-navy-500">Loading your health journal…</p>
          : entries.length ? <div className="space-y-3">{entries.map(entry => <article className="panel flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5" key={entry._id}><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><h3 className="text-lg">{entry.symptom}</h3><span className="text-sm font-semibold text-teal-700">{entry.severity}/10 severity</span></div><p className="mt-1 text-xs text-navy-500">{formatDateTime(entry.occurredAt)} · {CATEGORIES.find(([key]) => key === entry.category)?.[1] || entry.category}{entry.bodyLocation ? ` · ${entry.bodyLocation}` : ''}</p>{entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{entry.notes}</p>}{entry.appointment && <p className="mt-2 text-xs text-navy-500">Appointment: {formatDate(entry.appointment.appointmentAt)} · {entry.appointment.doctor?.name || 'Provider'} · {entry.appointment.status}</p>}</div><div className="flex gap-3"><button type="button" className="text-sm font-semibold text-teal-700 hover:underline" onClick={() => editEntry(entry)}>Edit</button><button type="button" className="flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline" disabled={busyId === entry._id} onClick={() => removeEntry(entry)}><Trash2 size={14} />Delete</button></div></article>)}</div>
            : <div className="panel p-7 text-center"><NotebookPen className="mx-auto text-teal-700" size={26} /><h3 className="mt-3 text-lg">No symptom entries yet</h3><p className="mt-2 text-sm text-navy-500">Start a private journal entry to keep track of symptoms between visits.</p><button type="button" className="btn-primary mt-4" onClick={() => setForm({ ...freshEntry() })}><Plus size={15} />Log a symptom</button></div>}
    </section>
  </div>
}
