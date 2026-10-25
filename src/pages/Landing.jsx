import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, FileHeart, FolderHeart, LockKeyhole, ShieldCheck } from 'lucide-react'
import Logo from '../components/Logo.jsx'

const features = [
  { icon: FolderHeart, number: '01', title: 'Your records, together', detail: 'Keep medical documents organized in a private, signed-in workspace.' },
  { icon: CalendarDays, number: '02', title: 'Appointments made clear', detail: 'Explore the booking flow and keep track of your saved appointments.' },
  { icon: LockKeyhole, number: '03', title: 'Built around privacy', detail: 'Your personal records are available only within your authenticated account.' },
]

export default function Landing() {
  return (
    <div className="overflow-hidden">
      <header className="relative z-10 border-b border-ink/10 bg-ivory/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary"><a href="#how-it-works" className="nav-link">How it works</a><a href="#privacy" className="nav-link">Privacy</a></nav>
          <div className="flex items-center gap-3"><Link to="/login" className="nav-link px-2 !text-ink">Log in</Link><Link to="/register" className="btn-primary">Create account <ArrowRight size={15} /></Link></div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <p className="section-kicker">A considered space for your care</p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3rem,7vw,6.8rem)] leading-[.94]">Health records, <span className="hl">more human.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-navy-500 sm:text-lg">Bring your medical documents and appointments into one thoughtfully organized, private workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="btn-primary px-5 py-3">Get started <ArrowRight size={16} /></Link><Link to="/login" className="btn-outline px-5 py-3">Log in to your account</Link></div>
            <div className="mt-8 flex items-center gap-2 text-xs text-navy-500"><ShieldCheck size={16} className="text-teal-700" />Private access for signed-in members</div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div aria-hidden="true" className="absolute -right-12 -top-8 h-52 w-52 rounded-full bg-teal-100/70 blur-3xl" />
            <div className="relative border border-ink/10 bg-paper p-4 shadow-[0_24px_70px_rgb(18_59_64_/_0.12)] sm:p-6">
              <div className="flex items-center justify-between border-b border-ink/10 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-navy-500">Member workspace</p><p className="mt-1 font-display text-xl font-semibold">A clear view of your care</p></div><span className="grid h-10 w-10 place-items-center bg-teal-900 text-teal-100"><FileHeart size={19} /></span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_.82fr]">
                <div className="flex min-h-44 flex-col justify-between bg-sage-100/80 p-5">
                  <span className="grid h-9 w-9 place-items-center bg-paper text-teal-700"><FolderHeart size={18} /></span>
                  <div><p className="font-semibold">Medical reports</p><p className="mt-1 text-xs leading-5 text-navy-500">Upload, find, preview, and manage your own files.</p></div>
                </div>
                <div className="flex min-h-44 flex-col justify-between bg-teal-900 p-5 text-ivory">
                  <span className="grid h-9 w-9 place-items-center bg-white/10 text-teal-100"><CalendarDays size={18} /></span>
                  <div><p className="font-semibold">Appointments</p><p className="mt-1 text-xs leading-5 text-white/65">Choose a provider and review an appointment before saving.</p></div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 border border-ink/10 p-4"><span className="grid h-9 w-9 place-items-center bg-teal-50 text-teal-700"><LockKeyhole size={17} /></span><div><p className="text-sm font-semibold">Your private health space</p><p className="mt-1 text-xs text-navy-500">Accessible after you sign in.</p></div></div>
              <p className="mt-4 text-[10px] uppercase tracking-[.12em] text-navy-300">Interface preview · no patient data shown</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="surface-teal">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
            <div className="grid gap-5 lg:grid-cols-[1fr_.65fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal-100">A calmer way to stay organized</p><h2 className="mt-3 max-w-2xl text-3xl leading-tight text-white sm:text-5xl">Keep your healthcare details close, without the clutter.</h2></div><p className="max-w-md text-sm leading-6 text-white/65">MedLink brings together tools for personal records and appointment management in one accessible experience.</p></div>
            <div className="mt-10 grid border-t border-white/15 md:grid-cols-3">{features.map(({ icon: Icon, number, title, detail }, index) => <article key={number} className={`py-7 md:px-7 ${index > 0 ? 'md:border-l md:border-white/15' : 'md:pl-0'} ${index < features.length - 1 ? 'border-b border-white/15 md:border-b-0' : ''}`}><div className="flex items-center justify-between"><Icon size={22} className="text-teal-100" /><span className="font-display text-3xl text-white/25">{number}</span></div><h3 className="mt-7 text-xl text-white">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-white/65">{detail}</p></article>)}</div>
          </div>
        </section>

        <section id="privacy" className="mx-auto grid max-w-7xl gap-7 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
          <div><p className="section-kicker">Respectful by design</p><h2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">Your personal records deserve a private place.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-navy-500">Sign in to access your account, manage uploaded reports, and review appointment details saved for you. Demonstration booking listings are identified in the app and are not real provider bookings.</p></div>
          <Link to="/register" className="btn-primary justify-self-start px-5 py-3 lg:justify-self-end">Create your account <ArrowRight size={16} /></Link>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-teal-900 py-7 text-sm text-white/60"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 lg:px-8"><Logo light /><p>© 2026 MedLink AI · Demonstration healthcare platform, not a clinical service.</p></div></footer>
    </div>
  )
}
