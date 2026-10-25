import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, MapPin } from 'lucide-react'
import { appointmentsApi, errMsg } from '../../api/client'

const formatDate = date => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
const groups = [
  { key: 'upcoming', title: 'Upcoming' },
  { key: 'completed', title: 'Completed' },
  { key: 'cancelled', title: 'Cancelled' },
]

function AppointmentCard({ appointment, onRefresh }) {
  const [showDetails, setShowDetails] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [dates, setDates] = useState([])
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canChange = appointment.status === 'upcoming' && new Date(appointment.appointmentAt) > new Date()

  const openReschedule = async () => {
    setRescheduling(true)
    setError('')
    try {
      const result = await appointmentsApi.availability(appointment.doctor._id)
      setDates(result.dates)
      if (result.dates[0]) setDate(result.dates[0])
    } catch (e) { setError(errMsg(e)) }
  }
  useEffect(() => {
    if (!rescheduling || !date) return undefined
    let active = true
    appointmentsApi.availability(appointment.doctor._id, { date })
      .then(result => { if (active) { setSlots(result.slots); setTime('') } })
      .catch(e => { if (active) setError(errMsg(e)) })
    return () => { active = false }
  }, [rescheduling, date, appointment.doctor._id])

  const cancel = async () => {
    if (!window.confirm('Cancel this appointment? The time slot will be released for other patients.')) return
    setBusy(true)
    setError('')
    try { await appointmentsApi.cancel(appointment._id); await onRefresh() }
    catch (e) { setError(errMsg(e)) }
    finally { setBusy(false) }
  }
  const reschedule = async () => {
    if (!window.confirm(`Reschedule this appointment to ${formatDate(date)} at ${time}?`)) return
    setBusy(true)
    setError('')
    try { await appointmentsApi.reschedule(appointment._id, { date, time }); setRescheduling(false); await onRefresh() }
    catch (e) { setError(errMsg(e)) }
    finally { setBusy(false) }
  }

  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-teal-700">{appointment.doctor.specialty}</p><h3 className="mt-1 text-lg">{appointment.doctor.name}</h3><p className="mt-1 text-sm text-navy-500">{appointment.hospital.name}</p></div>
        <span className={`px-2 py-1 text-xs font-bold capitalize ${appointment.status === 'upcoming' ? 'bg-teal-50 text-teal-700' : appointment.status === 'completed' ? 'bg-ink/5 text-navy-500' : 'bg-red-50 text-red-700'}`}>{appointment.status}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarClock size={16} className="text-teal-700" />{formatDate(appointment.date)} · {appointment.time}</p>
        <p className="flex items-center gap-2"><MapPin size={16} className="text-teal-700" />{appointment.hospital.location}</p>
        <p className="text-navy-500">Booking ID: <span className="break-all">{appointment._id}</span></p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-outline" type="button" onClick={() => setShowDetails(value => !value)}>{showDetails ? 'Hide details' : 'View details'}</button>
        {canChange && !rescheduling && <><button className="btn-outline" type="button" disabled={busy} onClick={openReschedule}>Reschedule</button><button className="btn-outline" type="button" disabled={busy} onClick={cancel}>Cancel appointment</button></>}
      </div>
      {showDetails && <div className="mt-4 border-t border-ink/10 pt-4 text-sm"><p><span className="font-semibold">Reason:</span> {appointment.reason}</p>{appointment.symptoms && <p className="mt-2"><span className="font-semibold">Additional details:</span> {appointment.symptoms}</p>}<p className="mt-2"><span className="font-semibold">Type / fee:</span> {appointment.appointmentType === 'online' ? 'Online' : 'In-person'} · ₹{appointment.fee.toLocaleString('en-IN')}</p><p className="mt-2 text-navy-500">{appointment.hospital.address}</p></div>}
      {rescheduling && <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold">Choose a new available slot</p>
        {dates.length ? <><label className="sr-only" htmlFor={`reschedule-date-${appointment._id}`}>New appointment date</label><select id={`reschedule-date-${appointment._id}`} className="input" value={date} onChange={e => setDate(e.target.value)}>{dates.map(day => <option key={day} value={day}>{formatDate(day)}</option>)}</select>
          <div className="flex flex-wrap gap-2">{slots.map(slot => <button type="button" key={slot} aria-pressed={slot === time} onClick={() => setTime(slot)} className={`border px-3 py-2 text-sm ${slot === time ? 'border-teal-700 bg-teal-700 text-white' : 'border-ink/20'}`}>{slot}</button>)}</div>
          {!slots.length && <p className="text-sm text-navy-500">No open slots on this date.</p>}
          <div className="flex gap-2"><button type="button" className="btn-primary" disabled={!time || busy} onClick={reschedule}>{busy ? 'Saving…' : 'Confirm reschedule'}</button><button type="button" className="btn-outline" disabled={busy} onClick={() => setRescheduling(false)}>Keep current booking</button></div>
        </> : <p className="text-sm text-navy-500">No available dates are currently listed. {error}</p>}
      </div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  )
}

export default function MyAppointments({ onBook }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { const result = await appointmentsApi.list(); setAppointments(result.appointments) }
    catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <section aria-labelledby="my-appointments-heading">
      <div className="appointments-hero mb-5 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8"><div><p className="section-kicker">Your care calendar</p><h1 id="my-appointments-heading" className="mt-1 text-3xl sm:text-4xl">My appointments</h1><p className="mt-2 text-sm text-navy-500">View and manage appointments saved to your account.</p></div><button className="btn-primary" type="button" onClick={onBook}>Book an appointment</button></div>
      {loading ? <p className="panel p-6 text-sm text-navy-500" role="status">Loading your appointments…</p>
        : error ? <div role="alert" className="panel p-5 text-sm text-red-700">{error} <button className="ml-2 underline" type="button" onClick={load}>Retry</button></div>
          : <div className="space-y-8">{groups.map(group => {
            const items = appointments.filter(item => item.status === group.key)
            return <section key={group.key} aria-labelledby={`appointments-${group.key}`}><h2 id={`appointments-${group.key}`} className="mb-3 text-xl">{group.title} <span className="text-sm font-normal text-navy-500">({items.length})</span></h2>
              {items.length ? <div className="space-y-3">{items.map(item => <AppointmentCard key={item._id} appointment={item} onRefresh={load} />)}</div> : <p className="panel p-5 text-sm text-navy-500">No {group.title.toLowerCase()} appointments.</p>}
            </section>
          })}</div>}
    </section>
  )
}
