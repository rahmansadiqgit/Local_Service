import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import RatingRingAvatar from '../components/RatingRingAvatar';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate()
  const settingsMenuRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profile, setProfile] = useState(null)

  const resolveMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const backendOrigin = apiBase.replace(/\/api\/?$/, '')
    return value.startsWith('/') ? `${backendOrigin}${value}` : `${backendOrigin}/${value}`
  }

  const profilePhotoSrc = resolveMediaUrl(profile?.profile_photo || '')
  const profileRatingValue =
    Number(profile?.profile_rating ?? profile?.average_rating ?? profile?.rating)

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
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (settingsOpen && settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [settingsOpen])

  const currentAvailableStatus = profile?.supply_status || 'None'
  const currentDemandStatus = profile?.demand_status || 'None'
  const facebookLink = String(profile?.facebook_link || '').trim()
  const whatsappValue = String(profile?.whatsapp_link || '').trim()

  const normalizeFacebookHref = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    return `https://${value}`
  }

  const normalizeWhatsAppHref = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    const digitsOnly = value.replace(/\D/g, '')
    return digitsOnly ? `https://wa.me/${digitsOnly}` : ''
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-visible">
        <div ref={settingsMenuRef} className="absolute right-4 top-4 z-30">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-label="Open profile settings"
            aria-expanded={settingsOpen}
            className="settings-gear-btn rounded-full border border-violet-300 bg-white/85 p-2.5 text-violet-700 shadow-sm transition-all duration-200 hover:border-pink-300 hover:bg-pink-100/90 hover:text-pink-700 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-12 w-56 rounded-xl border border-violet-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Settings</p>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    navigate('/profile/edit')
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-pink-100/90 hover:text-pink-700 hover:shadow-[0_0_14px_rgba(236,72,153,0.35)]"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    navigate('/profile/change-password')
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-pink-100/90 hover:text-pink-700 hover:shadow-[0_0_14px_rgba(236,72,153,0.35)]"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    navigate('/report')
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-pink-100/90 hover:text-pink-700 hover:shadow-[0_0_14px_rgba(236,72,153,0.35)]"
                >
                  Report a Problem
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-400"
                >
                  Delete Account (Coming Soon)
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
          <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
            <div>
              <h2
                className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
                style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
              >
                Profile
              </h2>
              <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Manage your Localix profile information.</p>
            </div>
            <img
              src="/images/profile.png"
              alt="Profile header illustration"
              className="pointer-events-none absolute right-14 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
            />
          </div>
        </div>
      </div>

      <div className="card relative overflow-hidden border border-violet-200/70 bg-gradient-to-br from-white/55 via-violet-100/45 to-fuchsia-100/40 shadow-xl backdrop-blur-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_45%)]" />
        <div className="absolute -right-14 -bottom-14 h-36 w-36 rounded-full bg-fuchsia-200/30 blur-2xl" />
        <div className="relative">
        <div className="flex flex-col gap-4 border-b border-violet-100/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-500">Account</p>
            <h3 className="text-2xl font-bold text-slate-900">{profile?.username || '-'}</h3>
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
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-300 to-fuchsia-300 blur-md opacity-70" />
                <div className="relative h-36 w-36 grid place-items-center rounded-full bg-transparent shadow-lg ring-2 ring-violet-300/60">
                  {profilePhotoSrc ? (
                    <RatingRingAvatar
                      src={profilePhotoSrc}
                      alt="Profile"
                      rating={Number.isFinite(profileRatingValue) ? profileRatingValue : null}
                      size={144}
                      ringWidth={4}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                      No photo
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Profile Photo</p>
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
              {facebookLink ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-violet-800">Facebook</p>
                  <a
                    href={normalizeFacebookHref(facebookLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-base font-semibold text-violet-700 hover:underline"
                  >
                    {facebookLink}
                  </a>
                </div>
              ) : null}
              {whatsappValue ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-violet-800">WhatsApp</p>
                  <a
                    href={normalizeWhatsAppHref(whatsappValue)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-base font-semibold text-violet-700 hover:underline"
                  >
                    {whatsappValue}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!id && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/create-post')}
              className="rounded-full border border-violet-500 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              Create a Post
            </button>
          </div>
        )}
        </div>
      </div>

    </div>
  )
}
