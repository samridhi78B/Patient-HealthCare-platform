import axios from 'axios'
// Cookie-based auth: the JWT lives in an HTTP-only cookie the browser sends automatically.
// X-Requested-With is the CSRF guard header the server requires on non-GET requests.
const api = axios.create({ baseURL: '/api', withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
export const errMsg = e => e.response?.data?.message || (e.request ? 'Cannot reach the server. Is the backend running?' : e.message)
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401 && !e.config.url.startsWith('/auth/')) window.dispatchEvent(new Event('medlink:unauthorized'))
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
