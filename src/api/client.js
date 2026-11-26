import axios from 'axios'
// Cookie-based auth: the JWT lives in an HTTP-only cookie the browser sends automatically.
// X-Requested-With is the CSRF guard header the server requires on non-GET requests.
const api = axios.create({ baseURL: '/api', withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
const clinicianHttp = axios.create({ baseURL: '/api', withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
export const errMsg = e => e.response?.data?.message || (e.request ? 'Cannot reach the server. Is the backend running?' : e.message)
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401 && !e.config.url.startsWith('/auth/')) window.dispatchEvent(new Event('medlink:unauthorized'))
  return Promise.reject(e)
})
clinicianHttp.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) window.dispatchEvent(new Event('medlink:unauthorized'))
  return Promise.reject(e)
})
export const authApi = {
  register: d => api.post('/auth/register', d).then(r => r.data),
  login: d => api.post('/auth/login', d).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}
export const reportsApi = {
  list: params => api.get('/reports', { params }).then(r => r.data),
  summary: () => api.get('/reports/summary').then(r => r.data),
  upload: (formData, onProgress) => api.post('/reports/upload', formData, { onUploadProgress: e => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)) }).then(r => r.data),
  file: (id, inline) => api.get(`/reports/${id}/download`, { params: inline ? { disposition: 'inline' } : {}, responseType: 'blob' }),
  remove: id => api.delete(`/reports/${id}`).then(r => r.data),
  get: id => api.get(`/reports/${id}`).then(r => r.data),
  addTestResult: (id, data) => api.post(`/reports/${id}/results`, data).then(r => r.data),
  updateTestResult: (id, resultId, data) => api.put(`/reports/${id}/results/${resultId}`, data).then(r => r.data),
  removeTestResult: (id, resultId) => api.delete(`/reports/${id}/results/${resultId}`).then(r => r.data),
}
export const appointmentsApi = {
  hospitals: params => api.get('/hospitals', { params }).then(r => r.data),
  doctors: (hospitalId, params) => api.get(`/hospitals/${hospitalId}/doctors`, { params }).then(r => r.data),
  availability: (doctorId, params) => api.get(`/doctors/${doctorId}/availability`, { params }).then(r => r.data),
  list: () => api.get('/appointments').then(r => r.data),
  create: data => api.post('/appointments', data).then(r => r.data),
  cancel: id => api.post(`/appointments/${id}/cancel`).then(r => r.data),
  reschedule: (id, data) => api.post(`/appointments/${id}/reschedule`, data).then(r => r.data),
}
export const profileApi = {
  get: () => api.get('/profile').then(r => r.data),
  update: data => api.put('/profile', data).then(r => r.data),
  getEmergencyQr: () => api.get('/profile/emergency-qr').then(r => r.data),
  regenerateEmergencyQr: () => api.post('/profile/emergency-qr/regenerate').then(r => r.data),
  revokeEmergencyQr: () => api.delete('/profile/emergency-qr').then(r => r.data),
}
export const historyApi = {
  list: () => api.get('/history').then(r => r.data),
  review: id => api.post(`/history/${id}/review`).then(r => r.data),
}
export const clinicianApi = {
  register: data => clinicianHttp.post('/clinician/register', data).then(r => r.data),
  login: data => clinicianHttp.post('/clinician/login', data).then(r => r.data),
  logout: () => clinicianHttp.post('/clinician/logout').then(r => r.data),
  me: () => clinicianHttp.get('/clinician/me').then(r => r.data),
  accessHistory: () => clinicianHttp.get('/clinician/access-history').then(r => r.data),
  revokePatientQr: patientId => clinicianHttp.post(`/clinician/patients/${patientId}/qr/revoke`).then(r => r.data),
}
export const doctorApi = {
  dashboard: () => clinicianHttp.get('/doctor/dashboard').then(r => r.data),
  patients: params => clinicianHttp.get('/doctor/patients', { params }).then(r => r.data),
  patient: id => clinicianHttp.get(`/doctor/patients/${id}`).then(r => r.data),
  addNote: (id, data) => clinicianHttp.post(`/doctor/patients/${id}/notes`, data).then(r => r.data),
  appointments: params => clinicianHttp.get('/doctor/appointments', { params }).then(r => r.data),
  updateAppointment: (id, data) => clinicianHttp.patch(`/doctor/appointments/${id}`, data).then(r => r.data),
  rescheduleAppointment: (id, data) => clinicianHttp.post(`/doctor/appointments/${id}/reschedule`, data).then(r => r.data),
  reports: params => clinicianHttp.get('/doctor/reports', { params }).then(r => r.data),
  reviewReport: (id, data) => clinicianHttp.patch(`/doctor/reports/${id}/review`, data).then(r => r.data),
  reportFile: (id, inline = false) => clinicianHttp.get(`/doctor/reports/${id}/download`, {
    params: inline ? { disposition: 'inline' } : {},
    responseType: 'blob',
  }),
  profile: () => clinicianHttp.get('/doctor/profile').then(r => r.data),
  updateProfile: data => clinicianHttp.put('/doctor/profile', data).then(r => r.data),
  changePassword: data => clinicianHttp.post('/doctor/profile/password', data).then(r => r.data),
}
export const emergencyApi = {
  openByQr: (qrToken, reason) => clinicianHttp.post('/emergency/open', { qrToken, reason }).then(r => r.data),
  openByPatientId: (patientId, reason, readOnly = false) => clinicianHttp.post('/emergency/open', { patientId, reason, readOnly }).then(r => r.data),
  summary: accessToken => clinicianHttp.get('/emergency/session/summary', { headers: { 'X-Emergency-Access-Token': accessToken } }).then(r => r.data),
  close: accessToken => clinicianHttp.post('/emergency/session/close', {}, { headers: { 'X-Emergency-Access-Token': accessToken } }).then(r => r.data),
  records: accessToken => clinicianHttp.get('/emergency/session/records', { headers: { 'X-Emergency-Access-Token': accessToken } }).then(r => r.data),
  reportFile: (accessToken, reportId) => clinicianHttp.get(`/emergency/session/reports/${reportId}/download`, {
    headers: { 'X-Emergency-Access-Token': accessToken },
    responseType: 'blob',
  }),
  verifyHistoryItem: (accessToken, itemId) => clinicianHttp.post(`/emergency/session/history/${itemId}/verify`, {}, {
    headers: { 'X-Emergency-Access-Token': accessToken },
  }).then(r => r.data),
  addHistoryItem: (accessToken, data) => clinicianHttp.post('/emergency/session/history', data, {
    headers: { 'X-Emergency-Access-Token': accessToken },
  }).then(r => r.data),
}
export const measurementsApi = {
  list: () => api.get('/measurements').then(r => r.data),
  create: data => api.post('/measurements', data).then(r => r.data),
  update: (id, data) => api.put(`/measurements/${id}`, data).then(r => r.data),
  remove: id => api.delete(`/measurements/${id}`).then(r => r.data),
}
export const journalApi = {
  list: params => api.get('/journal', { params }).then(r => r.data),
  trends: params => api.get('/journal/trends', { params }).then(r => r.data),
  export: params => api.get('/journal/export', { params }).then(r => r.data),
  appointments: () => api.get('/journal/appointments').then(r => r.data),
  create: data => api.post('/journal', data).then(r => r.data),
  update: (id, data) => api.put(`/journal/${id}`, data).then(r => r.data),
  remove: id => api.delete(`/journal/${id}`).then(r => r.data),
}
export const wellnessApi = {
  list: params => api.get('/wellness', { params }).then(r => r.data),
  create: data => api.post('/wellness', data).then(r => r.data),
  update: (id, data) => api.put(`/wellness/${id}`, data).then(r => r.data),
}
export default api
