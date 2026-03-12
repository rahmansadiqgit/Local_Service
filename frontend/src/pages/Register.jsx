import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuth from '../context/useAuth'

const initialForm = {
  username: '',
  email: '',
  phone: '',
  password: '',
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState(initialForm)
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
      await api.post('/auth/register/', form)
      await login({ email: form.email, password: form.password })
      setMessage('Registration successful.')
      setForm(initialForm)
      navigate('/')
    } catch (error) {
      console.error(error)
      const data = error?.response?.data
      if (data && typeof data === 'object') {
        const details = Object.entries(data)
          .map(([field, messages]) => {
            const text = Array.isArray(messages) ? messages.join(' ') : `${messages}`
            return `${field}: ${text}`
          })
          .join(' | ')
        setMessage(details || 'Registration failed. Check inputs.')
      } else {
        setMessage('Registration failed. Check inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Register</h2>
        <p className="text-sm text-slate-500">Create a new Localix account.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
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
        </div>

        <button
  type="submit"
  disabled={loading}
  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        {message && <p className="text-sm text-rose-500">{message}</p>}
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
