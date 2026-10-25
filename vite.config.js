import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Dev proxy keeps the browser same-origin with the API so the HTTP-only cookie works without extra CORS setup.
export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } } })
