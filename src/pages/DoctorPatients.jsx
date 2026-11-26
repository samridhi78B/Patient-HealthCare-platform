import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { doctorApi, errMsg } from '../api/client'

const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'No visit recorded'

export default function DoctorPatients() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    doctorApi.patients({ search: query })
      .then(result => { if (active) setPatients(result.patients) })
      .catch(reason => { if (active) setError(errMsg(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query])

  const submit = event => {
    event.preventDefault()
    setQuery(search.trim())
  }

  return (
    <div className="space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker">Care directory</p><h1 className="mt-2 text-3xl">Patients</h1><p className="mt-2 text-sm text-navy-500">Patients with appointments connected to your practice.</p></div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-700">{patients.length} patients</span>
      </header>
      <form className="health-panel flex flex-col gap-3 p-4 sm:flex-row" onSubmit={submit} role="search">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search by patient name, phone, or patient ID</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <input className="input pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, phone, or patient ID" />
        </label>
        <button type="submit" className="btn-primary"><Search size={16} />Search patients</button>
      </form>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status" className="health-panel p-6 text-sm text-navy-500">Loading patient records…</p>
        : patients.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patients.map(patient => (
            <article key={patient._id} className="health-panel p-5">
              <div className="flex items-start gap-3 border-b border-ink/10 pb-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-800"><UserRound size={20} /></span>
                <div className="min-w-0"><h2 className="truncate text-lg">{patient.name}</h2><p className="mt-1 break-all text-[11px] text-navy-500">Patient ID · {patient._id}</p></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="health-detail"><dt>Age</dt><dd className="mt-1 text-sm font-semibold">{patient.age ?? 'Not provided'}</dd></div>
                <div className="health-detail"><dt>Gender</dt><dd className="mt-1 text-sm font-semibold">{patient.gender || 'Not provided'}</dd></div>
                <div className="health-detail"><dt>Blood group</dt><dd className="mt-1 text-sm font-semibold">{patient.bloodGroup || 'Not provided'}</dd></div>
                <div className="health-detail"><dt>Last visit</dt><dd className="mt-1 text-sm font-semibold">{formatDate(patient.lastVisit)}</dd></div>
              </dl>
              <Link to={`/doctor/patients/${patient._id}`} className="btn-outline mt-4 w-full">View patient profile</Link>
            </article>
          ))}
        </div> : <div className="health-panel p-8 text-center"><UserRound size={24} className="mx-auto text-navy-300" /><h2 className="mt-3 text-lg">No patients found</h2><p className="mt-1 text-sm text-navy-500">{query ? 'Try another name, phone number, or patient ID.' : 'Patient records will appear here when appointments are linked to your practice.'}</p></div>}
    </div>
  )
}
