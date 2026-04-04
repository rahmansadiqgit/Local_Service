import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../api/client'
import RatingRingAvatar from '../components/RatingRingAvatar'

const ROLE_ENTRIES = [
  { key: 'expertise', label: 'Expertise' },
  { key: 'skill_provider', label: 'Skill provider' },
  { key: 'supplier', label: 'Delivary Man' },
]

export default function Connections() {
  const location = useLocation()
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

  const deepLinkTarget = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const section = String(params.get('section') || '').trim().toLowerCase()
    const name = String(params.get('name') || '').trim().toLowerCase()
    const role = String(params.get('role') || '').trim().toLowerCase()
    const erpId = String(params.get('erp_id') || '').trim()
    const responsibilityId = String(params.get('responsibility_id') || '').trim()
    const responsibility = String(params.get('responsibility') || '').trim().toLowerCase()
    return {
      section,
      name,
      role,
      erpId,
      responsibilityId,
      responsibility,
      hasNameTarget: Boolean(name),
    }
  }, [location.search])

  useEffect(() => {
    if (deepLinkTarget.section === 'members') {
      if (deepLinkTarget.role === 'supplier') {
        setMemberCategory('Delivery Man')
      } else if (deepLinkTarget.role === 'skill_provider') {
        setMemberCategory('Skill Providers')
      } else if (deepLinkTarget.role === 'expertise') {
        setMemberCategory('Expertise')
      }
    }

    if (!deepLinkTarget.hasNameTarget) return

    const isSamePerson = (person) => {
      const displayName = String(person?.name || person?.username || person?.email || '').trim().toLowerCase()
      return displayName === deepLinkTarget.name
    }

    const hired = Array.isArray(overview.hired_connections) ? overview.hired_connections : []
    const live = Array.isArray(overview.live_connections) ? overview.live_connections : []
    const recent = Array.isArray(overview.recent_connections) ? overview.recent_connections : []
    const memberByRole = overview.member_connections || {}

    let found = null

    if (deepLinkTarget.section === 'hired') {
      const target = hired.find(isSamePerson)
      if (target) found = { person: target, type: 'Hired By' }
    }

    if (!found && deepLinkTarget.section === 'members') {
      const expertise = (Array.isArray(memberByRole.expertise) ? memberByRole.expertise : []).find(isSamePerson)
      const skillProvider = (Array.isArray(memberByRole.skill_provider) ? memberByRole.skill_provider : []).find(isSamePerson)
      const supplier = (Array.isArray(memberByRole.supplier) ? memberByRole.supplier : []).find(isSamePerson)
      if (expertise) {
        setMemberCategory('Expertise')
        found = { person: expertise, type: 'Expertise' }
      } else if (skillProvider) {
        setMemberCategory('Skill Providers')
        found = { person: skillProvider, type: 'Skill Providers' }
      } else if (supplier) {
        setMemberCategory('Delivery Man')
        found = { person: supplier, type: 'Delivery Man' }
      }
    }

    if (!found) {
      const targetInHired = hired.find(isSamePerson)
      if (targetInHired) found = { person: targetInHired, type: 'Hired By' }
    }

    if (!found) {
      const targetInLive = live.find(isSamePerson)
      if (targetInLive) found = { person: targetInLive, type: 'Live' }
    }

    if (!found) {
      const targetInRecent = recent.find(isSamePerson)
      if (targetInRecent) found = { person: targetInRecent, type: 'Recent' }
    }

    if (!found) return

    setSelected((prev) => {
      if (Number(prev?.id) === Number(found.person?.id) && prev?.type === found.type) {
        return prev
      }
      return { ...found.person, type: found.type }
    })

    window.requestAnimationFrame(() => {
      const targetId = Number(found.person?.id)
      const card = Number.isFinite(targetId)
        ? document.getElementById(`connection-card-${targetId}`)
        : null
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }, [deepLinkTarget, overview])

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
        return names.length ? `Work as: ${names.join(', ')}` : 'Work as listed in Process Tracker details.'
      }

      if (roleKey === 'skill_provider') {
        const names = uniqueNames(serviceRows)
        return names.length ? `Provide service: ${names.join(', ')}` : 'Provide service as listed in Process Tracker details.'
      }

      if (roleKey === 'supplier') {
        const names = uniqueNames(productRows)
        return names.length ? `Deliver product: ${names.join(', ')}` : 'Deliver product as listed in Process Tracker details.'
      }

      return 'See Process Tracker details for responsibility.'
    }

    return (erpItems || []).flatMap((erp) => {
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
          const rejectedIds = Array.isArray(members[key]?.self_assign_rejected_ids)
            ? members[key].self_assign_rejected_ids
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
            : []

          // Show only to explicitly targeted users, or users already assigned in this role.
          const currentId = Number(currentUserId)
          return (targetIds.includes(currentId) || assignedIds.includes(currentId)) && !rejectedIds.includes(currentId)
        })
        .flatMap(({ key, label }) => {
          const roleBucket = members[key] || {}
          const expertiseAssignments =
            key === 'expertise' && roleBucket && typeof roleBucket.expertise_assignments === 'object'
              ? roleBucket.expertise_assignments
              : {}
          const serviceAssignments =
            key === 'skill_provider' && roleBucket && typeof roleBucket.service_assignments === 'object'
              ? roleBucket.service_assignments
              : {}
          const scopedResponsibilities = Array.isArray(roleBucket?.self_assign_scope)
            ? roleBucket.self_assign_scope
            : []
          const scopedItems = scopedResponsibilities
            .map((entry) => {
              const responsibilityId = String(entry?.responsibility_id || '').trim()
              if (!responsibilityId) return null
              const targetIds = Array.isArray(entry?.target_ids)
                ? entry.target_ids
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id) && id > 0)
                : []
              const currentId = Number(currentUserId)
              if (targetIds.length > 0 && !targetIds.includes(currentId)) {
                return null
              }
              const rejectedIds = Array.isArray(entry?.rejected_ids)
                ? entry.rejected_ids
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id) && id > 0)
                : []
              if (rejectedIds.includes(currentId)) {
                return null
              }
              return {
                responsibilityId,
                responsibilityName: String(entry?.responsibility_name || '').trim(),
                targetIds,
                assignedIds:
                  key === 'expertise'
                    ? (Array.isArray(expertiseAssignments?.[responsibilityId]) ? expertiseAssignments[responsibilityId] : [])
                    : key === 'skill_provider'
                      ? (Array.isArray(serviceAssignments?.[responsibilityId]) ? serviceAssignments[responsibilityId] : [])
                    : (Array.isArray(roleBucket?.assignee_ids) ? roleBucket.assignee_ids : []),
              }
            })
            .filter(Boolean)

          if (scopedItems.length > 0) {
            return scopedItems.map((item) => ({
              erp,
              role: key,
              roleLabel: label,
              responsibilityId: item.responsibilityId,
              responsibilityText: item.responsibilityName || getResponsibilityText(erp, key),
              assignedIds: Array.isArray(item.assignedIds) ? item.assignedIds : [],
              selfAssignMessage: String(members[key]?.self_assign_message || '').trim(),
              postLink: String(members[key]?.self_assign_post_link || '').trim(),
              postTitle: String(members[key]?.self_assign_post_title || '').trim(),
              sourcePostId: members[key]?.self_assign_post_id,
            }))
          }

          return [{
            erp,
            role: key,
            roleLabel: label,
            responsibilityId: null,
            responsibilityText: getResponsibilityText(erp, key),
            assignedIds: Array.isArray(members[key]?.assignee_ids) ? members[key].assignee_ids : [],
            selfAssignMessage: String(members[key]?.self_assign_message || '').trim(),
            postLink: String(members[key]?.self_assign_post_link || '').trim(),
            postTitle: String(members[key]?.self_assign_post_title || '').trim(),
            sourcePostId: members[key]?.self_assign_post_id,
          }]
        })
    })
  }, [erpItems, currentUserId])

  useEffect(() => {
    if (deepLinkTarget.section !== 'self_assign') return
    if (!openSelfAssignPosts.length) return

    const responsibilityQuery = deepLinkTarget.responsibility
    const targetResponsibilityId = String(deepLinkTarget.responsibilityId || '').trim()
    const targetErpId = Number(deepLinkTarget.erpId)

    const matchedPost = openSelfAssignPosts.find((entry) => {
      const matchesErp = Number.isFinite(targetErpId) ? Number(entry?.erp?.id) === targetErpId : true
      const matchesRole = deepLinkTarget.role ? String(entry?.role || '').toLowerCase() === deepLinkTarget.role : true
      const matchesResponsibilityId = targetResponsibilityId
        ? String(entry?.responsibilityId || '').trim() === targetResponsibilityId
        : true
      const matchesResponsibility = responsibilityQuery
        ? String(entry?.responsibilityText || '').trim().toLowerCase().includes(responsibilityQuery)
        : true
      return matchesErp && matchesRole && matchesResponsibilityId && matchesResponsibility
    })

    window.requestAnimationFrame(() => {
      const sectionNode = document.getElementById('self-assign-posts-section')
      if (sectionNode) {
        sectionNode.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      if (matchedPost) {
        const cardNode = document.getElementById(
          `self-assign-card-${matchedPost.erp.id}-${matchedPost.role}-${matchedPost.responsibilityId || 'all'}`,
        )
        if (cardNode) {
          cardNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    })
  }, [deepLinkTarget, openSelfAssignPosts])

  const handleSelfAssign = async (erpId, role, assign, responsibilityId = null, reject = false) => {
    const loadingKey = `${erpId}-${role}-${responsibilityId || 'all'}`
    setSelfAssignLoading(loadingKey)
    try {
      const payload = { role, assign, reject }
      if (responsibilityId) {
        payload.responsibility_id = responsibilityId
      }

      const { data } = await api.post(`/erp/${erpId}/self_assign/`, payload)
      setErpItems((prev) => prev.map((item) => (Number(item?.id) === Number(data?.id) ? data : item)))
      setMessage(
        reject
          ? 'You declined the open assignment.'
          : assign
            ? 'You assigned yourself successfully.'
            : 'You removed yourself successfully.',
      )
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

  const handleRemoveConnection = async (person, connectionType = '') => {
    const personId = Number(person?.id)
    if (!personId) return

    const personName = person?.name || person?.username || `User #${personId}`
    const confirmed = window.confirm(`Remove connection with ${personName}?`)
    if (!confirmed) return

    setRemoveConnectionLoading(String(personId))
    try {
      await api.post('/connections/remove/', {
        target_user_id: personId,
        connection_type: String(connectionType || '').trim(),
      })
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
    'relative overflow-hidden rounded-2xl border border-white/45 bg-white/28 p-4 shadow-[0_12px_40px_rgba(76,29,149,0.16)] backdrop-blur-xl sm:p-5'

  const sectionGlassClass =
    'relative overflow-hidden rounded-2xl border border-white/45 bg-white/28 p-4 shadow-[0_12px_40px_rgba(76,29,149,0.16)] backdrop-blur-xl sm:p-5'

  const insetGlassClass =
    'rounded-xl border border-violet-200/55 bg-white/45 p-3 shadow-inner backdrop-blur-sm'

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
      id={`connection-card-${person.id}`}
      role="button"
      tabIndex={0}
      onClick={() => setSelected({ ...person, type })}
      onKeyDown={(event) => handleCardKeyDown(event, person, type)}
      className={`${profileLikeBoxClass} text-left transition hover:border-white/70 hover:bg-white/35`}
    >
      <span
        className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          type === 'Live'
            ? 'bg-emerald-500 text-white ring-1 ring-emerald-300 shadow-sm shadow-emerald-500/40 animate-pulse'
            : 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
        }`}
      >
        {type}
      </span>

      <div className="flex items-start gap-3 pr-20">
        <div className="rounded-full bg-gradient-to-br from-violet-200/70 to-fuchsia-200/70 p-1.5 shadow-sm">
          <RatingRingAvatar
            src={resolveMediaUrl(person.profile_photo)}
            alt={person.name || person.username || 'User'}
            rating={
              averageRatingByUser.get(Number(person?.id))
              ?? Number(person?.profile_rating ?? person?.average_rating ?? person?.rating)
            }
            size={50}
            ringWidth={2}
            className="shrink-0"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{person.name || person.username}</p>
          <div className="mt-2 space-y-1.5 text-xs text-black/85">
            <p><span className="font-medium text-black">📞</span> {person.phone || '-'}</p>
            <p className="truncate"><span className="font-medium text-black">✉️</span> {person.email || '-'}</p>
            {person.whatsapp_link ? (
              <p className="truncate">
                <span className="font-medium text-black">💬</span>{' '}
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
                <span className="font-medium text-black">📘</span>{' '}
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
      </div>
      <p className="mt-3 text-sm text-black/75">📍 {person.location || '-'}</p>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleRemoveConnection(person, type)
          }}
          disabled={removeConnectionLoading === String(person.id)}
          className="rounded-full border border-rose-200 bg-white/75 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-500 hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {removeConnectionLoading === String(person.id) ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-black shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-40 sm:px-8 sm:py-4 sm:pr-44 lg:pr-48">
          <div>
            <h2
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              My Network
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">Manage your Localix network.</p>
          </div>
          <img
            src="/images/connections.png"
            alt="My Network header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-36 w-36 -translate-y-1/2 object-contain sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          />
        </div>
      </div>

      {message ? (
        <div className="card border border-slate-200 bg-white/80 text-sm text-black/85">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className={sectionGlassClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Hired By</h3>
              <p className="text-xs text-black/60">People who requested to connect with you.</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {overview.hired_connections.length ? (
                overview.hired_connections.map((person) => renderCard(person, 'Hired By'))
              ) : (
                <p className="text-sm text-black/75">No hired connections yet.</p>
              )}
            </div>
            </div>
          </div>

          <div className="px-1">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                Active now: {overview.live_connections.length}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-700">
                Recent: {overview.recent_connections.length}
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-semibold text-violet-700">
                Members: {memberCards.length}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className={sectionGlassClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Members</h3>
              <p className="text-xs text-black/60">Accepted connection requests.</p>
            </div>

            <div className="mt-4 inline-flex flex-wrap gap-1 rounded-full border border-white/55 bg-white/35 p-1 backdrop-blur-sm">
              {['Expertise', 'Skill Providers', 'Delivery Man'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setMemberCategory(category)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    memberCategory === category
                      ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-200'
                      : 'text-black/80 hover:bg-white/70 hover:text-violet-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className={`mt-4 ${insetGlassClass}`}>
              <p className="text-sm font-semibold">Incoming Requests</p>
              <div className="mt-2 space-y-2 text-sm">
                {overview.incoming_requests.length ? (
                  overview.incoming_requests.map((item) => (
                    <div key={`incoming-${item.id}`} className="rounded-lg border border-slate-200/80 bg-white/80 p-2.5">
                      <p className="font-semibold text-black">{item.requester_name || `User #${item.requester}`}</p>
                      <p className="text-xs font-semibold text-violet-700">
                        Requested as: {item.requested_role_label || 'Skill provider'}
                      </p>
                      <p className="text-xs text-black/75">{item.request_message || 'No request message.'}</p>
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
                  <p className="text-black/75">No incoming requests.</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {memberCards.length ? (
                memberCards.map((person) => renderCard(person, memberCategory))
              ) : (
                <p className="text-sm text-black/75">No members yet.</p>
              )}
            </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={sectionGlassClass}>
            <div className="flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
                Live
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="inline-flex h-2.5 w-2.5 -ml-4 rounded-full bg-emerald-500" />
              </h3>
              <p className="text-xs text-black/60">Connections currently active in Process Tracker.</p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {overview.live_connections.length ? (
                overview.live_connections.map((person) => renderCard(person, 'Live'))
              ) : (
                <p className="text-sm text-black/75">No live connections yet.</p>
              )}
            </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={sectionGlassClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent</h3>
              <p className="text-xs text-black/60">Previously live Process Tracker connections.</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {overview.recent_connections.length ? (
                overview.recent_connections.map((person) => renderCard(person, 'Recent'))
              ) : (
                <p className="text-sm text-black/75">No recent connections yet.</p>
              )}
            </div>
            </div>
          </div>

          <div className={profileLikeBoxClass}>
            <h3 className="text-lg font-semibold">Connection Details</h3>
            {!selected ? (
              <p className="mt-3 text-sm text-black/75">Select a connection to view profile details.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold">{selected.name || selected.username}</p>
                    <p className="text-xs text-black/75">{selected.location}</p>
                  </div>
                  <span
                    className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700"
                  >
                    {selected.type}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold">Recent Posts</p>
                  <div className="mt-2 space-y-2 text-sm text-black/75">
                    {recentPosts.length === 0 ? (
                      <p>No posts available.</p>
                    ) : (
                      recentPosts.map((post) => (
                        <div key={post.id} className="flex items-center justify-between">
                          <span>{post.post_name}</span>
                          <span className="text-xs text-black/60">{post.post_type}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit" id="self-assign-posts-section">
          <div className="rounded-3xl border border-white/35 bg-white/20 p-4 shadow-[0_10px_30px_rgba(76,29,149,0.2)] backdrop-blur-xl sm:p-4.5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/22 ring-1 ring-white/35">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-900/85" fill="currentColor" aria-hidden="true">
                <path d="M12 2.75a4.75 4.75 0 1 0 0 9.5 4.75 4.75 0 0 0 0-9.5Zm0 11.5c-4.69 0-8.5 2.72-8.5 6.07 0 .38.3.68.68.68h15.64a.68.68 0 0 0 .68-.68c0-3.35-3.81-6.07-8.5-6.07Z" />
              </svg>
            </div>

            <h3
              className="text-[24px] font-extrabold leading-tight text-slate-900"
              style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}
            >
              Self-Assign Process Tracker Posts
            </h3>
            <p
              className="mt-2 text-[14px] leading-[1.35] text-slate-900/90"
              style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}
            >
              If a provider generated an assignment post,
              <br />
              you can assign or remove yourself here.
            </p>

            <div className="mt-3.5 space-y-2">
              {openSelfAssignPosts.length ? (
                openSelfAssignPosts.map(({ erp, role, roleLabel, responsibilityId, responsibilityText, assignedIds, selfAssignMessage, postTitle }) => {
                  const isAssigned = assignedIds.map((id) => Number(id)).includes(Number(currentUserId))
                  const loadingKey = `${erp.id}-${role}-${responsibilityId || 'all'}`
                  const postRecord = posts.find((item) => Number(item.id) === Number(erp.post)) || null
                  const titleText =
                    postRecord?.post_title ||
                    postTitle ||
                    postRecord?.post_name ||
                    `Process Tracker #${erp.id}`
                  const provider = usersById.get(Number(erp.provider))
                  const providerName =
                    provider?.name || provider?.username || (erp.provider ? `User #${erp.provider}` : 'Unknown')
                  const erpTaskLink = `/erp?erp_id=${erp.id}`
                  return (
                    <div
                      key={`${erp.id}-${role}-${responsibilityId || 'all'}`}
                      id={`self-assign-card-${erp.id}-${role}-${responsibilityId || 'all'}`}
                      className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{titleText}</p>
                        <p className="text-xs text-slate-800/85">Role: {roleLabel}</p>
                      </div>

                      <p className="mt-1 text-xs text-slate-800/90">Requested by: {providerName}</p>
                      <p className="mt-1 text-xs text-slate-800/90">Responsibility: {responsibilityText}</p>
                      <p className="mt-1 text-xs text-slate-800/90">
                        Message: {selfAssignMessage || 'No message from provider.'}
                      </p>

                      <p className="mt-1 text-xs text-slate-800/90">
                        Process Tracker link:{' '}
                        <a href={erpTaskLink} className="font-semibold text-slate-900 hover:underline">
                          Open this Process Tracker task
                        </a>
                      </p>

                      <div className="mt-2 flex justify-end">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={selfAssignLoading === loadingKey}
                            onClick={() => handleSelfAssign(erp.id, role, !isAssigned, responsibilityId)}
                            className="rounded-full border border-slate-400/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {selfAssignLoading === loadingKey
                              ? 'Updating...'
                              : isAssigned
                                ? 'Remove Myself'
                                : 'Assign Myself'}
                          </button>
                          {!isAssigned ? (
                            <button
                              type="button"
                              disabled={selfAssignLoading === loadingKey}
                              onClick={() => handleSelfAssign(erp.id, role, false, responsibilityId, true)}
                              className="rounded-full border border-slate-400/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {selfAssignLoading === loadingKey ? 'Updating...' : 'Reject'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p
                  className="text-[21px] italic leading-tight text-slate-900/35"
                  style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}
                >
                  No open self-assign posts right now.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
