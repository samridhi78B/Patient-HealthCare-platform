import { Navigate, useLocation } from 'react-router-dom'

export default function ClinicianLogin() {
  const location = useLocation()
  return <Navigate to="/login" replace state={location.state} />
}
