import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import RatingRingAvatar from '../components/RatingRingAvatar'

const ROLE_ENTRIES = [
  { key: 'expertise', label: 'Expertise' },
  { key: 'skill_provider', label: 'Skill provider' },
  { key: 'supplier', label: 'Delivary Man' },
]

export default function Connections() {
  const [selected, setSelected] = useState(null)
  const [memberCategory, setMemberCategory] = useState('Expertise')
  const [posts, setPosts] = useState([])
  const [ratings, setRatings] = useState([])
  const [users, setUsers] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [overview, setOverview] = useState({
    hired_connections: [],
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
  const [removeConnectionLoading, setRemoveConnectionLoading] = useState('')
  const [message, setMessage] = useState('')

  const normalizeOverview = (data) => ({
    hired_connections: Array.isArray(data?.hired_connections) ? data.hired_connections : [],
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
        const [postRes, ratingRes, userRes, erpRes, meRes, overviewRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/ratings/'),
          api.get('/users/'),
          api.get('/erp/'),
          api.get('/auth/me/'),
          api.get('/connections/overview/'),
        ])
        if (!active) return
        setPosts(postRes.data)
        setRatings(Array.isArray(ratingRes.data) ? ratingRes.data : [])
        setUsers(Array.isArray(userRes.data) ? userRes.data : [])
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

  const usersById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(users) ? users : []).forEach((user) => {
      if (user && user.id !== undefined && user.id !== null) {
        map.set(Number(user.id), user)
      }
    })
    return map
  }, [users])

  const averageRatingByUser = useMemo(() => {
    const totals = new Map()
    const counts = new Map()

    ;(Array.isArray(ratings) ? ratings : []).forEach((entry) => {
      const providerId = Number(entry?.provider)
      const value = Number(entry?.rating_value)
      if (!Number.isFinite(providerId) || providerId <= 0 || !Number.isFinite(value)) return
      totals.set(providerId, (totals.get(providerId) || 0) + value)
      counts.set(providerId, (counts.get(providerId) || 0) + 1)
    })

    const averages = new Map()
    totals.forEach((sum, userId) => {
      const count = counts.get(userId) || 1
      averages.set(userId, sum / count)
    })

    return averages
  }, [ratings])

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
    const getResponsibilityText = (erp, roleKey) => {
      const snapshot = erp?.configuration_snapshot || {}
      const expertiseRows = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
      const serviceRows = Array.isArray(snapshot.services) ? snapshot.services : []
      const productRows = Array.isArray(snapshot.products) ? snapshot.products : []

      const uniqueNames = (rows) =>
        Array.from(
          new Set(
            rows
              .map((row) => String(row?.name || '').trim())
              .filter(Boolean),
          ),
        )

      if (roleKey === 'expertise') {
        const names = uniqueNames(expertiseRows)
        return names.length ? `Work as: ${names.join(', ')}` : 'Work as listed in ERP details.'
      }

      if (roleKey === 'skill_provider') {
        const names = uniqueNames(serviceRows)
        return names.length ? `Provide service: ${names.join(', ')}` : 'Provide service as listed in ERP details.'
      }

      if (roleKey === 'supplier') {
        const names = uniqueNames(productRows)
        return names.length ? `Deliver product: ${names.join(', ')}` : 'Deliver product as listed in ERP details.'
      }

      return 'See ERP details for responsibility.'
    }

    return (erpItems || []).flatMap((erp) => {
      if (String(erp?.stage || '').trim().toLowerCase() === 'on process') {
        return []
      }

      const snapshot = erp.configuration_snapshot || {}
      const members = snapshot.members || {}

      return ROLE_ENTRIES
        .filter(({ key }) => {
          if (!members[key]?.self_assign_enabled) return false

          const rawTargetIds = Array.isArray(members[key]?.self_assign_target_ids)
            ? members[key].self_assign_target_ids
            : []
          const targetIds = rawTargetIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)

          const rawAssignedIds = Array.isArray(members[key]?.assignee_ids)
            ? members[key].assignee_ids
            : []
          const assignedIds = rawAssignedIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)

          // Show only to explicitly targeted users, or users already assigned in this role.
          const currentId = Number(currentUserId)
          return targetIds.includes(currentId) || assignedIds.includes(currentId)
        })
        .map(({ key, label }) => ({
          erp,
          role: key,
          roleLabel: label,
          responsibilityText: getResponsibilityText(erp, key),
          assignedIds: Array.isArray(members[key]?.assignee_ids) ? members[key].assignee_ids : [],
          selfAssignMessage: String(members[key]?.self_assign_message || '').trim(),
          postLink: String(members[key]?.self_assign_post_link || '').trim(),
          postTitle: String(members[key]?.self_assign_post_title || '').trim(),
          sourcePostId: members[key]?.self_assign_post_id,
        }))
    })
  }, [erpItems, currentUserId])

  const handleSelfAssign = async (erpId, role, assign) => {
    const loadingKey = `${erpId}-${role}`
    setSelfAssignLoading(loadingKey)
    try {
      const { data } = await api.post(`/erp/${erpId}/self_assign/`, { role, assign })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage(assign ? 'You assigned yourself successfully.' : 'You removed yourself successfully.')
      await loadOverview()
      window.dispatchEvent(new Event('localix:notifications-refresh'))
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

  const handleRemoveConnection = async (person) => {
    const personId = Number(person?.id)
    if (!personId) return

    const personName = person?.name || person?.username || `User #${personId}`
    const confirmed = window.confirm(`Remove connection with ${personName}?`)
    if (!confirmed) return

    setRemoveConnectionLoading(String(personId))
    try {
      await api.post('/connections/remove/', { target_user_id: personId })
      setMessage(`Connection removed with ${personName}.`)
      await loadOverview()
      setSelected((prev) => (prev && Number(prev.id) === personId ? null : prev))
    } catch (error) {
      console.error(error)
      setMessage(error?.response?.data?.detail || 'Failed to remove connection.')
    } finally {
      setRemoveConnectionLoading('')
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
        <RatingRingAvatar
          src={resolveMediaUrl(person.profile_photo)}
          alt={person.name || person.username || 'User'}
          rating={
            averageRatingByUser.get(Number(person?.id))
            ?? Number(person?.profile_rating ?? person?.average_rating ?? person?.rating)
          }
          size={48}
          ringWidth={2}
          className="shrink-0"
        />
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
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleRemoveConnection(person)
          }}
          disabled={removeConnectionLoading === String(person.id)}
          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {removeConnectionLoading === String(person.id) ? 'Removing...' : 'Remove'}
        </button>
      </div>
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
            <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">Manage your Localix network.</p>
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
              <h3 className="text-lg font-semibold">Hired</h3>
              <p className="text-xs text-slate-400">People who requested to connect with you.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {overview.hired_connections.length ? (
                overview.hired_connections.map((person) => renderCard(person, 'Hired'))
              ) : (
                <p className="text-sm text-slate-500">No hired connections yet.</p>
              )}
            </div>
          </div>

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
                      <p className="text-xs font-semibold text-violet-700">
                        Requested as: {item.requested_role_label || 'Skill provider'}
                      </p>
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
                openSelfAssignPosts.map(({ erp, role, roleLabel, responsibilityText, assignedIds, selfAssignMessage, postTitle }) => {
                  const isAssigned = assignedIds.map((id) => Number(id)).includes(Number(currentUserId))
                  const loadingKey = `${erp.id}-${role}`
                  const postRecord = posts.find((item) => Number(item.id) === Number(erp.post)) || null
                  const titleText =
                    postRecord?.post_title ||
                    postTitle ||
                    postRecord?.post_name ||
                    `ERP #${erp.id}`
                  const provider = usersById.get(Number(erp.provider))
                  const providerName =
                    provider?.name || provider?.username || (erp.provider ? `User #${erp.provider}` : 'Unknown')
                  const erpTaskLink = `/erp?erp_id=${erp.id}`
                  return (
                    <div key={`${erp.id}-${role}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{titleText}</p>
                        <p className="text-xs text-slate-500">Role: {roleLabel}</p>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">Requested by: {providerName}</p>
                      <p className="mt-1 text-xs text-slate-600">Responsibility: {responsibilityText}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Message: {selfAssignMessage || 'No message from provider.'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        ERPTaskCard link:{' '}
                        <a href={erpTaskLink} className="font-semibold text-brand-700 hover:underline">
                          Open this ERP task
                        </a>
                      </p>

                      <div className="mt-2 flex justify-end">
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
