import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, List, UserRound, X } from 'lucide-react'
import { doctorApi, errMsg } from '../api/client'

const pad = value => String(value).padStart(2, '0')
const localKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const displayDate = value => value ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not set'
const displayTime = value => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'Time not set'
const badgeClass = status => status === 'completed' ? 'bg-green-50 text-green-700' : status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([])
  const [status, setStatus] = useState('upcoming')
  const [view, setView] = useState('list')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [day, setDay] = useState('')
  const [selected, setSelected] = useState(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    doctorApi.appointments({ status })
      .then(result => setAppointments(result.appointments))
      .catch(reason => setError(errMsg(reason)))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [status])

  const performAction = async action => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const result = await doctorApi.updateAppointment(selected._id, { action })
      setAppointments(current => current.map(item => item._id === selected._id ? result.appointment : item))
      setSelected(result.appointment)
      if (action === 'cancel' && status !== 'cancelled') setAppointments(current => current.filter(item => item._id !== selected._id))
      if (action === 'complete' && status !== 'completed') setAppointments(current => current.filter(item => item._id !== selected._id))
    } catch (reason) { setError(errMsg(reason)) } finally { setBusy(false) }
  }

  const submitReschedule = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await doctorApi.rescheduleAppointment(selected._id, { date, time })
      setAppointments(current => current.map(item => item._id === selected._id ? result.appointment : item))
      setSelected(result.appointment)
      setRescheduling(false)
    } catch (reason) { setError(errMsg(reason)) } finally { setBusy(false) }
  }

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(offset).fill(null), ...Array.from({ length: numberOfDays }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
  }, [month])
  const datesWithAppointments = useMemo(() => appointments.reduce((map, item) => {
    const key = item.appointmentAt ? localKey(new Date(item.appointmentAt)) : item.date
    if (key) map.set(key, [...(map.get(key) || []), item])
    return map
  }, new Map()), [appointments])
  const visibleAppointments = appointments.filter(item => !day || (item.appointmentAt ? localKey(new Date(item.appointmentAt)) : item.date) === day)

  return (
    <div className="space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker">Schedule</p><h1 className="mt-2 text-3xl">Appointments</h1><p className="mt-2 text-sm text-navy-500">Review patient appointments, update status, or find a new time.</p></div>
        <div className="flex items-center gap-2">
          <button type="button" className={`btn-outline ${view === 'list' ? 'border-teal-700 text-teal-700' : ''}`} onClick={() => setView('list')}><List size={16} />List</button>
          <button type="button" className={`btn-outline ${view === 'calendar' ? 'border-teal-700 text-teal-700' : ''}`} onClick={() => setView('calendar')}><CalendarDays size={16} />Calendar</button>
        </div>
      </header>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Appointment status">
        {['upcoming', 'completed', 'cancelled'].map(value => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setDay('') }} className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${status === value ? 'border-teal-700 bg-teal-700 text-white' : 'border-ink/15 bg-white text-navy-600 hover:bg-sage-100'}`}>{value}</button>)}
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {view === 'calendar' && <section className="health-panel p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}</h2><div className="flex gap-2"><button type="button" className="health-icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><button type="button" className="health-icon-button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div></div>
        <div className="grid grid-cols-7 border-l border-t border-ink/10 text-center text-xs font-semibold text-navy-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(value => <div key={value} className="border-b border-r border-ink/10 p-2">{value}</div>)}
          {calendarDays.map((value, index) => {
            const key = value ? localKey(value) : `blank-${index}`
            const items = value ? datesWithAppointments.get(key) || [] : []
            return <button key={key} type="button" disabled={!value} onClick={() => setDay(day === key ? '' : key)} className={`min-h-20 border-b border-r border-ink/10 p-2 text-left align-top disabled:bg-sage-100/20 ${day === key ? 'bg-blue-50 ring-2 ring-inset ring-blue-600' : 'hover:bg-sage-100/50'}`}>
              {value && <><span className="text-sm font-semibold">{value.getDate()}</span>{items.length > 0 && <span className="mt-1 block rounded bg-blue-100 px-1.5 py-1 text-[10px] font-semibold text-blue-800">{items.length} {items.length === 1 ? 'appointment' : 'appointments'}</span>}</>}
            </button>
          })}
        </div>
        {day && <button className="mt-3 text-sm font-semibold text-teal-700 underline" type="button" onClick={() => setDay('')}>Clear selected date</button>}
      </section>}

      <section className="health-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h2 className="text-lg capitalize">{day ? `Appointments · ${displayDate(`${day}T12:00:00`)}` : `${status} appointments`}</h2><span className="text-xs text-navy-500">{visibleAppointments.length} total</span></div>
        {loading ? <p role="status" className="p-6 text-sm text-navy-500">Loading appointments…</p>
          : visibleAppointments.length ? <ul className="divide-y divide-ink/10">{visibleAppointments.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-100 text-teal-700"><UserRound size={18} /></span><div className="min-w-0"><p className="truncate font-semibold">{item.patient?.name || 'Patient'}</p><p className="mt-1 text-xs text-navy-500">{displayDate(item.appointmentAt)} · {displayTime(item.appointmentAt)} · {item.reason}</p></div></div>
            <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(item.status)}`}>{item.acceptedAt && item.status === 'upcoming' ? 'Accepted' : item.status}</span><button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => { setSelected(item); setDate(item.date || ''); setTime(item.time || ''); setRescheduling(false) }}>Details</button></div>
          </li>)}</ul> : <p className="p-6 text-sm text-navy-500">{day ? 'No appointments on this date.' : `No ${status} appointments.`}</p>}
      </section>

      {selected && <div className="health-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="health-modal panel w-full max-w-xl p-5 sm:p-7" role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title">
          <header className="flex items-start justify-between gap-3 border-b border-ink/10 pb-4"><div><p className="section-kicker">Appointment details</p><h2 id="appointment-detail-title" className="mt-1 text-2xl">{selected.patient?.name || 'Patient'}</h2></div><button type="button" className="health-icon-button" aria-label="Close appointment details" onClick={() => setSelected(null)}><X size={18} /></button></header>
          <dl className="mt-4 grid grid-cols-2 gap-3"><div className="health-detail"><dt>Date & time</dt><dd className="mt-1 text-sm font-semibold">{displayDate(selected.appointmentAt)} · {displayTime(selected.appointmentAt)}</dd></div><div className="health-detail"><dt>Status</dt><dd className="mt-1 text-sm font-semibold capitalize">{selected.status}</dd></div><div className="health-detail"><dt>Hospital</dt><dd className="mt-1 text-sm font-semibold">{selected.hospital?.name || 'Not provided'}</dd></div><div className="health-detail"><dt>Appointment type</dt><dd className="mt-1 text-sm font-semibold capitalize">{selected.appointmentType}</dd></div></dl>
          <div className="mt-3 health-detail"><p>Reason</p><p className="mt-1 text-sm">{selected.reason}</p>{selected.symptoms && <p className="mt-2 whitespace-pre-wrap text-sm text-navy-500">{selected.symptoms}</p>}</div>
          {!rescheduling && selected.status === 'upcoming' && <div className="mt-5 flex flex-wrap gap-2">
            {!selected.acceptedAt && <button type="button" className="btn-primary" disabled={busy} onClick={() => performAction('accept')}>Accept</button>}
            <button type="button" className="btn-outline" onClick={() => setRescheduling(true)}><Clock3 size={15} />Reschedule</button>
            <button type="button" className="btn-outline text-red-700" disabled={busy} onClick={() => performAction('cancel')}>Cancel appointment</button>
          </div>}
          {rescheduling && <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={submitReschedule}>
            <label className="text-xs font-semibold">New date<input className="input mt-1" type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={event => setDate(event.target.value)} /></label>
            <label className="text-xs font-semibold">New time<input className="input mt-1" type="time" required value={time} onChange={event => setTime(event.target.value)} /></label>
            <div className="flex gap-2 sm:col-span-2"><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save new time'}</button><button type="button" className="btn-outline" onClick={() => setRescheduling(false)}>Keep current time</button></div>
          </form>}
          {selected.patient?._id && <Link className="mt-5 inline-flex text-sm font-semibold text-teal-700 underline" to={`/doctor/patients/${selected.patient._id}`}>View patient record</Link>}
        </section>
      </div>}
    </div>
  )
}
