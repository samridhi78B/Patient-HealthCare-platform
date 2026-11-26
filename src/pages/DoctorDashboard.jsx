import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Activity, ArrowRight, CalendarDays, FileHeart, QrCode, Users } from 'lucide-react'
import { doctorApi, errMsg } from '../api/client'

const dateTime = value => value ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'Time not set'
const statusClass = status => status === 'completed' ? 'bg-green-50 text-green-700' : status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'

export default function DoctorDashboard() {
  const { doctor } = useOutletContext()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    doctorApi.dashboard()
      .then(data => { if (active) setDashboard(data) })
      .catch(reason => { if (active) setError(errMsg(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const stats = [
    { label: "Today's appointments", value: dashboard?.stats?.todaysAppointments, icon: CalendarDays, tint: 'health-metric--blue', to: '/doctor/appointments' },
    { label: 'Total patients', value: dashboard?.stats?.totalPatients, icon: Users, tint: 'health-metric--mint', to: '/doctor/patients' },
    { label: 'Pending reports', value: dashboard?.stats?.pendingReports, icon: FileHeart, tint: 'health-metric--lavender', to: '/doctor/reports' },
    { label: 'Emergency QR scans', value: dashboard?.stats?.emergencyQrScans, icon: QrCode, tint: 'health-metric--peach', to: '/doctor/patients' },
  ]

  return (
    <div className="space-y-7">
      <section className="health-hero flex flex-wrap items-center justify-between gap-5 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker">Doctor workspace</p><h1 className="mt-2 text-3xl sm:text-4xl">Welcome, {doctor?.name || 'Doctor'}</h1>
          <p className="mt-2 text-sm text-navy-500">{doctor?.specialization || 'Specialization'}{doctor?.hospital ? ` · ${doctor.hospital}` : ''}</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-navy-500">Your appointments, patient records, and reports are together in one secure workspace.</p>
        </div>
        {doctor?.avatarUrl
          ? <img src={doctor.avatarUrl} alt={`${doctor.name} profile`} className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-sm" />
          : <span className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-blue-100 text-2xl font-bold text-blue-800">{(doctor?.name || 'D').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Doctor dashboard statistics">
        {stats.map(({ label, value, icon: Icon, tint, to }) => (
          <Link key={label} to={to} className={`health-metric ${tint} rounded-2xl border p-5 transition hover:-translate-y-0.5`}>
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-navy-500">{label}</p><Icon size={19} className="text-blue-700" /></div>
            <p className="mt-5 text-3xl font-semibold">{loading ? '—' : value ?? 0}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <div className="health-panel overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 p-5 sm:px-6">
            <div><p className="section-kicker">Your schedule</p><h2 className="mt-1 text-xl">Today's appointments</h2></div>
            <Link to="/doctor/appointments" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">All appointments <ArrowRight size={15} /></Link>
          </div>
          {loading ? <p role="status" className="p-6 text-sm text-navy-500">Loading today's schedule…</p>
            : dashboard?.appointments?.length ? <ul className="divide-y divide-ink/10">
              {dashboard.appointments.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0"><p className="truncate font-semibold">{item.patient?.name || 'Patient'}</p><p className="mt-1 text-xs text-navy-500">{dateTime(item.appointmentAt)} · {item.reason}</p></div>
                <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>{item.status}</span><Link className="btn-outline px-3 py-2 text-xs" to={`/doctor/patients/${item.patient?._id}`}>View</Link></div>
              </li>)}
            </ul> : <p className="p-6 text-sm text-navy-500">No appointments scheduled for today.</p>}
        </div>
        <div className="health-panel">
          <div className="border-b border-ink/10 p-5 sm:px-6"><p className="section-kicker">Patient care</p><h2 className="mt-1 text-xl">Recent patients</h2></div>
          {loading ? <p role="status" className="p-6 text-sm text-navy-500">Loading patients…</p>
            : dashboard?.recentPatients?.length ? <ul className="divide-y divide-ink/10">
              {dashboard.recentPatients.map(patient => <li key={patient._id} className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{patient.name}</p><p className="mt-1 text-xs text-navy-500">{patient.lastVisit ? `Last visit ${dateTime(patient.lastVisit)}` : 'No visit date'}</p></div>
                <Link to={`/doctor/patients/${patient._id}`} aria-label={`View ${patient.name}`} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"><ArrowRight size={17} /></Link>
              </li>)}
            </ul> : <p className="p-6 text-sm text-navy-500">Patients with an appointment will appear here.</p>}
          <Link to="/doctor/patients" className="flex items-center gap-2 border-t border-ink/10 p-5 text-sm font-semibold text-teal-700"><Activity size={16} />Browse patient records</Link>
        </div>
      </section>
    </div>
  )
}
