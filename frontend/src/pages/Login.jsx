import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await login(form)
      navigate('/')
    } catch (error) {
      console.error(error)
      setMessage('Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Login</h2>
        <p className="text-sm text-slate-500">Access your Localix account.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-70"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
        {message && <p className="text-sm text-rose-500">{message}</p>}
        <p className="text-sm text-slate-500">
          <a href="/reset-password" className="font-semibold text-brand-600">
            Forgot password?
          </a>
        </p>
        <p className="text-sm text-slate-500">
          No account?{' '}
          <Link to="/register" className="font-semibold text-brand-600">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
