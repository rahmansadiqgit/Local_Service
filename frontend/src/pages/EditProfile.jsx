import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import RatingRingAvatar from '../components/RatingRingAvatar'
import useAuth from '../context/useAuth'

export default function EditProfile() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
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
  const [selectedPhotoName, setSelectedPhotoName] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
  const profileRatingValue =
    Number(profile?.profile_rating ?? profile?.average_rating ?? profile?.rating)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users/profile/')
        const data = res.data
        setProfile(data)

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
        })
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

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

  const normalizeOptionalUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    return `https://${raw}`
  }

  const normalizeWhatsAppValue = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const digitsOnly = raw.replace(/\D/g, '')
    return digitsOnly
  }

  const extractApiErrorMessage = (error) => {
    const data = error?.response?.data
    if (!data) return 'Failed to update profile.'
    if (typeof data === 'string') return data
    if (typeof data.detail === 'string') return data.detail

    const firstEntry = Object.entries(data)[0]
    if (!firstEntry) return 'Failed to update profile.'

    const [field, value] = firstEntry
    if (Array.isArray(value) && value.length) {
      return `${field}: ${value[0]}`
    }
    if (typeof value === 'string') {
      return `${field}: ${value}`
    }

    return 'Failed to update profile.'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const payload = new FormData()
      const normalizedForm = {
        ...form,
        facebook_link: normalizeOptionalUrl(form.facebook_link),
        whatsapp_link: normalizeWhatsAppValue(form.whatsapp_link),
      }

      Object.entries(normalizedForm).forEach(([key, value]) => {
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
      setMessage('Profile updated successfully.')
      setPhotoFile(null)
      setSelectedPhotoName('')
      await refreshUser(data)
    } catch (error) {
      console.error(error)
      setMessage(extractApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const formLabelClass = 'text-xs font-semibold uppercase tracking-[0.12em] text-violet-600'
  const formInputClass =
    'mt-1.5 w-full rounded-xl border border-violet-200 bg-gradient-to-br from-white/85 to-violet-50/70 px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200'
  const photoChooserText = selectedPhotoName || (profile?.profile_photo ? 'Photo selected' : 'No file chosen')

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <h2 className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl" style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}>
            Edit Profile
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Update your public information and profile photo.</p>
          <img
            src="/images/edit_profile.png"
            alt="Edit profile header illustration"
            className="pointer-events-none absolute right-14 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="card space-y-4 rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(236, 225, 255, 0.56)',
          backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
        }}
      >
        <div className="flex items-center justify-between border-b border-violet-100 pb-2">
          <h3 className="text-lg font-semibold text-violet-900">Edit Profile</h3>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-orange-600 hover:to-amber-600 active:scale-[0.99]"
          >
            Back to Profile
          </button>
        </div>

        <div className="rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md" style={{ backgroundColor: 'rgba(234, 226, 249, 0.56)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-32 w-32 grid place-items-center rounded-full bg-transparent shadow-sm">
              {profilePhotoSrc ? (
                <RatingRingAvatar
                  src={profilePhotoSrc}
                  alt="Preview"
                  rating={Number.isFinite(profileRatingValue) ? profileRatingValue : null}
                  size={128}
                  ringWidth={3}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No photo</div>
              )}
            </div>
            <label htmlFor="edit-profile-photo-upload" className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700">
              Choose File
            </label>
            <input
              id="edit-profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setPhotoFile(file)
                setSelectedPhotoName(file?.name || '')
              }}
              className="hidden"
            />
            <p className="text-xs text-slate-500">{photoChooserText}</p>
          </div>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <div>
            <label className={formLabelClass}>Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={formInputClass}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className={formLabelClass}>Phone no</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={formInputClass}
              placeholder="Enter phone number (e.g. 01610011010)"
            />
          </div>
          <div>
            <label className={formLabelClass}>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className={formInputClass}
              placeholder="Enter your city or area"
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
                  <span className={`h-2 w-2 rounded-full ${form.supply_status.includes(status) ? 'bg-white' : 'bg-violet-300'}`} />
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
                  <span className={`h-2 w-2 rounded-full ${form.demand_status.includes(status) ? 'bg-white' : 'bg-fuchsia-300'}`} />
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
              rows={3}
              className={formInputClass}
              placeholder="Write your education and key skills"
            />
          </div>
          <div className="lg:col-span-2">
            <label className={formLabelClass}>Experience</label>
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={3}
              className={formInputClass}
              placeholder="Describe your work experience"
            />
          </div>
          <div>
            <label className={formLabelClass}>Facebook</label>
            <input
              name="facebook_link"
              value={form.facebook_link}
              onChange={handleChange}
              className={formInputClass}
              placeholder="Facebook profile link (e.g. facebook.com/username)"
            />
          </div>
          <div>
            <label className={formLabelClass}>WhatsApp</label>
            <input
              name="whatsapp_link"
              value={form.whatsapp_link}
              onChange={handleChange}
              className={formInputClass}
              placeholder="WhatsApp number or link (e.g. 01610011010 or wa.me/01610011010)"
            />
          </div>
          <div className="lg:col-span-2 flex flex-col items-center">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
            {message && (
              <p className={`mt-2 text-center text-sm font-medium ${message.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
