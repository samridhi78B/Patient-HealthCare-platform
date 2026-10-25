import { useCallback, useEffect, useState } from 'react'
import { FileHeart, Search, UploadCloud } from 'lucide-react'
import { reportsApi, errMsg } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'
import { CATEGORIES, SummaryCards, RecentUploads, UploadPanel, ReportTable, TableSkeleton, EmptyState, PreviewModal, ConfirmDialog } from '../components/reportUi.jsx'
export default function Reports() {
  const toast = useToast()
  const [reports, setReports] = useState([]); const [summary, setSummary] = useState(null); const [loading, setLoading] = useState(true); const [loadErr, setLoadErr] = useState('')
  const [search, setSearch] = useState(''); const [q, setQ] = useState(''); const [category, setCategory] = useState(''); const [sort, setSort] = useState('newest')
  const [preview, setPreview] = useState(null); const [confirm, setConfirm] = useState(null); const [deleting, setDeleting] = useState(false)
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t) }, [search])
  const load = useCallback(async () => {
    setLoading(true); setLoadErr('')
    try { const [l, s] = await Promise.all([reportsApi.list({ search: q, category, sort }), reportsApi.summary()]); setReports(l.reports); setSummary(s) }
    catch (e) { setLoadErr(errMsg(e)) } finally { setLoading(false) }
  }, [q, category, sort])
  useEffect(() => { load() }, [load])
  useEffect(() => () => preview?.url && URL.revokeObjectURL(preview.url), [preview])
  const upload = async (fd, onProgress) => {
    try { const d = await reportsApi.upload(fd, onProgress); toast.success(d.message); await load() } catch (e) { throw errMsg(e) }
  }
  const openPreview = async r => {
    setPreview({ report: r, loading: true })
    try { const res = await reportsApi.file(r._id, true); setPreview({ report: r, url: URL.createObjectURL(res.data) }) }
    catch (e) { setPreview({ report: r, error: 'Could not load the preview. ' + (e.response?.status === 404 ? 'The report was not found.' : errMsg(e)) }) }
  }
  const download = async r => {
    try { const res = await reportsApi.file(r._id, false); const u = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = u; a.download = r.originalName; a.click(); URL.revokeObjectURL(u); toast.success('Download started') }
    catch (e) { toast.error(errMsg(e)) }
  }
  const remove = async () => {
    setDeleting(true)
    try { await reportsApi.remove(confirm._id); toast.success('Report deleted'); setConfirm(null); await load() } catch (e) { toast.error(errMsg(e)) } finally { setDeleting(false) }
  }
  const filtered = !!(q || category)
  return (<div className="space-y-6">
    <header className="page-intro flex flex-wrap items-end justify-between gap-5 p-6 sm:p-8"><div><p className="section-kicker">Your private library</p><h1 className="mt-1 text-3xl sm:text-4xl">Medical reports</h1><p className="mt-2 max-w-xl text-sm leading-6 text-navy-500">Securely store and revisit the documents you choose to upload. Only you can access your saved files.</p></div>
      <label htmlFor="file" className="btn-primary cursor-pointer"><UploadCloud size={16} />Add a report</label></header>
    <section aria-label="Report summary" className="report-summary px-5 sm:px-7"><SummaryCards summary={summary} loading={loading && !summary} /></section>
    <section className="grid gap-5 lg:grid-cols-[1.6fr_.8fr]"><div><div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-kicker">Add to your library</p><h2 className="mt-1 text-xl">Upload a document</h2></div><FileHeart size={21} className="text-teal-700" /></div><UploadPanel onUpload={upload} /></div><div className="border-l-2 border-teal-700 bg-sage-100/60 p-5 sm:p-6"><RecentUploads items={summary?.recent} /><p className="mt-5 border-t border-ink/10 pt-4 text-xs leading-5 text-navy-500">PDF, JPG, and PNG files are supported. Your reports remain private to your account.</p></div></section>
    <section aria-label="All medical reports">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Browse your files</p><h2 className="mt-1 text-2xl">All reports</h2></div><span className="text-xs text-navy-500">{reports.length} {reports.length === 1 ? 'document' : 'documents'}</span></div>
    <div className="flex flex-col gap-3 border border-ink/10 bg-sage-100/45 p-3 md:flex-row">
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" /><input className="input pl-9" placeholder="Search by title or filename" aria-label="Search reports" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select className="input md:w-48" aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      <select className="input md:w-40" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
    {loadErr ? <div role="alert" className="panel p-6 text-sm text-red-700">{loadErr} <button className="ml-2 font-semibold underline" onClick={load}>Retry</button></div>
      : loading ? <TableSkeleton /> : !reports.length ? <EmptyState filtered={filtered} onClear={() => { setSearch(''); setCategory('') }} />
      : <ReportTable reports={reports} onPreview={openPreview} onDownload={download} onDelete={setConfirm} />}
    </section>
    {preview && <PreviewModal report={preview.report} blobUrl={preview.url} loading={preview.loading} error={preview.error} onClose={() => setPreview(null)} />}
    {confirm && <ConfirmDialog report={confirm} busy={deleting} onCancel={() => setConfirm(null)} onConfirm={remove} />}
  </div>)
}
