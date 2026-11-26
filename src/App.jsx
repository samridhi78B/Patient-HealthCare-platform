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
import ClinicianLogin from './pages/ClinicianLogin.jsx'
import ClinicianRoute from './components/ClinicianRoute.jsx'
import DoctorLayout from './components/DoctorLayout.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import DoctorPatients from './pages/DoctorPatients.jsx'
import DoctorPatientProfile from './pages/DoctorPatientProfile.jsx'
import DoctorAppointments from './pages/DoctorAppointments.jsx'
import DoctorReports from './pages/DoctorReports.jsx'
import DoctorProfile from './pages/DoctorProfile.jsx'
import DoctorRegistration from './pages/DoctorRegistration.jsx'
import EmergencyAccess from './pages/EmergencyAccess.jsx'
import { Overview } from './pages/Basic.jsx'
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/clinician/login" element={<ClinicianLogin />} />
      <Route path="/doctor/register" element={<DoctorRegistration />} />
      <Route path="/emergency/:token" element={<EmergencyAccess />} />
      <Route path="/clinician/dashboard" element={<Navigate to="/doctor/dashboard" replace />} />
      <Route path="/doctor" element={<ClinicianRoute><DoctorLayout /></ClinicianRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="patients/:patientId" element={<DoctorPatientProfile />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="reports" element={<DoctorReports />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>
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
