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
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

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
    setProfileMessage('')
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, value ?? '')
      })
      if (photoFile) {
        payload.append('profile_photo', photoFile)
      }
      const { data } = await api.patch('/users/profile/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(data)
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      console.error(error)
      setProfileMessage('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordMessage('')
    try {
      await api.post('/users/change-password/', passwordForm)
      setPasswordForm({ old_password: '', new_password: '' })
      setPasswordMessage('Password updated successfully.')
    } catch (error) {
      console.error(error)
      setPasswordMessage('Failed to update password.')
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
              {profile?.role || 'Customer'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {profile?.status || 'Available'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-32 w-32 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
              {profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt={profile?.name || 'Profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  No photo
                </div>
              )}
            </div>
            <label className="text-xs font-semibold text-slate-500">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
              className="text-xs text-slate-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Name</p>
              <p className="font-semibold">{profile?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Email</p>
              <p className="font-semibold">{profile?.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Phone</p>
              <p className="font-semibold">{profile?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Location</p>
              <p className="font-semibold">{profile?.location || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Education & Skills</p>
              <p className="font-semibold">{profile?.education_skills || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Experience</p>
              <p className="font-semibold">{profile?.experience || '-'}</p>
            </div>
          </div>
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
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select status</option>
              <option value="Active">Active</option>
              <option value="Busy">Busy</option>
              <option value="Available">Available</option>
            </select>
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
            {profileMessage && (
              <p className="mt-2 text-sm text-slate-500">{profileMessage}</p>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Old Password</label>
            <input
              type="password"
              value={passwordForm.old_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">New Password</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Update Password
            </button>
            {passwordMessage && (
              <p className="mt-2 text-sm text-slate-500">{passwordMessage}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
