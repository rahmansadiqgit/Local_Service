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
      <div className="card">
        <h2 className="text-2xl font-semibold">Reset Password</h2>
        <p className="text-sm text-slate-500">Get a reset link by email.</p>
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
