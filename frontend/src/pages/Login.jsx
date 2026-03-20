import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
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
      const params = new URLSearchParams(location.search)
      const nextPath = params.get('next')
      const safeNextPath = nextPath && nextPath.startsWith('/') ? nextPath : '/'
      navigate(safeNextPath)
    } catch (error) {
      console.error(error)
      setMessage('Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <h2
            className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Login
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Access your Localix account.</p>
          <img
            src="/images/log_in.png"
            alt="Login header illustration"
            className="pointer-events-none absolute right-0 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
          />
        </div>
        <button
          type="submit"
          disabled={loading}
         className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
