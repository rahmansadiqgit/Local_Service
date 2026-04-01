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
      const normalizedEmail = email.trim()
      const response = await api.post(
        '/auth/password-reset/',
        { email: normalizedEmail },
        { skipAuth: true, skipAuthRedirect: true },
      )
      setMessage(response?.data?.detail || 'Link sent to this email.')
    } catch (error) {
      console.error(error)
      const data = error?.response?.data
      if (typeof data?.detail === 'string' && data.detail.trim()) {
        setMessage(data.detail)
      } else if (Array.isArray(data?.email) && data.email.length) {
        setMessage(String(data.email[0]))
      } else {
        setMessage('Failed to send reset link.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-28 sm:px-8 sm:py-4 sm:pr-32 lg:pr-36">
          <h2
            className="whitespace-nowrap text-lg font-extrabold tracking-tight text-violet-900 sm:text-2xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Reset Password
          </h2>
          <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-violet-800/80 sm:text-xs">Get a reset link by email.</p>
          <img
            src="/images/reset_pass.png"
            alt="Reset password header illustration"
            className="pointer-events-none absolute right-6 top-1/2 h-24 w-24 -translate-y-1/2 object-contain sm:h-28 sm:w-28 lg:h-32 lg:w-32"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card space-y-4 rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(236, 225, 255, 0.56)',
          backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
        }}
      >
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
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
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
