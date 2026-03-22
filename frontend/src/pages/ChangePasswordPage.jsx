import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setMessageType('info')
    try {
      await api.post('/users/change-password/', passwordForm)
      setPasswordForm({ old_password: '', new_password: '' })
      setMessage('Password updated successfully.')
      setMessageType('success')
      window.dispatchEvent(new Event('localix:notifications-refresh'))
    } catch (error) {
      console.error(error)
      const detail = error?.response?.data
      if (typeof detail?.detail === 'string' && detail.detail.trim()) {
        setMessage(detail.detail)
      } else if (detail && typeof detail === 'object') {
        const text = Object.entries(detail)
          .map(([field, messages]) => {
            const content = Array.isArray(messages) ? messages.join(' ') : String(messages)
            return `${field}: ${content}`
          })
          .join(' | ')
        setMessage(text || 'Failed to update password.')
      } else {
        setMessage('Failed to update password.')
      }
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <h2 className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl" style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}>
            Change Password
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Keep your account secure by updating your password.</p>
          <img
            src="/images/change_password.png"
            alt="Change password header illustration"
            className="pointer-events-none absolute right-14 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </section>

      <section className="card relative overflow-hidden border border-violet-200/80 bg-gradient-to-br from-[#efe6ff]/85 via-[#e7dcff]/78 to-[#f3e9ff]/80 shadow-lg backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_52%)]" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-violet-900">Password Settings</h3>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-lg border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              Back to Profile
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Old Password</label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">New Password</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
              {message && (
                <p
                  className={`mt-2 text-sm ${
                    messageType === 'error'
                      ? 'text-rose-600'
                      : messageType === 'success'
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
