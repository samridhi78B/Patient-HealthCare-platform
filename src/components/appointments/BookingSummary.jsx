import { MapPin } from 'lucide-react'

const formatDate = date => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

export default function BookingSummary({ hospital, doctor, details, selection, onEdit, onBack, onConfirm, busy, error }) {
  return (
    <section className="max-w-2xl" aria-labelledby="summary-heading">
      <p className="eyebrow">Final review</p><h2 id="summary-heading" className="mt-1 text-2xl">Confirm your appointment details</h2>
      <dl className="panel mt-5 divide-y divide-ink/10">
        <div className="p-5"><dt className="text-xs font-bold uppercase text-navy-500">Hospital</dt><dd className="mt-1 font-semibold">{hospital.name}</dd><dd className="mt-1 flex gap-1 text-sm text-navy-500"><MapPin size={14} className="mt-0.5 shrink-0" />{hospital.address}</dd></div>
        <div className="p-5"><dt className="text-xs font-bold uppercase text-navy-500">Doctor</dt><dd className="mt-1 font-semibold">{doctor.name} · {doctor.specialty}</dd></div>
        <div className="p-5"><dt className="text-xs font-bold uppercase text-navy-500">Consultation reason</dt><dd className="mt-1 whitespace-pre-wrap">{details.reason}</dd>{details.symptoms && <dd className="mt-2 whitespace-pre-wrap text-sm text-navy-500">{details.symptoms}</dd>}<button className="mt-2 text-sm font-semibold text-teal-700 underline" type="button" onClick={() => onEdit(2)}>Edit details</button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase text-navy-500">Date &amp; time</dt><dd className="mt-1 font-semibold">{formatDate(selection.date)} · {selection.time}</dd></div><div><dt className="text-xs font-bold uppercase text-navy-500">Appointment type</dt><dd className="mt-1 font-semibold">{details.appointmentType === 'online' ? 'Online consultation' : 'In-person consultation'}</dd></div></div>
        <div className="p-5"><dt className="text-xs font-bold uppercase text-navy-500">Consultation fee</dt><dd className="mt-1 font-semibold">₹{doctor.fee.toLocaleString('en-IN')}</dd></div>
      </dl>
      {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-outline" type="button" disabled={busy} onClick={onBack}>Back</button>
        <button className="btn-outline" type="button" disabled={busy} onClick={() => onEdit(0)}>Edit hospital / doctor</button>
        <button className="btn-primary" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Saving appointment…' : 'Confirm appointment'}</button>
      </div>
    </section>
  )
}
