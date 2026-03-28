import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import ERPAnalyticsGrid from '../components/erp/ERPAnalyticsGrid'
import ERPFiltersBar from '../components/erp/ERPFiltersBar'
import ERPHeader from '../components/erp/ERPHeader'
import ERPTaskCard from '../components/erp/ERPTaskCard'
import ERPTopRatedServices from '../components/erp/ERPTopRatedServices'

export default function ERP() {
  const navigate = useNavigate()
  const [erpItems, setErpItems] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [connectionsOverview, setConnectionsOverview] = useState({
    live_connections: [],
    new_connections: [],
    recent_connections: [],
    member_connections: {
      expertise: [],
      skill_provider: [],
      supplier: [],
    },
  })
  const [ratings, setRatings] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [trackOpenId, setTrackOpenId] = useState(null)
  const [readyProductStatusByErp, setReadyProductStatusByErp] = useState({})
  const [workerPool, setWorkerPool] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    stage: '',
    provider: '',
    location: '',
    rating: '',
  })
  const [message, setMessage] = useState('')

  const backendOrigin = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    return apiBase.replace(/\/api\/?$/, '')
  }, [])

  const toMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    if (value.startsWith('/')) {
      return `${backendOrigin}${value}`
    }
    return `${backendOrigin}/${value}`
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [erpRes, postRes, userRes, ratingRes, meRes, overviewRes] = await Promise.all([
          api.get('/erp/'),
          api.get('/posts/'),
          api.get('/users/'),
          api.get('/ratings/'),
          api.get('/auth/me/'),
          api.get('/connections/overview/'),
        ])
        if (!active) return
        setErpItems(erpRes.data)
        setPosts(postRes.data)
        setUsers(userRes.data)
        setRatings(ratingRes.data)
        setCurrentUserId(meRes.data?.id ?? null)
        setConnectionsOverview({
          live_connections: Array.isArray(overviewRes.data?.live_connections)
            ? overviewRes.data.live_connections
            : [],
          new_connections: Array.isArray(overviewRes.data?.new_connections)
            ? overviewRes.data.new_connections
            : [],
          recent_connections: Array.isArray(overviewRes.data?.recent_connections)
            ? overviewRes.data.recent_connections
            : [],
          member_connections: {
            expertise: Array.isArray(overviewRes.data?.member_connections?.expertise)
              ? overviewRes.data.member_connections.expertise
              : [],
            skill_provider: Array.isArray(overviewRes.data?.member_connections?.skill_provider)
              ? overviewRes.data.member_connections.skill_provider
              : [],
            supplier: Array.isArray(overviewRes.data?.member_connections?.supplier)
              ? overviewRes.data.member_connections.supplier
              : [],
          },
        })
      } catch (error) {
        console.error(error)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const postMap = useMemo(() => {
    return posts.reduce((acc, post) => {
      acc[post.id] = post
      return acc
    }, {})
  }, [posts])

  const assignableUsers = useMemo(() => {
    const combined = [
      ...(connectionsOverview.live_connections || []),
      ...(connectionsOverview.new_connections || []),
      ...(connectionsOverview.recent_connections || []),
    ]
    const byId = new Map()
    combined.forEach((user) => {
      if (user && user.id !== undefined && user.id !== null) {
        byId.set(Number(user.id), user)
      }
    })
    return Array.from(byId.values())
  }, [connectionsOverview])

  const assignableUsersByRole = useMemo(() => {
    const roleBuckets = connectionsOverview.member_connections || {}
    const normalizeUsers = (items) => {
      const byId = new Map()
      ;(Array.isArray(items) ? items : []).forEach((user) => {
        if (user && user.id !== undefined && user.id !== null) {
          byId.set(Number(user.id), user)
        }
      })
      return Array.from(byId.values())
    }

    return {
      expertise: normalizeUsers(roleBuckets.expertise),
      skill_provider: normalizeUsers(roleBuckets.skill_provider),
      supplier: normalizeUsers(roleBuckets.supplier),
      all: assignableUsers,
    }
  }, [connectionsOverview, assignableUsers])

  const ratingsByPost = useMemo(() => {
    return ratings.reduce((acc, rating) => {
      acc[rating.post] = acc[rating.post] || []
      acc[rating.post].push(rating)
      return acc
    }, {})
  }, [ratings])

  const averageRatingByPost = useMemo(() => {
    const map = {}
    Object.entries(ratingsByPost).forEach(([postId, items]) => {
      const total = items.reduce((sum, item) => sum + Number(item.rating_value || 0), 0)
      map[postId] = items.length ? total / items.length : 0
    })
    return map
  }, [ratingsByPost])

  const ratingsByProvider = useMemo(() => {
    const map = {}
    ratings.forEach((rating) => {
      if (!rating.provider) return
      map[rating.provider] = map[rating.provider] || []
      map[rating.provider].push(Number(rating.rating_value || 0))
    })
    return Object.entries(map)
      .map(([providerId, values]) => ({
        providerId,
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
      }))
      .sort((a, b) => b.average - a.average)
  }, [ratings])

  const analytics = useMemo(() => {
    const total = erpItems.length
    const completed = erpItems.filter((item) => item.stage === 'Completed').length
    const pending = erpItems.filter((item) => item.stage === 'Pending').length
    const revenue = erpItems.reduce((sum, item) => sum + Number(item.total_cost || 0), 0)
    const topServices = Object.entries(averageRatingByPost)
      .map(([postId, avg]) => ({ postId: Number(postId), average: avg }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)

    return { total, completed, pending, revenue, topServices }
  }, [erpItems, averageRatingByPost])

  const filteredTasks = useMemo(() => {
    return erpItems.filter((erp) => {
      const post = postMap[erp.post]
      if (filters.category && erp.category !== filters.category) return false
      if (filters.stage && erp.stage !== filters.stage) return false
      if (filters.provider && String(erp.provider) !== filters.provider) return false
      if (filters.location && !post?.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false
      }
      if (filters.rating) {
        const ratingValue = averageRatingByPost[erp.post] || 0
        if (ratingValue < Number(filters.rating)) return false
      }
      return true
    })
  }, [erpItems, filters, postMap, averageRatingByPost])

  const uniqueFilteredTasks = useMemo(() => {
    const byKey = new Map()

    filteredTasks.forEach((erp) => {
      const key = `${erp.post}-${erp.provider || 'none'}-${erp.receiver || 'none'}-${erp.category}`
      const existing = byKey.get(key)

      if (!existing || Number(erp.id || 0) > Number(existing.id || 0)) {
        byKey.set(key, erp)
      }
    })

    return Array.from(byKey.values())
  }, [filteredTasks])

  const notify = async (title, messageText) => {
    try {
      await api.post('/notifications/', { title, message: messageText })
    } catch (error) {
      console.error(error)
    }
  }

  const handleStageChange = async (erp, stage) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (stage === 'Pending' && !isProvider) {
      setMessage('Only provider can update Pending stage actions.')
      return
    }

    try {
      const { data } = await api.patch(`/erp/${erp.id}/update_stage/`, { stage })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      notify('ERP Status Updated', `Task ${erp.id} moved to ${stage}.`)
    } catch (error) {
      console.error(error)
    }
  }

  const parsePostCategories = (value) =>
    String(value || '')
      .split(',')
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)

  const getPhaseTasks = (erp) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    const post = postMap[erp.post] || {}
    const snapshot = erp.configuration_snapshot || {}
    const snapshotPost = snapshot.post || {}
    const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
    const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
    const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
    const memberAssignments = snapshot.members || {}
    const categories = parsePostCategories(post.post_name || snapshotPost.name || '')

    const hasWorkers = Array.isArray(erp.assigned_workers) && erp.assigned_workers.length > 0
    const hasPdfSlip = Boolean(erp.pdf_slip)
    const hasTotalCost = Number(erp.total_cost || 0) > 0
    const hasLinkedPost = Boolean(erp.post)

    const hasExpertiseCategory =
      categories.includes('expertise') || snapshotExpertise.some((row) => Number(row.quantity || 0) > 0)
    const hasServicesCategory =
      categories.includes('services') || categories.includes('service') || snapshotServices.length > 0
    const hasProductCategory =
      categories.includes('product') || categories.includes('products') || snapshotProducts.some((row) => Number(row.quantity || 0) > 0)

    const requiredExpertiseQty = snapshotExpertise.reduce(
      (sum, row) => sum + Math.max(0, Number(row.quantity || 0)),
      0,
    )
    const requiredProductQty = snapshotProducts.reduce(
      (sum, row) => sum + Math.max(0, Number(row.quantity || 0)),
      0,
    )
    const isReadyProductDone =
      readyProductStatusByErp[erp.id] === undefined
        ? requiredProductQty > 0
        : Boolean(readyProductStatusByErp[erp.id])
    const assignedExpertiseQtyFromField = Number(memberAssignments.expertise?.assigned_qty || 0)
    const assignedExpertiseCount = Array.isArray(memberAssignments.expertise?.assignee_ids)
      ? memberAssignments.expertise.assignee_ids.length
      : 0
    const assignedExpertiseQty = Math.max(assignedExpertiseQtyFromField, assignedExpertiseCount)
    const hasAssignedSkillProvider =
      Array.isArray(memberAssignments.skill_provider?.assignee_ids)
        ? memberAssignments.skill_provider.assignee_ids.length > 0
        : hasWorkers
    const hasAssignedSupplier =
      Array.isArray(memberAssignments.supplier?.assignee_ids)
        ? memberAssignments.supplier.assignee_ids.length > 0
        : hasWorkers

    const pendingTasks = []

    if (isProvider) {
      pendingTasks.push({
        label: 'Post linked to ERP task',
        done: hasLinkedPost,
        key: 'post_link',
      })

      if (hasExpertiseCategory) {
        pendingTasks.push({
          label: `Assign Expertise in Members → Expertise${requiredExpertiseQty > 0 ? ` (required: ${requiredExpertiseQty})` : ''}`,
          done: requiredExpertiseQty > 0 ? assignedExpertiseQty >= requiredExpertiseQty : hasWorkers,
          key: 'member_expertise',
        })
      }

      if (hasServicesCategory) {
        pendingTasks.push({
          label: 'Assign Skill provider in Members → Skill provider (at least one)',
          done: hasAssignedSkillProvider,
          key: 'member_skill_provider',
        })
      }

      if (hasProductCategory) {
        pendingTasks.push({
          label: 'Assign Delivary Man in Members → Delivary man (at least one)',
          done: hasAssignedSupplier,
          key: 'member_supplier',
        })

        pendingTasks.push({
          label: 'Ready product',
          done: isReadyProductDone,
          key: 'ready_product',
          toggleable: true,
        })
      }
    }

    return {
      Pending: pendingTasks,
      'On Process': [
        {
          label: 'Generate PDF slip',
          done: hasPdfSlip,
        },
        {
          label: 'Set final total cost',
          done: hasTotalCost,
        },
      ],
      Completed: [
        {
          label: 'Process completed',
          done: erp.stage === 'Completed',
        },
      ],
    }
  }

  const handleToggleReadyProduct = (erpId) => {
    const targetErp = erpItems.find((item) => Number(item.id) === Number(erpId))
    const isProvider =
      targetErp && currentUserId && String(targetErp.provider) === String(currentUserId)

    if (!isProvider) {
      setMessage('Only provider can mark Ready product in Pending tasks.')
      return
    }

    setReadyProductStatusByErp((prev) => ({
      ...prev,
      [erpId]: !Boolean(prev[erpId]),
    }))
  }

  const handleUpdateMemberAssignment = async (erp, role, userId, assign) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (!isProvider) {
      setMessage('Only provider can manage member assignments in Pending.')
      return
    }

    try {
      const { data } = await api.patch(`/erp/${erp.id}/members/`, {
        role,
        mode: assign ? 'add' : 'remove',
        assignee_ids: [userId],
      })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
      setMessage('Failed to update member assignment.')
    }
  }

  const handlePublishMemberPost = async (erp, role) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (!isProvider) {
      setMessage('Only provider can publish self-assign post.')
      return
    }

    try {
      const { data } = await api.post(`/erp/${erp.id}/publish_member_post/`, { role })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage(`Self-assign post published for ${role.replace('_', ' ')}.`)
    } catch (error) {
      console.error(error)
      setMessage('Failed to publish self-assign post.')
    }
  }

  const handleTrackStage = async (erp) => {
    if (erp.stage === 'Completed') {
      setMessage(`Task ${erp.id} is already in Completed phase.`)
      return
    }

    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)

    if (erp.stage === 'Pending' && !isProvider) {
      setMessage('Only provider can complete Pending assignments and move task to On Process.')
      return
    }

    const phaseTasks = getPhaseTasks(erp)
    const currentTasks = phaseTasks[erp.stage] || []
    const pendingTasks = currentTasks.filter((task) => !task.done)

    if (pendingTasks.length > 0) {
      setMessage(
        `Complete these tasks first: ${pendingTasks.map((task) => task.label).join(', ')}`,
      )
      return
    }

    const nextStage = erp.stage === 'Pending' ? 'On Process' : 'Completed'
    await handleStageChange(erp, nextStage)
    setMessage(`Task ${erp.id} moved to ${nextStage}.`)
  }

  const handleGeneratePdf = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/generate_pdf/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      if (data.pdf_slip) {
        const pdfUrl = /^https?:\/\//i.test(data.pdf_slip)
          ? data.pdf_slip
          : `${backendOrigin}${data.pdf_slip.startsWith('/') ? '' : '/'}${data.pdf_slip}`
        window.open(pdfUrl, '_blank')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleAutoGenerate = async () => {
    const pending = filteredTasks.filter((task) => !task.pdf_slip)
    for (const task of pending) {
      await handleGeneratePdf(task)
    }
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <ERPHeader />

      <ERPAnalyticsGrid analytics={analytics} ratingsByProvider={ratingsByProvider} />

      <ERPTopRatedServices topServices={analytics.topServices} postMap={postMap} />

      <ERPFiltersBar
        filters={filters}
        workerPool={workerPool}
        onFilterChange={handleFilterChange}
        onWorkerPoolChange={(event) => setWorkerPool(event.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAutoGenerate}
          className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600"
        >
          Auto-generate PDFs
        </button>
        {message && <p className="text-sm text-slate-500">{message}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {uniqueFilteredTasks.length === 0 ? (
          <div className="card">No ERP tasks found.</div>
        ) : (
          uniqueFilteredTasks.map((erp) => (
            <ERPTaskCard
              key={erp.id}
              erp={erp}
              post={postMap[erp.post]}
              rating={averageRatingByPost[erp.post] || 0}
              currentUserId={currentUserId}
              expandedId={expandedId}
              trackOpenId={trackOpenId}
              phaseTasks={getPhaseTasks(erp)}
              onSetPending={(item) => handleStageChange(item, 'Pending')}
              onToggleTrack={(id) => setTrackOpenId((prev) => (prev === id ? null : id))}
              onGeneratePdf={handleGeneratePdf}
              onToggleDetails={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              onTrackNext={handleTrackStage}
              onToggleReadyProduct={handleToggleReadyProduct}
              users={users}
              assignableUsersByRole={assignableUsersByRole}
              onUpdateMemberAssignment={handleUpdateMemberAssignment}
              onPublishMemberPost={handlePublishMemberPost}
              onOpenOwner={(ownerId) => navigate(`/dashboard/${ownerId}`)}
              toMediaUrl={toMediaUrl}
            />
          ))
        )}
      </div>
    </div>
  )
}
