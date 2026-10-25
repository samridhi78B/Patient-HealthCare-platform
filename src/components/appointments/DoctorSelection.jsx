import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleUserRound, Video } from 'lucide-react'
import { appointmentsApi, errMsg } from '../../api/client'

export default function DoctorSelection({ hospital, doctors, selectedDoctor, onSelect }) {
  const [specialty, setSpecialty] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [available, setAvailable] = useState(new Set())
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setChecking(true)
    setError('')
    Promise.all(doctors.map(async doctor => {
      const result = await appointmentsApi.availability(doctor._id)
      return result.dates.length ? doctor._id : null
    })).then(ids => { if (active) setAvailable(new Set(ids.filter(Boolean))) })
      .catch(e => { if (active) setError(errMsg(e)) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [doctors])

  const specialties = [...new Set(doctors.map(d => d.specialty))].sort()
  const filtered = useMemo(() => doctors.filter(d => (!specialty || d.specialty === specialty) && (!availableOnly || available.has(d._id))), [doctors, specialty, availableOnly, available])

  return (
    <section aria-labelledby="doctor-heading">
      <div className="mb-5">
        <p className="eyebrow">{hospital.name}</p>
        <h2 id="doctor-heading" className="mt-1 text-2xl">Choose a doctor</h2>
        <p className="mt-1 text-sm text-navy-500">Only doctors affiliated with this hospital are shown.</p>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="doctor-specialty">Filter by specialty</label>
        <select id="doctor-specialty" className="input sm:max-w-xs" value={specialty} onChange={e => setSpecialty(e.target.value)}>
          <option value="">All specialties</option>{specialties.map(item => <option key={item}>{item}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />Show doctors with open slots</label>
      </div>
      {error && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {checking ? <p className="panel p-6 text-sm text-navy-500" role="status">Checking current availability…</p>
        : !filtered.length ? <p className="panel p-6 text-sm text-navy-500">{availableOnly ? 'No doctors currently have open slots. Try again later.' : 'No doctors match this specialty.'}</p>
          : <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(doctor => (
              <article key={doctor._id} className={`panel flex flex-col p-5 ${selectedDoctor?._id === doctor._id ? 'border-teal-700 ring-1 ring-teal-700' : ''}`}>
                <div className="flex gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700" aria-hidden="true"><CircleUserRound size={27} /></span>
                  <div><h3 className="text-lg">{doctor.name}</h3><p className="text-sm font-semibold text-teal-700">{doctor.specialty}</p></div>
                </div>
                <p className="mt-3 text-sm text-navy-500">{doctor.qualifications} · {doctor.experienceYears} years’ experience</p>
                <p className="mt-2 text-sm text-navy-500">{doctor.hospital.name} · Consultation fee: ₹{doctor.fee.toLocaleString('en-IN')}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-navy-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={14} />Availability shown next</span>
                  {doctor.supportsOnline && <span className="inline-flex items-center gap-1"><Video size={14} />Online consultations</span>}
                </div>
                <button className="btn-primary mt-auto w-full pt-2.5" type="button" onClick={() => onSelect(doctor)}>{selectedDoctor?._id === doctor._id ? 'Selected — continue' : 'Select doctor'}</button>
              </article>
            ))}
          </div>}
    </section>
  )
}
