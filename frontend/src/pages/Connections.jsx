import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import defaultAvatar from '../assets/default-avatar.svg'

const statusStyles = {
  Active: 'bg-emerald-100 text-emerald-700',
  Available: 'bg-blue-100 text-blue-700',
  Viewer: 'bg-transparent text-slate-400',
  Busy: 'bg-rose-100 text-rose-700',
  Inactive: 'bg-transparent text-slate-400',
}

export default function Connections() {
  const [selected, setSelected] = useState(null)
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [postRes, userRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/users/'),
        ])
        if (!active) return
        setPosts(postRes.data)
        setUsers(userRes.data)
      } catch (error) {
        console.error(error)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const recentPosts = useMemo(() => {
    if (!selected) return []
    return posts
      .filter((post) => post.owner_id === selected.id)
      .slice(0, 3)
  }, [posts, selected])

  // If you want to filter users, use another property or remove these filters
  const customers = users;
  const providers = users;

  const sendNotification = async (title, messageText) => {
    setMessage('')
    try {
      await api.post('/notifications/', { title, message: messageText })
      setMessage('Notification sent.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to send notification.')
    }
  }

  const profileLikeBoxClass =
    'card relative overflow-hidden border border-violet-200/70 bg-gradient-to-br from-white/55 via-violet-100/45 to-fuchsia-100/40 shadow-xl backdrop-blur-md'

  const resolveMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const backendOrigin = apiBase.replace(/\/api\/?$/, '')
    return value.startsWith('/') ? `${backendOrigin}${value}` : `${backendOrigin}/${value}`
  }

  const renderCard = (person, type) => (
    <button
      key={person.id}
      type="button"
      onClick={() => setSelected({ ...person, type })}
      className={`${profileLikeBoxClass} text-left transition hover:border-violet-300`}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-violet-200 bg-white">
          <img
            src={resolveMediaUrl(person.profile_photo) || defaultAvatar}
            alt={person.name || person.username || 'User'}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{person.name || person.username}</p>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <p><span className="font-semibold text-slate-700">Phone:</span> {person.phone || '-'}</p>
            <p className="truncate"><span className="font-semibold text-slate-700">Email:</span> {person.email || '-'}</p>
            {person.whatsapp_link ? (
              <p className="truncate"><span className="font-semibold text-slate-700">WhatsApp:</span> {person.whatsapp_link}</p>
            ) : null}
            {person.facebook_link ? (
              <p className="truncate"><span className="font-semibold text-slate-700">Facebook:</span> {person.facebook_link}</p>
            ) : null}
          </div>
        </div>
        <span
          className={`ml-auto rounded-full px-2 py-1 text-xs font-semibold ${
            statusStyles[person.status] || 'text-slate-400'
          }`}
        >
          {person.status || 'Inactive'}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{person.location}</p>
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-40 sm:px-8 sm:py-4 sm:pr-44 lg:pr-48">
          <div>
            <h2
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              Connections
            </h2>
            <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Manage your Localix network.</p>
          </div>
          <img
            src="/images/connections.png"
            alt="Connections header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-36 w-36 -translate-y-1/2 object-contain sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Customers</h3>
          <p className="text-xs text-slate-400">Active = green • Available = blue • Viewer = none</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {customers.map((person) => renderCard(person, 'customer'))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Service Providers</h3>
          <p className="text-xs text-slate-400">Busy = red • Active = yellow • Inactive = none</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {providers.map((person) => renderCard(person, 'provider'))}
        </div>
      </div>

      <div className={profileLikeBoxClass}>
        <h3 className="text-lg font-semibold">Connection Details</h3>
        {!selected ? (
          <p className="mt-3 text-sm text-slate-500">Select a connection to view profile details.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm font-semibold">{selected.name || selected.username}</p>
                <p className="text-xs text-slate-500">{selected.location}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  statusStyles[selected.status] || 'text-slate-400'
                }`}
              >
                {selected.status}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {selected.type === 'customer' ? 'Customer' : 'Provider'}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold">Recent Posts</p>
              <div className="mt-2 space-y-2 text-sm text-slate-500">
                {recentPosts.length === 0 ? (
                  <p>No posts available.</p>
                ) : (
                  recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between">
                      <span>{post.post_name}</span>
                      <span className="text-xs text-slate-400">{post.post_type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  sendNotification(
                    'Booking Request',
                    `Booking initiated with ${selected.name}.`,
                  )
                }
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Book Service
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNotification(
                    'Worker Assignment',
                    `Worker assignment initiated for ${selected.name}.`,
                  )
                }
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Assign Worker
              </button>
              {message && <span className="text-sm text-slate-500">{message}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
