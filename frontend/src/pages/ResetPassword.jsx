import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await api.post('/auth/password-reset/', { email })
      setMessage('If the email exists, a reset link was sent.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 sm:px-8 sm:py-4">
          <h2
            className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Reset Password
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Get a reset link by email.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-70"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        {message && <p className="text-sm text-slate-500">{message}</p>}
        <p className="text-sm text-slate-500">
          Back to{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
