import { Link } from 'react-router-dom'
import { ShieldCheck, FileSearch, FolderTree, ArrowRight, Search } from 'lucide-react'
import Logo from '../components/Logo.jsx'
const rows = [['Complete Blood Count', 'Blood Test', '12 Oct'], ['Chest X-Ray', 'Imaging', '28 Sep'], ['ECG Report', 'Cardiology', '14 Sep'], ['Amoxicillin Rx', 'Prescription', '02 Sep']]
const cats = ['Blood Test', 'Imaging', 'Prescription', 'Cardiology', 'General', 'Other']
export default function Landing() {
  return (<div>
    <header className="border-b border-ink/15"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
      <Logo /><nav className="hidden gap-9 md:flex" aria-label="Primary"><a href="#preview" className="nav-link">Workspace</a><a href="#features" className="nav-link">Features</a></nav>
      <div className="flex items-center gap-5"><Link to="/login" className="nav-link !text-ink">Login</Link><Link to="/register" className="btn-primary">Get Started</Link></div></div></header>

    <section className="mx-auto max-w-7xl px-5 pt-14 lg:pt-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8"><p className="eyebrow rise">Patient-centric medical records</p>
          <h1 className="rise d1 mt-6 text-[clamp(3.1rem,8.6vw,8rem)] leading-[.92] tracking-[-0.045em]">Your Medical Records, <span className="hl">Simplified.</span></h1></div>
        <div className="rise d2 lg:col-span-4 lg:pb-3"><p className="max-w-sm text-lg leading-relaxed text-navy-500">MedLink lets you securely organise and access your medical reports in one private place, so your history is ready whenever you need it.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3"><Link to="/register" className="btn-primary px-6 py-3">Get Started <ArrowRight size={16} /></Link><Link to="/login" className="btn-outline px-6 py-3">Login</Link></div></div></div>

      <div id="preview" className="rise d3 relative z-10 mt-14 lg:-mb-32 lg:ml-[8%]" aria-label="Dashboard preview (illustration)">
        <div className="overflow-hidden border border-ink bg-white shadow-[10px_10px_0_rgb(var(--ink)/.9)]">
          <div className="flex items-center justify-between border-b border-ink/15 bg-ivory px-4 py-2"><span className="eyebrow !text-navy-500">medlink / my medical reports</span><span className="eyebrow !text-navy-300">Illustration</span></div>
          <div className="grid sm:grid-cols-[170px_1fr]">
            <div className="hidden bg-teal-900 p-4 text-sm text-white/65 sm:block"><Logo light to="/" />
              <ul className="mt-8 space-y-1">{['Overview', 'My Medical Reports', 'Profile'].map((l, i) => (<li key={l} className={`px-2.5 py-2 text-[13px] font-semibold ${i === 1 ? 'bg-white/10 text-white shadow-[inset_2px_0_0_rgb(var(--lime))]' : ''}`}>{l}</li>))}</ul></div>
            <div className="p-5 sm:p-6"><p className="font-display text-2xl font-semibold">My Medical Reports</p>
              <div className="stats mt-4 grid grid-cols-3">{[['Reports', '12'], ['Last 30 days', '3'], ['Categories', '4']].map(([l, v]) => (<div key={l} className="stat !border-t-0 !px-3 !py-3 first:!pl-0"><p className="text-[11px] text-navy-500">{l}</p><p className="font-display text-3xl font-semibold">{v}</p></div>))}</div>
              <ul className="divide-y divide-ink/10">{rows.map(([n, c, d]) => (<li key={n} className="flex items-center gap-3 py-3 text-sm"><span className="flex-1 font-semibold">{n}</span><span className="cat hidden sm:inline-flex" data-cat={c}>{c}</span><span className="w-14 text-right text-xs text-navy-500">{d}</span></li>))}</ul>
              <div className="mt-3 border border-dashed border-teal-500/60 py-3 text-center text-xs text-navy-500">Drop a report here to upload</div></div></div></div></div>
    </section>

    <section id="features" className="bg-teal-900 pb-24 pt-16 text-ivory lg:pt-52">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid gap-6 lg:grid-cols-12"><h2 className="text-4xl leading-[1.02] sm:text-6xl lg:col-span-7">Built around one idea: your records belong to you.</h2>
          <p className="self-end text-white/70 lg:col-span-4 lg:col-start-9">Three things MedLink does today, and does carefully.</p></div>
        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          <article className="bg-ivory p-8 text-ink transition hover:-translate-y-0.5 lg:col-span-7 lg:p-10"><div className="flex items-start justify-between"><ShieldCheck size={28} className="text-teal-700" /><span className="font-display text-5xl font-semibold text-ink/15">01</span></div>
            <h3 className="mt-10 text-3xl">Secure medical reports</h3><p className="mt-3 max-w-md text-navy-500">Every file is stored privately and served only to the account that uploaded it. There are no public links, ever.</p>
            <ul className="mt-8 grid gap-x-6 gap-y-2 border-t border-ink/15 pt-5 text-sm font-semibold sm:grid-cols-3">{['Private storage', 'Ownership checks', 'Signed-in access only'].map(t => <li key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-teal-700" />{t}</li>)}</ul></article>
          <article className="border border-white/25 p-8 transition hover:border-lime lg:col-span-5 lg:p-10"><div className="flex items-start justify-between"><FileSearch size={28} className="text-lime" /><span className="font-display text-5xl font-semibold text-white/15">02</span></div>
            <h3 className="mt-10 text-3xl">Easy report access</h3><p className="mt-3 text-white/70">Search by name, filter by category and open any report from any device in a couple of clicks.</p>
            <div className="mt-8 flex items-center gap-2 border border-white/25 px-3 py-2.5 text-sm text-white/60"><Search size={15} />Search by title or filename</div></article>
          <article className="bg-sage-100 p-8 text-ink transition hover:-translate-y-0.5 lg:col-span-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:p-10"><div className="max-w-md"><div className="flex items-center gap-3"><FolderTree size={28} className="text-teal-700" /><span className="font-display text-5xl font-semibold text-ink/15">03</span></div>
            <h3 className="mt-6 text-3xl">Organised health records</h3><p className="mt-3 text-navy-500">Sort lab results, scans and prescriptions into categories so nothing gets lost in a drawer.</p></div>
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3 lg:mt-0 lg:max-w-md">{cats.map(c => <li key={c} className="cat !text-base" data-cat={c}>{c}</li>)}</ul></article></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20"><div className="grid items-end gap-8 border-t-2 border-ink pt-10 lg:grid-cols-12">
      <h2 className="text-4xl sm:text-6xl lg:col-span-8">Start with your first report.</h2>
      <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end"><Link to="/register" className="btn-primary px-6 py-3">Get Started <ArrowRight size={16} /></Link><Link to="/login" className="btn-outline px-6 py-3">Login</Link></div></div></section>
    <footer className="bg-ink py-10 text-sm text-white/60"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5"><Logo light /><p>© 2026 MedLink. College project, not a clinical product.</p></div></footer></div>)
}
