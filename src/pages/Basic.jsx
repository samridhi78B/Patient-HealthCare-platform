import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, FileHeart, FolderHeart, ShieldCheck } from 'lucide-react'
import { appointmentsApi, errMsg, reportsApi } from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const fmtDate = value => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export const Overview = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [appointments, setAppointments] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.allSettled([reportsApi.summary(), reportsApi.list({ sort: 'newest' }), appointmentsApi.list()])
      .then(results => {
        if (!active) return
        const messages = []
        if (results[0].status === 'fulfilled') setSummary(results[0].value)
        else messages.push(`Report summary: ${errMsg(results[0].reason)}`)
        if (results[1].status === 'fulfilled') setRecent(results[1].value.reports.slice(0, 4))
        else messages.push(`Recent reports: ${errMsg(results[1].reason)}`)
        if (results[2].status === 'fulfilled') setAppointments(results[2].value.appointments.filter(item => item.status === 'upcoming').slice(0, 3))
        else messages.push(`Appointments: ${errMsg(results[2].reason)}`)
        setErrors(messages)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-7">
      <section className="page-intro grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="relative z-10">
          <p className="section-kicker">Your health workspace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Welcome back, {user.name.split(' ')[0]}.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-navy-500">Your health information, appointments, and records — organized in one private place.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link to="/reports" className="btn-primary"><FolderHeart size={16} />Open reports</Link>
          <Link to="/appointments" className="btn-outline"><CalendarDays size={16} />Book a visit</Link>
        </div>
      </section>

      {errors.length > 0 && <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Some dashboard information could not be loaded: {errors.join(' · ')}</div>}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="surface-teal flex min-h-52 flex-col justify-between p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/65">Your records</p><h2 className="mt-2 text-2xl text-white">A clear view of your history</h2></div><FileHeart className="text-teal-100" size={25} /></div>
          <div className="mt-7 flex items-end justify-between gap-5 border-t border-white/15 pt-4"><div><p className="text-4xl font-semibold text-white">{loading ? '—' : summary?.total ?? '—'}</p><p className="mt-1 text-xs text-white/65">medical reports saved</p></div><Link to="/reports" className="flex items-center gap-1 text-sm font-semibold text-teal-100 hover:text-white">View records <ArrowUpRight size={15} /></Link></div>
        </div>
        <div className="report-summary border border-ink/5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="section-kicker">Coming up</p><h2 className="mt-1 text-2xl">Appointments</h2></div><Link to="/appointments/my" aria-label="View all appointments" className="rounded-md p-2 text-teal-700 hover:bg-white"><ArrowUpRight size={18} /></Link></div>
          {loading ? <p role="status" className="mt-6 text-sm text-navy-500">Loading upcoming appointments…</p>
            : appointments.length ? <ul className="mt-4 divide-y divide-ink/10">{appointments.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div><p className="font-semibold">{item.doctor.name} <span className="font-normal text-navy-500">· {item.doctor.specialty}</span></p><p className="mt-1 text-xs text-navy-500">{item.hospital.name}</p></div><p className="text-sm font-semibold">{fmtDate(item.date)} <span className="text-navy-500">{item.time}</span></p></li>)}</ul>
              : <div className="mt-5 border-t border-ink/10 pt-4"><p className="text-sm text-navy-500">No upcoming appointments saved.</p><Link to="/appointments" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">Find a time <ArrowUpRight size={15} /></Link></div>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-kicker">Recently added</p><h2 className="mt-1 text-2xl">Medical reports</h2></div><Link to="/reports" className="text-sm font-semibold text-teal-700 hover:underline">All reports</Link></div>
          <div className="panel overflow-hidden">
            {loading ? <p role="status" className="p-5 text-sm text-navy-500">Loading recent reports…</p>
              : recent.length ? <ul className="divide-y divide-ink/10">{recent.map(report => <li key={report._id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center bg-teal-50 text-teal-700"><FileHeart size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{report.title}</p><p className="text-xs text-navy-500">{report.category}</p></div></div><time className="shrink-0 text-xs text-navy-500">{fmtDate(report.createdAt)}</time></li>)}</ul>
                : <div className="p-6"><p className="text-sm text-navy-500">Your recent reports will appear here after you upload them.</p><Link className="btn-outline mt-4" to="/reports">Upload a report</Link></div>}
          </div>
        </div>
        <aside className="flex flex-col justify-between border-l-2 border-teal-700 bg-sage-100/60 p-6">
          <div><ShieldCheck size={22} className="text-teal-700" /><h2 className="mt-4 text-xl">Private by design</h2><p className="mt-2 text-sm leading-6 text-navy-500">Your medical reports are accessible only after you sign in. Keep your care information in one place, on your terms.</p></div>
          <Link to="/profile" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">Review your profile <ArrowUpRight size={15} /></Link>
        </aside>
      </section>
    </div>
  )
}

export const Profile = () => {
  const { user } = useAuth()
  const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="space-y-6">
      <header className="page-intro flex flex-wrap items-center gap-5 p-6 sm:p-8">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-teal-900 text-xl font-semibold text-ivory">{initials}</span>
        <div><p className="section-kicker">Your account</p><h1 className="mt-1 text-3xl">{user.name}</h1><p className="mt-1 text-sm text-navy-500">Patient profile · Member since {new Date(user.createdAt).toLocaleDateString()}</p></div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <section className="panel p-6 sm:p-8" aria-labelledby="profile-info-heading">
          <p className="section-kicker">Account information</p><h2 id="profile-info-heading" className="mt-1 text-2xl">Personal details</h2>
          <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
            {[['Full name', user.name], ['Email address', user.email], ['Phone number', user.phone], ['Member since', new Date(user.createdAt).toLocaleDateString()]].map(([label, value]) => <div key={label} className="border-t border-ink/10 py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value || 'Not provided'}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-navy-500">Profile editing is not available yet. These details are read-only.</p>
        </section>
        <aside className="surface-muted p-6 sm:p-8">
          <ShieldCheck size={23} className="text-teal-700" /><p className="section-kicker mt-5">Your privacy</p><h2 className="mt-1 text-xl">Personal information, kept personal.</h2><p className="mt-3 text-sm leading-6 text-navy-500">Your profile is associated with your signed-in account. Appointment and report pages show information belonging to your account.</p>
          <div className="mt-6 flex flex-col gap-2 border-t border-ink/10 pt-5"><Link to="/reports" className="text-sm font-semibold text-teal-700 hover:underline">Go to medical reports</Link><Link to="/appointments/my" className="text-sm font-semibold text-teal-700 hover:underline">View appointments</Link></div>
        </aside>
      </div>
    </div>
  )
}
