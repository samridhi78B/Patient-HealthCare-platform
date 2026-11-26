import { useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, FileHeart, Search, X } from 'lucide-react'
import { doctorApi, errMsg } from '../api/client'

const dateLabel = value => value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date not provided'

export default function DoctorReports() {
  const [reports, setReports] = useState([])
  const [comments, setComments] = useState({})
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    doctorApi.reports({ search: query })
      .then(result => {
        if (!active) return
        setReports(result.reports)
        setComments(current => Object.fromEntries(result.reports.map(report => [report._id, current[report._id] ?? report.review?.comment ?? ''])))
      })
      .catch(reason => { if (active) setError(errMsg(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query])

  const visible = useMemo(() => reports.filter(report => status === 'all' || report.status === status), [reports, status])
  const submitSearch = event => { event.preventDefault(); setQuery(search.trim()) }

  const review = async (report, markReviewed) => {
    setBusy(report._id)
    setError('')
    try {
      const result = await doctorApi.reviewReport(report._id, {
        comment: comments[report._id] || '',
        status: markReviewed ? 'reviewed' : report.status,
      })
      setReports(current => current.map(item => item._id === report._id
        ? { ...item, status: result.report.status, review: result.report.review }
        : item))
    } catch (reason) { setError(errMsg(reason)) } finally { setBusy('') }
  }

  const showPreview = async report => {
    setBusy(report._id)
    setError('')
    try {
      const response = await doctorApi.reportFile(report._id, true)
      const url = URL.createObjectURL(response.data)
      setPreview({ url, name: report.title, mimeType: report.mimeType })
    } catch (reason) { setError(errMsg(reason)) } finally { setBusy('') }
  }

  const download = async report => {
    setBusy(report._id)
    setError('')
    try {
      const response = await doctorApi.reportFile(report._id)
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = report.originalName || report.title || 'medical-report'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (reason) { setError(errMsg(reason)) } finally { setBusy('') }
  }

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  return (
    <div className="space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker">Clinical review</p><h1 className="mt-2 text-3xl">Reports</h1><p className="mt-2 text-sm text-navy-500">Review medical reports uploaded by your patients and add a comment.</p></div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-700">{reports.filter(report => report.status === 'pending').length} pending</span>
      </header>
      <form className="health-panel flex flex-col gap-3 p-4 sm:flex-row" onSubmit={submitSearch} role="search">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search reports or patients</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" /><input className="input pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search patient, report title, or type" /></label>
        <button type="submit" className="btn-primary"><Search size={16} />Search reports</button>
      </form>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report review status">
        {['all', 'pending', 'reviewed'].map(value => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${status === value ? 'border-teal-700 bg-teal-700 text-white' : 'border-ink/15 bg-white text-navy-600 hover:bg-sage-100'}`}>{value}</button>)}
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="health-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h2 className="text-lg">Patient uploads</h2><span className="text-xs text-navy-500">{visible.length} reports</span></div>
        {loading ? <p role="status" className="p-6 text-sm text-navy-500">Loading reports…</p>
          : visible.length ? <ul className="divide-y divide-ink/10">{visible.map(report => <li key={report._id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-100 text-teal-700"><FileHeart size={19} /></span><div className="min-w-0"><h3 className="truncate font-semibold">{report.title}</h3><p className="mt-1 text-sm text-navy-500">{report.patient?.name || 'Patient'} · {report.category} · Uploaded {dateLabel(report.createdAt)}</p><p className="mt-1 text-xs text-navy-500">{report.originalName}</p></div></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${report.status === 'reviewed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{report.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-outline px-3 py-2 text-xs" disabled={busy === report._id} onClick={() => showPreview(report)}><ExternalLink size={14} />Preview</button>
              <button type="button" className="btn-outline px-3 py-2 text-xs" disabled={busy === report._id} onClick={() => download(report)}><Download size={14} />Download</button>
            </div>
            <label className="mt-4 block text-xs font-semibold">Doctor comment<textarea className="input mt-1 min-h-20" maxLength={2000} value={comments[report._id] || ''} onChange={event => setComments(current => ({ ...current, [report._id]: event.target.value }))} placeholder="Add a note for this report" /></label>
            <button type="button" className="btn-primary mt-3" disabled={busy === report._id} onClick={() => review(report, report.status !== 'reviewed')}>{busy === report._id ? 'Saving…' : report.status === 'reviewed' ? 'Save doctor comment' : 'Mark as reviewed'}</button>
          </li>)}</ul> : <div className="p-8 text-center"><FileHeart size={24} className="mx-auto text-navy-300" /><h2 className="mt-3 text-lg">No reports found</h2><p className="mt-1 text-sm text-navy-500">{query ? 'Try another patient or report search.' : 'Reports uploaded by your patients will appear here.'}</p></div>}
      </section>
      {preview && <div className="health-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closePreview() }}>
        <section className="health-modal panel flex max-h-[90vh] w-full max-w-4xl flex-col p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <header className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="section-kicker">Report preview</p><h2 id="report-preview-title" className="truncate text-xl">{preview.name}</h2></div><button type="button" className="health-icon-button" aria-label="Close preview" onClick={closePreview}><X size={18} /></button></header>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-sage-100/40 p-2 text-center">
            {preview.mimeType?.startsWith('image/')
              ? <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] max-w-full object-contain" />
              : preview.mimeType === 'application/pdf'
                ? <iframe title={preview.name} src={preview.url} className="h-[70vh] w-full bg-white" />
                : <p className="p-8 text-sm text-navy-500">Preview is unavailable for this file type. Download the report to view it.</p>}
          </div>
        </section>
      </div>}
    </div>
  )
}
