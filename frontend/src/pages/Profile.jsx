import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    status: '',
    education_skills: '',
    experience: '',
    facebook_link: '',
    whatsapp_link: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/users/profile/')
        setProfile(data)
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          location: data.location || '',
          status: data.status || '',
          education_skills: data.education_skills || '',
          experience: data.experience || '',
          facebook_link: data.facebook_link || '',
          whatsapp_link: data.whatsapp_link || '',
        })
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.patch('/users/profile/', form)
      setProfile(data)
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Profile</h2>
        <p className="text-sm text-slate-500">Manage your Localix profile information.</p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Account</p>
            <h3 className="text-lg font-semibold">{profile?.name || profile?.username}</h3>
            <p className="text-sm text-slate-500">{profile?.email}</p>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
            {profile?.role || 'Customer'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Status</label>
            <input
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Education & Skills</label>
            <textarea
              name="education_skills"
              value={form.education_skills}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Experience</label>
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Facebook</label>
            <input
              name="facebook_link"
              value={form.facebook_link}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">WhatsApp</label>
            <input
              name="whatsapp_link"
              value={form.whatsapp_link}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
