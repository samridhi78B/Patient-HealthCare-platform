import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
export const Overview = () => { const { user } = useAuth(); return (
  <div className="panel p-8"><h1 className="text-3xl font-semibold">Welcome, {user.name}</h1>
    <p className="mt-2 max-w-xl text-navy-500">This overview page is a placeholder for the first evaluation. Your uploaded documents live under My Medical Reports.</p>
    <Link to="/reports" className="btn-primary mt-6">Open my reports</Link></div>) }
export const Profile = () => { const { user } = useAuth(); return (
  <div className="panel max-w-xl p-8"><h1 className="text-3xl font-semibold">Profile</h1>
    <dl className="mt-6 space-y-4 text-sm">{[['Full name', user.name], ['Email', user.email], ['Phone', user.phone], ['Member since', new Date(user.createdAt).toLocaleDateString()]].map(([k, v]) => (
      <div key={k} className="flex justify-between gap-4 border-b border-navy-300/20 pb-3"><dt className="text-navy-500">{k}</dt><dd className="font-semibold">{v}</dd></div>))}</dl>
    <p className="mt-5 text-xs text-navy-500">Profile editing is planned for a later version.</p></div>) }
