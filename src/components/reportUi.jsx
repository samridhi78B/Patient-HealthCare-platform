import { useEffect, useRef, useState } from 'react'
import { UploadCloud, FileText, Image as ImageIcon, Eye, Download, Trash2, X, Loader2, FolderOpen } from 'lucide-react'
export const CATEGORIES = ['General', 'Blood Test', 'Imaging', 'Prescription', 'Cardiology', 'Other']
export const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
export const fmtDate = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const typeLabel = m => m === 'application/pdf' ? 'PDF' : m === 'image/png' ? 'PNG' : 'JPG'
const MAX = 10 * 1024 * 1024
export const Skeleton = ({ className }) => <div className={`animate-pulse rounded-md bg-navy-300/25 ${className}`} />

export function SummaryCards({ summary, loading }) {
  const cards = [
    { label: 'Total reports', value: summary?.total, note: 'in your record' },
    { label: 'Uploaded in last 30 days', value: summary?.recentCount, note: 'recent uploads' },
  ]
  return (<div className="stats grid md:grid-cols-3">
    {cards.map(c => (<div key={c.label} className="stat"><p className="text-sm text-navy-500">{c.label}</p>
      {loading ? <Skeleton className="mt-3 h-9 w-16" /> : <p className="mt-1 font-display text-5xl font-semibold tracking-tight">{c.value}</p>}<p className="text-xs text-navy-300">{c.note}</p></div>))}
    <div className="stat"><p className="text-sm text-navy-500">By category</p>
      {loading ? <Skeleton className="mt-3 h-9 w-full" /> : !summary.categories.length ? <p className="mt-2 text-sm text-navy-300">No categories yet</p> :
        <ul className="mt-2 space-y-1.5">{summary.categories.slice(0, 4).map(c => (<li key={c.category} className="flex items-center gap-2 text-sm"><span className="flex-1">{c.category}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-teal-100"><span className="block h-full bg-teal-600" style={{ width: `${(c.count / summary.total) * 100}%` }} /></span><b className="w-4 text-right">{c.count}</b></li>))}</ul>}
    </div>
  </div>)
}

export function RecentUploads({ items }) {
  if (!items?.length) return null
  return (<div className="lg:border-l lg:border-ink/15 lg:pl-6"><p className="eyebrow">Recent uploads</p>
    <ul className="mt-2 divide-y divide-navy-300/20">{items.map(r => (<li key={r._id} className="flex justify-between gap-3 py-2 text-sm"><span className="truncate font-medium">{r.title}</span><span className="shrink-0 text-navy-500">{fmtDate(r.createdAt)}</span></li>))}</ul></div>)
}

export function UploadPanel({ onUpload }) {
  const input = useRef(); const [file, setFile] = useState(null); const [title, setTitle] = useState(''); const [category, setCategory] = useState('General')
  const [drag, setDrag] = useState(false); const [progress, setProgress] = useState(null); const [error, setError] = useState('')
  const pick = f => {
    setError(''); if (!f) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) return setError('Only PDF, JPG, JPEG and PNG files are allowed.')
    if (f.size > MAX) return setError('File is larger than 10 MB.')
    setFile(f); setTitle(f.name.replace(/\.[^.]+$/, ''))
  }
  const reset = () => { setFile(null); setTitle(''); setProgress(null); setError(''); if (input.current) input.current.value = '' }
  const submit = async () => {
    const fd = new FormData(); fd.append('title', title); fd.append('category', category); fd.append('file', file); setProgress(0); setError('')
    try { await onUpload(fd, setProgress); reset() } catch (e) { setError(e); setProgress(null) }
  }
  const busy = progress !== null
  return (<div className="panel p-5">
    <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" id="file" onChange={e => pick(e.target.files[0])} />
    {!file ? (<label htmlFor="file" onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
      className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-teal-500 bg-teal-50' : 'border-navy-300/50 hover:border-teal-500 hover:bg-teal-50/50'}`}>
      <UploadCloud className="text-teal-600" size={30} /><p className="mt-2 font-semibold">Drag a report here, or <span className="text-teal-700 underline">browse files</span></p><p className="text-xs text-navy-500">PDF, JPG or PNG · up to 10 MB</p></label>) : (
      <div className="space-y-4"><div className="flex items-center gap-3 rounded-lg bg-teal-50 p-3 text-sm"><FileText className="text-teal-600" size={20} /><span className="flex-1 truncate font-semibold">{file.name}</span><span className="text-navy-500">{fmtSize(file.size)}</span>
        {!busy && <button onClick={reset} aria-label="Remove file"><X size={16} /></button>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="t" className="mb-1 block text-xs font-semibold">Title</label><input id="t" className="input" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} disabled={busy} /></div>
          <div><label htmlFor="c" className="mb-1 block text-xs font-semibold">Category</label><select id="c" className="input" value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div></div>
        {busy && <div><div className="h-2 overflow-hidden rounded-full bg-teal-100" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-navy-500">Uploading… {progress}%</p></div>}
        <button className="btn-primary" onClick={submit} disabled={busy || !title.trim()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}{busy ? 'Uploading' : 'Upload report'}</button></div>)}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </div>)
}

export function ReportTable({ reports, onPreview, onDownload, onDelete }) {
  return (<div className="table-wrap"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
    <thead className="bg-teal-50 text-xs uppercase tracking-wide text-navy-500"><tr>{['Report', 'Category', 'Uploaded', 'Type', 'Size', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-navy-300/20">{reports.map(r => (<tr key={r._id} className="transition hover:bg-teal-50/40">
      <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700">{r.mimeType === 'application/pdf' ? <FileText size={17} /> : <ImageIcon size={17} />}</span>
        <div className="min-w-0"><p className="truncate font-semibold">{r.title}</p><p className="truncate text-xs text-navy-500">{r.originalName}</p></div></div></td>
      <td className="px-4 py-3"><span className="cat" data-cat={r.category}>{r.category}</span></td>
      <td className="px-4 py-3 text-navy-500">{fmtDate(r.createdAt)}</td><td className="px-4 py-3">{typeLabel(r.mimeType)}</td><td className="px-4 py-3 text-navy-500">{fmtSize(r.size)}</td>
      <td className="px-4 py-3"><div className="flex gap-1">
        <button onClick={() => onPreview(r)} aria-label={`Preview ${r.title}`} className="rounded-lg p-2 hover:bg-teal-100 hover:text-teal-700"><Eye size={17} /></button>
        <button onClick={() => onDownload(r)} aria-label={`Download ${r.title}`} className="rounded-lg p-2 hover:bg-teal-100 hover:text-teal-700"><Download size={17} /></button>
        <button onClick={() => onDelete(r)} aria-label={`Delete ${r.title}`} className="rounded-lg p-2 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div></td></tr>))}</tbody></table></div></div>)
}
export const TableSkeleton = () => (<div className="panel space-y-3 p-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>)
export const EmptyState = ({ filtered, onClear }) => (<div className="panel grid place-items-center px-6 py-14 text-center"><span className="grid h-14 w-14 place-items-center rounded-md bg-teal-100 text-teal-900"><FolderOpen size={26} /></span>
  <h3 className="mt-4 text-xl font-semibold">{filtered ? 'No reports match your filters' : 'No reports yet'}</h3>
  <p className="mt-1 max-w-sm text-sm text-navy-500">{filtered ? 'Try a different search or category.' : 'Upload your first PDF or image above to start building your record.'}</p>
  {filtered && <button className="btn-outline mt-4" onClick={onClear}>Clear filters</button>}</div>)

export function Modal({ title, onClose, wide, children }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (<div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4" onClick={onClose}><div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className={`panel flex max-h-[90vh] w-full flex-col p-5 ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
    <div className="mb-3 flex items-center justify-between gap-3"><h3 className="truncate text-xl font-semibold">{title}</h3><button onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>)
}
export function PreviewModal({ report, blobUrl, loading, error, onClose }) {
  return (<Modal wide title={report.title} onClose={onClose}><div className="grid min-h-[50vh] flex-1 place-items-center overflow-auto rounded-lg bg-teal-50">
    {loading ? <Loader2 className="animate-spin text-teal-600" /> : error ? <p className="text-sm text-red-600">{error}</p> :
      report.mimeType === 'application/pdf' ? <iframe title="PDF preview" src={blobUrl} className="h-[70vh] w-full rounded-lg" /> : <img src={blobUrl} alt={report.title} className="max-h-[70vh] object-contain" />}</div></Modal>)
}
export const ConfirmDialog = ({ report, busy, onCancel, onConfirm }) => (<Modal title="Delete this report?" onClose={onCancel}>
  <p className="text-sm text-navy-500"><b className="text-navy-900">{report.title}</b> and its stored file will be permanently deleted. This cannot be undone.</p>
  <div className="mt-5 flex justify-end gap-2"><button className="btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
    <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onConfirm} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Delete</button></div></Modal>)
