import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import defaultAvatar from '../assets/default-avatar.svg'

export default function Connections() {
  const [selected, setSelected] = useState(null)
  const [memberCategory, setMemberCategory] = useState('Expertise')
  const [posts, setPosts] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [overview, setOverview] = useState({
    live_connections: [],
    new_connections: [],
    recent_connections: [],
    member_connections: {
      expertise: [],
      skill_provider: [],
      supplier: [],
    },
    incoming_requests: [],
    outgoing_requests: [],
  })
  const [selfAssignLoading, setSelfAssignLoading] = useState('')
  const [requestActionLoading, setRequestActionLoading] = useState('')
  const [message, setMessage] = useState('')

  const normalizeOverview = (data) => ({
    live_connections: Array.isArray(data?.live_connections) ? data.live_connections : [],
    new_connections: Array.isArray(data?.new_connections) ? data.new_connections : [],
    recent_connections: Array.isArray(data?.recent_connections) ? data.recent_connections : [],
    member_connections: {
      expertise: Array.isArray(data?.member_connections?.expertise)
        ? data.member_connections.expertise
        : [],
      skill_provider: Array.isArray(data?.member_connections?.skill_provider)
        ? data.member_connections.skill_provider
        : [],
      supplier: Array.isArray(data?.member_connections?.supplier)
        ? data.member_connections.supplier
        : [],
    },
    incoming_requests: Array.isArray(data?.incoming_requests) ? data.incoming_requests : [],
    outgoing_requests: Array.isArray(data?.outgoing_requests) ? data.outgoing_requests : [],
  })

  const loadOverview = async () => {
    const { data } = await api.get('/connections/overview/')
    setOverview(normalizeOverview(data))
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [postRes, erpRes, meRes, overviewRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/erp/'),
          api.get('/auth/me/'),
          api.get('/connections/overview/'),
        ])
        if (!active) return
        setPosts(postRes.data)
        setErpItems(erpRes.data)
        setCurrentUserId(meRes.data?.id ?? null)
        setOverview(normalizeOverview(overviewRes.data))
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

  const roleEntries = [
    { key: 'expertise', label: 'Expertise' },
    { key: 'skill_provider', label: 'Skill provider' },
    { key: 'supplier', label: 'Supplier' },
  ]

  const memberCategoryToRoleKey = {
    Expertise: 'expertise',
    'Skill Providers': 'skill_provider',
    'Delivery Man': 'supplier',
  }

  const selectedMemberRoleKey = memberCategoryToRoleKey[memberCategory] || 'expertise'
  const memberCards = Array.isArray(overview.member_connections?.[selectedMemberRoleKey])
    ? overview.member_connections[selectedMemberRoleKey]
    : []

  const openSelfAssignPosts = useMemo(() => {
    return (erpItems || []).flatMap((erp) => {
      const snapshot = erp.configuration_snapshot || {}
      const members = snapshot.members || {}

      return roleEntries
        .filter(({ key }) => Boolean(members[key]?.self_assign_enabled))
        .map(({ key, label }) => ({
          erp,
          role: key,
          roleLabel: label,
          assignedIds: Array.isArray(members[key]?.assignee_ids) ? members[key].assignee_ids : [],
        }))
    })
  }, [erpItems])

  const handleSelfAssign = async (erpId, role, assign) => {
    const loadingKey = `${erpId}-${role}`
    setSelfAssignLoading(loadingKey)
    try {
      const { data } = await api.post(`/erp/${erpId}/self_assign/`, { role, assign })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage(assign ? 'You assigned yourself successfully.' : 'You removed yourself successfully.')
      await loadOverview()
    } catch (error) {
      console.error(error)
      setMessage('Failed to update self assignment.')
    } finally {
      setSelfAssignLoading('')
    }
  }

  const handleRespondRequest = async (requestId, decision) => {
    const loadingKey = `${requestId}-${decision}`
    setRequestActionLoading(loadingKey)
    try {
      await api.post(`/connections/${requestId}/respond/`, { decision })
      await loadOverview()
      setMessage(decision === 'accept' ? 'Connection request accepted.' : 'Connection request rejected.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to update connection request.')
    } finally {
      setRequestActionLoading('')
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

  const normalizeFacebookHref = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    return `https://${raw}`
  }

  const normalizeWhatsAppHref = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    const digitsOnly = raw.replace(/\D/g, '')
    return digitsOnly ? `https://wa.me/${digitsOnly}` : ''
  }

  const handleCardKeyDown = (event, person, type) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelected({ ...person, type })
    }
  }

  const renderCard = (person, type) => (
    <div
      key={person.id}
      role="button"
      tabIndex={0}
      onClick={() => setSelected({ ...person, type })}
      onKeyDown={(event) => handleCardKeyDown(event, person, type)}
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
              <p className="truncate">
                <span className="font-semibold text-slate-700">WhatsApp:</span>{' '}
                <a
                  href={normalizeWhatsAppHref(person.whatsapp_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-brand-600 hover:underline"
                >
                  {person.whatsapp_link}
                </a>
              </p>
            ) : null}
            {person.facebook_link ? (
              <p className="truncate">
                <span className="font-semibold text-slate-700">Facebook:</span>{' '}
                <a
                  href={normalizeFacebookHref(person.facebook_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-brand-600 hover:underline"
                >
                  {person.facebook_link}
                </a>
              </p>
            ) : null}
          </div>
        </div>
        <span className="ml-auto rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
          {type}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{person.location}</p>
    </div>
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

      {message ? (
        <div className="card border border-slate-200 bg-white/80 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Members</h3>
              <p className="text-xs text-slate-400">Accepted connection requests.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Expertise', 'Skill Providers', 'Delivery Man'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setMemberCategory(category)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    memberCategory === category
                      ? 'border-violet-400 bg-violet-100 text-violet-800'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-violet-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="card border border-slate-200 bg-white/80">
              <p className="text-sm font-semibold">Incoming Requests</p>
              <div className="mt-2 space-y-2 text-sm">
                {overview.incoming_requests.length ? (
                  overview.incoming_requests.map((item) => (
                    <div key={`incoming-${item.id}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="font-semibold text-slate-800">{item.requester_name || `User #${item.requester}`}</p>
                      <p className="text-xs text-slate-500">{item.request_message || 'No request message.'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(item.id, 'accept')}
                          disabled={requestActionLoading === `${item.id}-accept`}
                          className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(item.id, 'reject')}
                          disabled={requestActionLoading === `${item.id}-reject`}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No incoming requests.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {memberCards.length ? (
                memberCards.map((person) => renderCard(person, memberCategory))
              ) : (
                <p className="text-sm text-slate-500">No members yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Live</h3>
              <p className="text-xs text-slate-400">Connections currently active in ERP.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {overview.live_connections.length ? (
                overview.live_connections.map((person) => renderCard(person, 'Live'))
              ) : (
                <p className="text-sm text-slate-500">No live connections yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent</h3>
              <p className="text-xs text-slate-400">Previously live ERP connections.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {overview.recent_connections.length ? (
                overview.recent_connections.map((person) => renderCard(person, 'Recent'))
              ) : (
                <p className="text-sm text-slate-500">No recent connections yet.</p>
              )}
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
                    className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700"
                  >
                    {selected.type}
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
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <div className={profileLikeBoxClass}>
            <h3 className="text-lg font-semibold">Self-Assign ERP Posts</h3>
            <p className="mt-1 text-xs text-slate-500">If provider generated assignment post, you can assign or remove yourself here.</p>
            <div className="mt-3 space-y-2">
              {openSelfAssignPosts.length ? (
                openSelfAssignPosts.map(({ erp, role, roleLabel, assignedIds }) => {
                  const isAssigned = assignedIds.map((id) => Number(id)).includes(Number(currentUserId))
                  const loadingKey = `${erp.id}-${role}`
                  const postName = posts.find((item) => Number(item.id) === Number(erp.post))?.post_name || `ERP #${erp.id}`
                  return (
                    <div key={`${erp.id}-${role}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{postName}</p>
                        <p className="text-xs text-slate-500">Role: {roleLabel}</p>
                      </div>
                      <button
                        type="button"
                        disabled={selfAssignLoading === loadingKey}
                        onClick={() => handleSelfAssign(erp.id, role, !isAssigned)}
                        className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {selfAssignLoading === loadingKey
                          ? 'Updating...'
                          : isAssigned
                            ? 'Remove Myself'
                            : 'Assign Myself'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">No open self-assign posts right now.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
