import { useEffect, useState } from 'react'
import { CalendarDays, Clock3 } from 'lucide-react'
import { appointmentsApi, errMsg } from '../../api/client'

const formatDate = date => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

export default function AppointmentCalendar({ doctor, appointmentType, selection, onChange, onContinue }) {
  const [dates, setDates] = useState([])
  const [slots, setSlots] = useState([])
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoadingDates(true)
    appointmentsApi.availability(doctor._id)
      .then(data => {
        if (!active) return
        setDates(data.dates)
        if (!data.dates.includes(selection.date)) onChange({ date: data.dates[0] || '', time: '' })
      })
      .catch(e => { if (active) setError(errMsg(e)) })
      .finally(() => { if (active) setLoadingDates(false) })
    return () => { active = false }
  }, [doctor._id])

  useEffect(() => {
    if (!selection.date) { setSlots([]); return undefined }
    let active = true
    setLoadingSlots(true)
    setError('')
    appointmentsApi.availability(doctor._id, { date: selection.date })
      .then(data => { if (active) { setSlots(data.slots); if (!data.slots.includes(selection.time)) onChange({ ...selection, time: '' }) } })
      .catch(e => { if (active) setError(errMsg(e)) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [doctor._id, selection.date])

  return (
    <section className="max-w-3xl" aria-labelledby="calendar-heading">
      <div className="mb-5"><p className="eyebrow">{doctor.name} · {appointmentType === 'online' ? 'Online' : 'In-person'} · ₹{doctor.fee.toLocaleString('en-IN')}</p><h2 id="calendar-heading" className="mt-1 text-2xl">Select a date and time</h2></div>
      {error && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="ml-2 underline" onClick={() => { setError(''); setLoadingDates(true); appointmentsApi.availability(doctor._id).then(data => { setDates(data.dates); if (!data.dates.includes(selection.date)) onChange({ date: data.dates[0] || '', time: '' }) }).catch(e => setError(errMsg(e))).finally(() => setLoadingDates(false)) }}>Retry</button></div>}
      <div className="panel p-5">
        <h3 className="flex items-center gap-2 text-base"><CalendarDays size={18} />Available dates</h3>
        {loadingDates ? <p className="mt-4 text-sm text-navy-500" role="status">Loading available dates…</p>
          : !dates.length ? <p className="mt-4 text-sm text-navy-500">No dates have open slots. Please go back and choose another doctor.</p>
            : <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{dates.map(date => <button type="button" key={date} aria-pressed={selection.date === date} onClick={() => onChange({ date, time: '' })} className={`border px-3 py-2 text-sm ${selection.date === date ? 'border-teal-700 bg-teal-700 text-white' : 'border-ink/20 hover:border-teal-700'}`}>{formatDate(date)}</button>)}</div>}
        {selection.date && <div className="mt-6 border-t border-ink/10 pt-5">
          <h3 className="flex items-center gap-2 text-base"><Clock3 size={18} />Available time slots</h3>
          {loadingSlots ? <p className="mt-4 text-sm text-navy-500" role="status">Loading open slots…</p>
            : !slots.length ? <p className="mt-4 text-sm text-navy-500">No slots remain for this date. Choose another date.</p>
              : <div className="mt-4 flex flex-wrap gap-2">{slots.map(time => <button type="button" key={time} aria-pressed={selection.time === time} onClick={() => onChange({ ...selection, time })} className={`border px-4 py-2 text-sm ${selection.time === time ? 'border-teal-700 bg-teal-700 text-white' : 'border-ink/20 hover:border-teal-700'}`}>{time}</button>)}</div>}
        </div>}
      </div>
      <button className="btn-primary mt-5" type="button" disabled={!selection.date || !selection.time || loadingSlots} onClick={onContinue}>Review appointment</button>
    </section>
  )
}
