import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

export default function ResetPasswordConfirm() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const uid = useMemo(() => searchParams.get('uid') || '', [searchParams])
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const missingToken = !uid || !token

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (missingToken) {
      setMessage('Reset link is missing or invalid.')
      return
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      await api.post('/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: password,
      })
      setMessage('Password updated. You can now sign in.')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error(error)
      setMessage('Failed to reset password. Request a new link.')
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
            Set New Password
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">
            Choose a new password for your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm border-slate-200 bg-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm border-slate-200 bg-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading || missingToken}
          className="w-full rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-70"
        >
          {loading ? 'Updating...' : 'Update Password'}
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
