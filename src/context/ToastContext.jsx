import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
const Ctx = createContext(null)
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = id => setItems(i => i.filter(t => t.id !== id))
  const push = useCallback((type, text) => { const id = Math.random(); setItems(i => [...i, { id, type, text }]); setTimeout(() => dismiss(id), 4500) }, [])
  const toast = { success: t => push('success', t), error: t => push('error', t) }
  return (<Ctx.Provider value={toast}>{children}
    <div className="fixed bottom-4 right-4 z-[60] space-y-2" role="status" aria-live="polite">
      {items.map(t => (<div key={t.id} className={`flex max-w-sm items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-card ${t.type === 'success' ? 'border-teal-200' : 'border-red-200'}`}>
        {t.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 text-teal-600" /> : <AlertCircle size={18} className="mt-0.5 text-red-600" />}
        <p className="flex-1">{t.text}</p><button onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button></div>))}
    </div></Ctx.Provider>)
}
