import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CalendarDays, FileHeart, FolderHeart, ShieldCheck } from 'lucide-react'
import { appointmentsApi, errMsg, reportsApi } from '../api/client'
import { useTranslation } from 'react-i18next'

export function Overview() {
  const { t, i18n } = useTranslation()
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
        else messages.push(`${t('nav.reports')}: ${errMsg(results[0].reason)}`)
        if (results[1].status === 'fulfilled') setRecent(results[1].value.reports.slice(0, 4))
        else messages.push(`${t('nav.reports')}: ${errMsg(results[1].reason)}`)
        if (results[2].status === 'fulfilled') setAppointments(results[2].value.appointments.filter(item => item.status === 'upcoming').slice(0, 3))
        else messages.push(`${t('nav.appointments')}: ${errMsg(results[2].reason)}`)
        setErrors(messages)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [t])

  return (
    <div className="space-y-7">
      <section className="page-intro grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="relative z-10">
          <p className="section-kicker">{t('auth.brandTagline')}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{t('auth.welcome')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-navy-500">{t('home.description')}</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link to="/reports" className="btn-primary"><FolderHeart size={16} />{t('nav.reports')}</Link>
          <Link to="/appointments" className="btn-outline"><CalendarDays size={16} />{t('nav.appointments')}</Link>
        </div>
      </section>

      {errors.length > 0 && <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{t('common.error')} {errors.join(' · ')}</div>}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="surface-teal flex min-h-52 flex-col justify-between p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/65">{t('dashboard.recordsTitle')}</p><h2 className="mt-2 text-2xl text-white">{t('home.clearView')}</h2></div><FileHeart className="text-teal-100" size={25} /></div>
          <div className="mt-7 flex items-end justify-between gap-5 border-t border-white/15 pt-4"><div><p className="text-4xl font-semibold text-white">{loading ? '—' : summary?.total ?? '—'}</p><p className="mt-1 text-xs text-white/65">{t('home.medicalReports')}</p></div><Link to="/reports" className="flex items-center gap-1 text-sm font-semibold text-teal-100 hover:text-white">{t('dashboard.viewDetails')} <ArrowUpRight size={15} /></Link></div>
        </div>
        <div className="report-summary border border-ink/5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="section-kicker">{t('dashboard.upcomingAppointments')}</p><h2 className="mt-1 text-2xl">{t('nav.appointments')}</h2></div><Link to="/appointments/my" aria-label={t('nav.appointments')} className="rounded-md p-2 text-teal-700 hover:bg-white"><ArrowUpRight size={18} /></Link></div>
          {loading ? <p role="status" className="mt-6 text-sm text-navy-500">{t('common.loading')}</p>
            : appointments.length ? <ul className="mt-4 divide-y divide-ink/10">{appointments.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div><p className="font-semibold">{item.doctor?.name || t('nav.appointments')} <span className="font-normal text-navy-500">· {item.doctor?.specialty || t('home.appointmentsDescription')}</span></p><p className="mt-1 text-xs text-navy-500">{item.hospital?.name || t('nav.appointments')}</p></div><p className="text-sm font-semibold">{new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.appointmentAt || item.date))} <span className="text-navy-500">{item.time}</span></p></li>)}</ul>
              : <div className="mt-5 border-t border-ink/10 pt-4"><p className="text-sm text-navy-500">{t('dashboard.noAppointments')}</p><Link to="/appointments" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">{t('nav.appointments')} <ArrowRight size={15} /></Link></div>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-kicker">{t('dashboard.recordsTitle')}</p><h2 className="mt-1 text-2xl">{t('home.medicalReports')}</h2></div><Link to="/reports" className="text-sm font-semibold text-teal-700 hover:underline">{t('nav.reports')}</Link></div>
          <div className="panel overflow-hidden">
            {loading ? <p role="status" className="p-5 text-sm text-navy-500">{t('common.loading')}</p>
              : recent.length ? <ul className="divide-y divide-ink/10">{recent.map(report => <li key={report._id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center bg-teal-50 text-teal-700"><FileHeart size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{report.title}</p><p className="text-xs text-navy-500">{report.category}</p></div></div><time className="shrink-0 text-xs text-navy-500">{new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(report.createdAt))}</time></li>)}</ul>
                : <div className="p-6"><p className="text-sm text-navy-500">{t('common.noData')}</p><Link className="btn-outline mt-4" to="/reports">{t('nav.reports')}</Link></div>}
          </div>
        </div>
        <aside className="flex flex-col justify-between border-l-2 border-teal-700 bg-sage-100/60 p-6">
          <div><ShieldCheck size={22} className="text-teal-700" /><h2 className="mt-4 text-xl">{t('home.privateSpace')}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{t('home.privacyDescription')}</p></div>
          <Link to="/profile" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">{t('nav.editProfile')} <ArrowUpRight size={15} /></Link>
        </aside>
      </section>
    </div>
  )
}
