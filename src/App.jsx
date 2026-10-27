import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Reports from './pages/Reports.jsx'
import AppointmentsPage from './pages/AppointmentsPage.jsx'
import HealthTimeline from './pages/HealthTimeline.jsx'
import HealthJournal from './pages/HealthJournal.jsx'
import HealthMetrics from './pages/HealthMetrics.jsx'
import Profile from './pages/Profile.jsx'
import { Overview } from './pages/Basic.jsx'
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/health-metrics" element={<HealthMetrics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/health-timeline" element={<HealthTimeline />} />
        <Route path="/health-journal" element={<HealthJournal />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/my" element={<AppointmentsPage />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
