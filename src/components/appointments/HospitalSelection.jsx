import { useMemo, useState } from 'react'
import { Building2, MapPin, Search } from 'lucide-react'

export default function HospitalSelection({ hospitals, selectedHospital, onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return hospitals
    return hospitals.filter(h => [h.name, h.location, h.address, ...h.specialties].some(value => value.toLowerCase().includes(q)))
  }, [hospitals, search])

  return (
    <section aria-labelledby="hospital-heading">
      <div className="mb-5">
        <h2 id="hospital-heading" className="text-2xl">Choose a hospital</h2>
        <p className="mt-1 text-sm text-navy-500">Search by hospital, location, or specialty.</p>
      </div>
      <label className="relative mb-5 block">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospitals, cities, specialties" aria-label="Search hospitals" />
      </label>
      {!filtered.length ? <p className="panel p-6 text-sm text-navy-500">No hospitals match your search.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(hospital => (
            <article key={hospital._id} className={`panel flex flex-col p-5 ${selectedHospital?._id === hospital._id ? 'border-teal-700 ring-1 ring-teal-700' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center bg-teal-50 text-teal-700" aria-hidden="true"><Building2 size={23} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg">{hospital.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-navy-500"><MapPin size={14} />{hospital.location}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-navy-500">{hospital.address}</p>
              <div className="mt-4 flex flex-wrap gap-2">{hospital.specialties.map(s => <span key={s} className="bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">{s}</span>)}</div>
<div className="mt-auto pt-5">
                <button className="btn-primary w-full" type="button" onClick={() => onSelect(hospital)}>{selectedHospital?._id === hospital._id ? 'Selected — continue' : 'View doctors'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
