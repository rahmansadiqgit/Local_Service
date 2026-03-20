import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../context/useAuth';

export default function Profile() {
  const { id } = useParams();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    supply_status: [],
    demand_status: [],
    education_skills: '',
    experience: '',
    facebook_link: '',
    whatsapp_link: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  const resolveMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const backendOrigin = apiBase.replace(/\/api\/?$/, '')
    return value.startsWith('/') ? `${backendOrigin}${value}` : `${backendOrigin}/${value}`
  }

  const profilePhotoSrc = resolveMediaUrl(previewUrl || profile?.profile_photo || '')

  useEffect(() => {
    const load = async () => {
      try {
        let data;
        if (id) {
          // Fetch other user's profile
          const res = await api.get(`/users/${id}/`);
          data = res.data;
        } else {
          // Fetch current user's profile
          const res = await api.get('/users/profile/');
          data = res.data;
        }
        setProfile(data);
        const parseStatus = (value) => {
          const tokens = value
            ? value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : []
          return tokens.length ? [tokens[0]] : []
        }
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          location: data.location || '',
          supply_status: parseStatus(data.supply_status),
          demand_status: parseStatus(data.demand_status),
          education_skills: data.education_skills || '',
          experience: data.experience || '',
          facebook_link: data.facebook_link || '',
          whatsapp_link: data.whatsapp_link || '',
        });
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (photoFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(photoFile)
    }
  }, [photoFile])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleStatus = (field, value) => {
    setForm((prev) => {
      const currentValue = prev[field]?.[0]
      return { ...prev, [field]: currentValue === value ? [] : [value] }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setProfileMessage('')
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          payload.append(key, value.join(', '))
        } else {
          payload.append(key, value ?? '')
        }
      })
      if (photoFile) {
        payload.append('profile_photo', photoFile)
      }
      const { data } = await api.patch('/users/profile/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(data)
      setPreviewUrl(data.profile_photo || null)
      setProfileMessage('Profile updated successfully.')
      // Clear photoFile after save, but keep preview
      setPhotoFile(null)
      await refreshUser(data)
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

  const formLabelClass = 'text-xs font-semibold uppercase tracking-[0.12em] text-violet-600'
  const formInputClass =
    'mt-1.5 w-full rounded-xl border border-violet-200 bg-gradient-to-br from-white/85 to-violet-50/70 px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200'
  const currentAvailableStatus = form.supply_status?.[0] || 'None'
  const currentDemandStatus = form.demand_status?.[0] || 'None'

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 sm:px-8 sm:py-4">
          <h2
            className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Profile
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Manage your Localix profile information.</p>
        </div>
      </div>

      <div className="card relative overflow-hidden border border-violet-200/70 bg-gradient-to-br from-white/55 via-violet-100/45 to-fuchsia-100/40 shadow-xl backdrop-blur-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_45%)]" />
        <div className="absolute -right-14 -bottom-14 h-36 w-36 rounded-full bg-fuchsia-200/30 blur-2xl" />
        <div className="relative">
        <div className="flex flex-col gap-4 border-b border-violet-100/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-500">Account</p>
            <h3 className="text-2xl font-bold text-slate-900">{profile?.name || profile?.username}</h3>
            <p className="text-sm text-slate-600">{profile?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Role removed */}
            <span className="rounded-full border border-violet-400 bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Available: {currentAvailableStatus}
            </span>
            <span className="rounded-full border border-fuchsia-400 bg-fuchsia-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Demand: {currentDemandStatus}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div
            className="rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(234, 226, 249, 0.56)',
              backgroundImage: 'linear-gradient(135deg, rgba(214, 203, 232, 0.66), rgba(248, 235, 255, 0.62))',
            }}
          >
            <div className="flex flex-col items-center gap-3">
            <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-violet-200 bg-slate-100 shadow-sm">
              {profilePhotoSrc ? (
                <img
                  src={profilePhotoSrc}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  No photo
                </div>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">Profile Photo</p>
            <label
              htmlFor="profile-photo-upload"
              className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              Choose File
            </label>
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
              className="hidden"
            />
            <p className="text-xs text-slate-500">{photoFile?.name || 'No file chosen'}</p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(239, 228, 255, 0.58)',
              backgroundImage: 'linear-gradient(140deg, rgba(227, 208, 255, 0.62), rgba(253, 231, 247, 0.56))',
            }}
          >
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div className="border-b border-violet-100/80 pb-3">
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Name</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.name || '-'}</p>
              </div>
              <div className="border-b border-violet-100/80 pb-3">
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Email</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.email || '-'}</p>
              </div>
              <div className="border-b border-violet-100/80 pb-3">
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Phone</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.phone || '-'}</p>
              </div>
              <div className="border-b border-violet-100/80 pb-3">
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Location</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.location || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Education & Skills</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.education_skills || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Experience</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.experience || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5 rounded-2xl border border-violet-200/80 p-5 shadow-sm backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(236, 225, 255, 0.56)',
            backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
          }}
        >
          <div className="flex items-center justify-between border-b border-violet-100 pb-3">
            <h4 className="text-lg font-semibold text-violet-900">Edit Profile</h4>
            <p className="text-xs font-medium text-violet-500">Keep your public info up to date</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className={formLabelClass}>Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={formInputClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={formInputClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className={formInputClass}
            />
          </div>
          <div className="lg:col-span-2">
            <label className={formLabelClass}>Available Status</label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {['Active', 'Available', 'Viewer'].map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => toggleStatus('supply_status', status)}
                  aria-pressed={form.supply_status.includes(status)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    form.supply_status.includes(status)
                      ? 'border-violet-500 bg-violet-700 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      form.supply_status.includes(status) ? 'bg-white' : 'bg-violet-300'
                    }`}
                  />
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className={formLabelClass}>Demand Status</label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {['Busy', 'Active', 'Inactive'].map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => toggleStatus('demand_status', status)}
                  aria-pressed={form.demand_status.includes(status)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    form.demand_status.includes(status)
                      ? 'border-fuchsia-700 bg-fuchsia-700 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      form.demand_status.includes(status) ? 'bg-white' : 'bg-fuchsia-300'
                    }`}
                  />
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className={formLabelClass}>Education & Skills</label>
            <textarea
              name="education_skills"
              value={form.education_skills}
              onChange={handleChange}
              rows={4}
              className={formInputClass}
              placeholder="Add your study background and professional skills"
            />
          </div>
          <div className="lg:col-span-2">
            <label className={formLabelClass}>Experience</label>
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={4}
              className={formInputClass}
              placeholder="Describe your work experience and achievements"
            />
          </div>
          <div>
            <label className={formLabelClass}>Facebook</label>
            <input
              name="facebook_link"
              value={form.facebook_link}
              onChange={handleChange}
              className={formInputClass}
              placeholder="https://facebook.com/your-profile"
            />
          </div>
          <div>
            <label className={formLabelClass}>WhatsApp</label>
            <input
              name="whatsapp_link"
              value={form.whatsapp_link}
              onChange={handleChange}
              className={formInputClass}
              placeholder="https://wa.me/your-number"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
            {profileMessage && (
              <p
                className={`mt-2 text-sm font-medium ${
                  profileMessage.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {profileMessage}
              </p>
            )}
          </div>
          </div>
        </form>
        </div>
      </div>

      <div className="card relative overflow-hidden border border-violet-200/80 bg-gradient-to-br from-[#efe6ff]/85 via-[#e7dcff]/78 to-[#f3e9ff]/80 shadow-lg backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_52%)]" />
        <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-violet-200/35 blur-2xl" />
        <div className="relative">
        <h3 className="text-lg font-semibold text-violet-900">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Old Password</label>
            <input
              type="password"
              value={passwordForm.old_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">New Password</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
            {passwordMessage && (
              <p className="mt-2 text-sm text-slate-600">{passwordMessage}</p>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
