import { CheckCircle2, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

const formatDate = date => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

export default function AppointmentConfirmation({ appointment, onViewAppointments }) {
  return (
    <section className="panel mx-auto max-w-2xl p-6 sm:p-9">
      <div className="flex items-start gap-4"><CheckCircle2 className="mt-1 shrink-0 text-teal-700" size={32} /><div><p className="eyebrow">Appointment saved</p><h1 className="mt-1 text-2xl">Your appointment is confirmed</h1><p className="mt-2 text-sm text-navy-500">This is a demonstration booking saved in MedLink AI. It has not been sent to a real hospital or doctor.</p></div></div>
      <dl className="mt-6 grid gap-4 border-y border-ink/15 py-5 text-sm sm:grid-cols-2">
        <div><dt className="text-navy-500">Booking ID</dt><dd className="mt-1 break-all font-semibold">{appointment._id}</dd></div>
        <div><dt className="text-navy-500">Status</dt><dd className="mt-1 font-semibold capitalize">{appointment.status}</dd></div>
        <div><dt className="text-navy-500">Hospital</dt><dd className="mt-1 font-semibold">{appointment.hospital.name}</dd><dd className="text-navy-500">{appointment.hospital.address}</dd></div>
        <div><dt className="text-navy-500">Doctor</dt><dd className="mt-1 font-semibold">{appointment.doctor.name} · {appointment.doctor.specialty}</dd></div>
        <div><dt className="text-navy-500">Date &amp; time</dt><dd className="mt-1 font-semibold">{formatDate(appointment.date)} · {appointment.time}</dd></div>
        <div><dt className="text-navy-500">Type and fee</dt><dd className="mt-1 font-semibold">{appointment.appointmentType === 'online' ? 'Online' : 'In-person'} · ₹{appointment.fee.toLocaleString('en-IN')}</dd></div>
        <div className="sm:col-span-2"><dt className="text-navy-500">Reason</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{appointment.reason}</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" type="button" onClick={onViewAppointments}>View my appointments</button>
        <button className="btn-outline" type="button" onClick={() => window.print()}><Printer size={16} />Print confirmation</button>
        <Link className="btn-outline" to="/overview">Return to dashboard</Link>
      </div>
    </section>
  )
}
