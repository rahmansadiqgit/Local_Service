import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../api/client'
import useAuth from '../context/useAuth'

export default function ReportProblem() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])
  const [form, setForm] = useState({
    subject: '',
    details: '',
  })
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.subject.trim() || !form.details.trim()) {
      setMessage('Please fill both subject and details.')
      return
    }

    setSending(true)
    setMessage('')
    try {
      await api.post('/report-problem/', {
        subject: form.subject,
        details: form.details,
      })
      setMessage('Thanks. Your report has been submitted successfully.')
      setForm({ subject: '', details: '' })
    } catch (error) {
      console.error(error)
      if (error.response?.status === 401) {
        setMessage('Please log in first to submit a report from your account email.')
      } else {
        const detail = error.response?.data?.detail
        setMessage(detail || 'Failed to submit report. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <h2 className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl">Report a Problem</h2>
          <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">Tell us what went wrong and we will investigate.</p>
          <img
            src="/images/report_a_problem.png"
            alt="Report problem header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="card relative overflow-hidden border border-violet-200/80 bg-gradient-to-br from-[#efe6ff]/85 via-[#e7dcff]/78 to-[#f3e9ff]/80 shadow-lg backdrop-blur-sm space-y-4"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_52%)]" />
        <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-violet-200/35 blur-2xl" />
        <div className="relative space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Subject</label>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Short title of the issue"
            className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Details</label>
          <textarea
            name="details"
            value={form.details}
            onChange={handleChange}
            rows={5}
            placeholder="Describe what happened and where you faced the issue."
            className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white transition hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60"
          >
            {sending ? 'Submitting...' : 'Submit Report'}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
        </div>
      </form>
    </div>
  )
}
