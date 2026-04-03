import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import ERPAnalyticsGrid from '../components/erp/ERPAnalyticsGrid'
import ERPFiltersBar from '../components/erp/ERPFiltersBar'
import ERPHeader from '../components/erp/ERPHeader'
import ERPTaskCard from '../components/erp/ERPTaskCard'
import ERPTopRatedServices from '../components/erp/ERPTopRatedServices'

export default function ERP() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [messageOpenId, setMessageOpenId] = useState(null)
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
    const visible = erpItems.filter((item) => {
      const post = postMap[item.post]
      const isDemand = String(post?.post_type || '').toLowerCase() === 'demand'
      if (!isDemand) return true
      const status = String(item?.configuration_snapshot?.application_submission?.status || '').toLowerCase()
      const isOwner = Number(currentUserId) > 0 && Number(post?.owner_id ?? post?.owner) === Number(currentUserId)
      const isApplicant = Number(currentUserId) > 0 && Number(item?.provider) === Number(currentUserId)
      if (status === 'submitted' || status === 'pending') {
        return isOwner || isApplicant
      }
      return status === 'approved' || status === 'accepted' || status === 'confirmed' || !status
    })

    const total = visible.length
    const completed = visible.filter((item) => item.stage === 'Completed').length
    const pending = visible.filter((item) => item.stage === 'Pending').length
    const revenue = visible.reduce((sum, item) => sum + Number(item.total_cost || 0), 0)
    const topServices = Object.entries(averageRatingByPost)
      .map(([postId, avg]) => ({ postId: Number(postId), average: avg }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)

    return { total, completed, pending, revenue, topServices }
  }, [erpItems, averageRatingByPost, postMap, currentUserId])

  const visibleErpItems = useMemo(() => {
    return erpItems.filter((item) => {
      const post = postMap[item.post]
      const isDemand = String(post?.post_type || '').toLowerCase() === 'demand'
      if (!isDemand) return true
      const status = String(item?.configuration_snapshot?.application_submission?.status || '').toLowerCase()
      const isOwner = Number(currentUserId) > 0 && Number(post?.owner_id ?? post?.owner) === Number(currentUserId)
      const isApplicant = Number(currentUserId) > 0 && Number(item?.provider) === Number(currentUserId)
      if (status === 'submitted' || status === 'pending') {
        return isOwner || isApplicant
      }
      return status === 'approved' || status === 'accepted' || status === 'confirmed' || !status
    })
  }, [erpItems, postMap, currentUserId])

  const filteredTasks = useMemo(() => {
    return visibleErpItems.filter((erp) => {
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
  }, [visibleErpItems, filters, postMap, averageRatingByPost])

  const uniqueFilteredTasks = useMemo(() => {
    const focusErpIdRaw = searchParams.get('erp_id')
    const focusErpId = Number(focusErpIdRaw)

    if (Number.isFinite(focusErpId) && focusErpId > 0) {
      const focusedVisible = visibleErpItems.find((erp) => Number(erp.id) === focusErpId)
      if (focusedVisible) {
        return [focusedVisible]
      }

      const focusedAny = erpItems.find((erp) => Number(erp.id) === focusErpId)
      return focusedAny ? [focusedAny] : []
    }

    return filteredTasks
  }, [filteredTasks, searchParams, visibleErpItems, erpItems])

  const handleStageChange = async (erp, stage) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (stage === 'Pending' && !isProvider) {
      setMessage('Only provider can update Pending stage actions.')
      return
    }

    try {
      const { data } = await api.patch(`/erp/${erp.id}/update_stage/`, { stage })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
    }
  }

  const handleApproveBooking = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/approve_booking/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage('Booking request accepted successfully.')
      window.dispatchEvent(new Event('localix:notifications-refresh'))
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessage(detail || 'Failed to approve booking request.')
    }
  }

  const handleRejectBooking = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/reject_booking/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage('Booking request rejected.')
      window.dispatchEvent(new Event('localix:notifications-refresh'))
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessage(detail || 'Failed to reject booking request.')
    }
  }

  const handleApproveApplication = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/approve_application/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage('Application accepted successfully.')
      window.dispatchEvent(new Event('localix:notifications-refresh'))
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessage(detail || 'Failed to approve application.')
    }
  }

  const handleRejectApplication = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/reject_application/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage('Application rejected successfully.')
      window.dispatchEvent(new Event('localix:notifications-refresh'))
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessage(detail || 'Failed to reject application.')
    }
  }

  const hasRequiredRows = (rows) =>
    Array.isArray(rows) &&
    rows.some((row) => {
      const qty = Number(row?.quantity ?? row?.qty ?? 0)
      const lineTotal = Number(row?.line_total ?? row?.lineTotal ?? 0)
      return qty > 0 || lineTotal > 0
    })

  const getPhaseTasks = (erp) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    const snapshot = erp.configuration_snapshot || {}
    const workflow = snapshot.workflow || {}
    const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
    const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
    const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
    const snapshotTotals = snapshot.totals || {}
    const memberAssignments = snapshot.members || {}
    const hasWorkers = Array.isArray(erp.assigned_workers) && erp.assigned_workers.length > 0
    const hasPdfSlip = Boolean(erp.pdf_slip)
    const hasTotalCost = Number(erp.total_cost || 0) > 0
    const hasLinkedPost = Boolean(erp.post)

    const hasExpertiseRows = hasRequiredRows(snapshotExpertise)
    const hasServiceRows = hasRequiredRows(snapshotServices)
    const hasProductRows = hasRequiredRows(snapshotProducts)
    const hasExpertiseTotal = Number(snapshotTotals.expertise_total || snapshotTotals.expertise || 0) > 0
    const hasServiceTotal = Number(snapshotTotals.services_total || snapshotTotals.services || 0) > 0
    const hasProductTotal = Number(snapshotTotals.products_total || snapshotTotals.products || 0) > 0

    const hasExpertiseCategory = hasExpertiseRows || hasExpertiseTotal
    const hasServicesCategory = hasServiceRows || hasServiceTotal
    const hasProductCategory = hasProductRows || hasProductTotal

    const requiredExpertiseQty = snapshotExpertise.reduce(
      (sum, row) => sum + Math.max(0, Number((row.offered_people ?? row.quantity) || 0)),
      0,
    )
    const requiredProductQty = snapshotProducts.reduce(
      (sum, row) => sum + Math.max(0, Number(row.quantity || 0)),
      0,
    )
    const hasReadyOverride = Object.prototype.hasOwnProperty.call(readyProductStatusByErp, erp.id)
    const isReadyProductDone = hasReadyOverride
      ? Boolean(readyProductStatusByErp[erp.id])
      : Boolean(workflow.ready_product_done)
    const assignedExpertiseQtyFromField = Number(memberAssignments.expertise?.assigned_qty || 0)
    const expertiseAssignmentsByRow =
      memberAssignments?.expertise && typeof memberAssignments.expertise.expertise_assignments === 'object'
        ? memberAssignments.expertise.expertise_assignments
        : {}
    const expertiseChecks = snapshotExpertise
      .map((row, index) => {
        const rowId = Number(row?.id)
        const required = Math.max(0, Number((row?.offered_people ?? row?.quantity) || 0))
        if (!Number.isFinite(rowId) || rowId <= 0 || required <= 0) return null

        const assignedIds = Array.isArray(expertiseAssignmentsByRow[String(rowId)])
          ? expertiseAssignmentsByRow[String(rowId)]
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id) && id > 0)
          : []
        const assignedCount = new Set(assignedIds).size
        return {
          rowId,
          name: String(row?.name || `Expertise ${index + 1}`),
          required,
          assigned: assignedCount,
        }
      })
      .filter(Boolean)
    const hasPerRowExpertiseChecks = expertiseChecks.length > 0
    const assignedExpertiseCount = hasPerRowExpertiseChecks
      ? expertiseChecks.reduce((sum, row) => sum + row.assigned, 0)
      : (() => {
          const expertiseAssigneeIds = new Set()
          ;['expertise'].forEach((key) => {
            const ids = Array.isArray(memberAssignments?.[key]?.assignee_ids)
              ? memberAssignments[key].assignee_ids
              : []
            ids.forEach((id) => {
              const parsed = Number(id)
              if (Number.isFinite(parsed) && parsed > 0) {
                expertiseAssigneeIds.add(parsed)
              }
            })
          })
          return expertiseAssigneeIds.size
        })()
    const assignedExpertiseQty = Math.max(assignedExpertiseQtyFromField, assignedExpertiseCount)
    const isExpertisePerRowComplete = hasPerRowExpertiseChecks
      ? expertiseChecks.every((row) => row.assigned === row.required)
      : assignedExpertiseQty === requiredExpertiseQty
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
        const expertiseRequirementText = hasPerRowExpertiseChecks
          ? ` (${expertiseChecks.map((row) => `${row.name}: ${row.assigned}/${row.required}`).join(', ')})`
          : (requiredExpertiseQty > 0 ? ` (required: ${requiredExpertiseQty})` : '')

        pendingTasks.push({
          label: `Assign Expertise in Members → Expertise${expertiseRequirementText}`,
          done:
            requiredExpertiseQty > 0
              ? isExpertisePerRowComplete
              : assignedExpertiseQty > 0 || hasWorkers,
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
          label: 'Assign Delivery Man in Members → Delivery man (at least one)',
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

  const handleToggleReadyProduct = async (erpId) => {
    const targetErp = erpItems.find((item) => Number(item.id) === Number(erpId))
    const isProvider =
      targetErp && currentUserId && String(targetErp.provider) === String(currentUserId)

    if (!isProvider) {
      setMessage('Only provider can mark Ready product in Pending tasks.')
      return
    }

    const snapshot = targetErp?.configuration_snapshot || {}
    const workflow = snapshot.workflow || {}
    const hasReadyOverride = Object.prototype.hasOwnProperty.call(readyProductStatusByErp, erpId)
    const currentReady = hasReadyOverride
      ? Boolean(readyProductStatusByErp[erpId])
      : Boolean(workflow.ready_product_done)
    const nextReady = !currentReady

    setReadyProductStatusByErp((prev) => ({
      ...prev,
      [erpId]: nextReady,
    }))

    try {
      const { data } = await api.post(`/erp/${erpId}/set_ready_product/`, { ready: nextReady })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
      setReadyProductStatusByErp((prev) => ({
        ...prev,
        [erpId]: currentReady,
      }))
      setMessage('Failed to update Ready product status.')
    }
  }

  const handleUpdateMemberAssignment = async (erp, role, userId, assign, options = {}) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (!isProvider) {
      setMessage('Only provider can manage member assignments in Pending.')
      return
    }

    try {
      const payload = {
        role,
        mode: assign ? 'add' : 'remove',
        assignee_ids: [userId],
      }
      if (role === 'expertise' && Number.isFinite(Number(options?.expertiseId)) && Number(options.expertiseId) > 0) {
        payload.expertise_id = Number(options.expertiseId)
      }

      const { data } = await api.patch(`/erp/${erp.id}/members/`, {
        ...payload,
      })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
      setMessage('Failed to update member assignment.')
    }
  }

  const handlePublishMemberPost = async (erp, role, messageText = '') => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (!isProvider) {
      setMessage('Only provider can publish self-assign post.')
      return
    }

    try {
      const { data } = await api.post(`/erp/${erp.id}/publish_member_post/`, {
        role,
        message: String(messageText || '').trim(),
      })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage(`Self-assign post published for ${role.replace('_', ' ')}.`)
    } catch (error) {
      console.error(error)
      setMessage('Failed to publish self-assign post.')
    }
  }

  const handleCloseMemberPost = async (erp, role) => {
    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)
    if (!isProvider) {
      setMessage('Only provider can remove self-assign post.')
      return
    }

    try {
      const { data } = await api.post(`/erp/${erp.id}/close_member_post/`, {
        role,
      })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage(`Self-assign post removed for ${role.replace('_', ' ')}.`)
    } catch (error) {
      console.error(error)
      setMessage('Failed to remove self-assign post.')
    }
  }

  const handleLeaveAssignment = async (erp) => {
    const confirmed = window.confirm('Are you sure you want to leave this ERP task?')
    if (!confirmed) return

    try {
      await api.post(`/erp/${erp.id}/leave_assignment/`)
      const { data } = await api.get('/erp/')
      setErpItems(Array.isArray(data) ? data : [])
      setMessage('You left this ERP task.')
    } catch (error) {
      console.error(error)
      setMessage(error?.response?.data?.detail || 'Failed to leave ERP task.')
    }
  }

  const handleTrackStage = async (erp) => {
    if (erp.stage === 'Completed') {
      setMessage(`Task ${erp.id} is already in Completed phase.`)
      return
    }

    const isProvider = currentUserId && String(erp.provider) === String(currentUserId)

    if (erp.stage === 'Pending' && !isProvider) {
      setMessage('Only provider can complete Pending assignments and move task to the next state.')
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

    const nextStage = erp.stage === 'Pending' ? 'On Process' : erp.stage
    const isSupplyPost = String(postMap?.[erp.post]?.post_type || '').toLowerCase() === 'supply'
    const nextStageLabel = nextStage === 'On Process' ? (isSupplyPost ? 'On Going' : 'Process') : nextStage
    if (nextStage === erp.stage) {
      setMessage('Receiver must complete this ERP from the new Completed button with rating and comment.')
      return
    }
    await handleStageChange(erp, nextStage)
    setMessage(`Task ${erp.id} moved to ${nextStageLabel}.`)
  }

  const handleCompleteByReceiver = async (erp, payload) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/complete_by_receiver/`, payload)
      const updatedErp = data?.erp
      const newRating = data?.rating

      if (updatedErp) {
        setErpItems((prev) => prev.map((item) => (item.id === updatedErp.id ? updatedErp : item)))
      }

      if (newRating) {
        setRatings((prev) => [...prev, newRating])
      }

      setMessage(data?.detail || `Task ${erp.id} marked as completed.`)
      return { ok: true, detail: data?.detail || '' }
    } catch (error) {
      console.error(error)
      const detail =
        String(error?.response?.data?.detail || '').trim() ||
        'Failed to complete ERP. Please provide rating and comment.'
      setMessage(detail)
      return { ok: false, detail }
    }
  }

  const handleRateParticipant = async (erp, payload) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/rate_participant/`, payload)
      const newRating = data?.rating
      if (newRating) {
        setRatings((prev) => [...prev, newRating])
      }
      setMessage(data?.detail || 'Participant rating submitted.')
      return { ok: true, detail: data?.detail || '' }
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim() || 'Failed to submit participant rating.'
      setMessage(detail)
      return { ok: false, detail }
    }
  }

  const handleRateProvider = async (erp, payload) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/rate_provider/`, payload)
      const newRating = data?.rating
      const updatedErp = data?.erp

      if (newRating) {
        setRatings((prev) => [...prev, newRating])
      }

      if (updatedErp) {
        setErpItems((prev) => prev.map((item) => (item.id === updatedErp.id ? updatedErp : item)))
      }

      setMessage(data?.detail || 'Feedback submitted.')
      return { ok: true, detail: data?.detail || '' }
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim() || 'Failed to submit your feedback.'
      setMessage(detail)
      return { ok: false, detail }
    }
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

  const handleDeleteErp = async (erp) => {
    try {
      await api.delete(`/erp/${erp.id}/`)
      setErpItems((prev) => prev.filter((item) => item.id !== erp.id))
      setMessage('ERP Card deleted successfully')
    } catch (error) {
      console.error(error)
      // Re-throw error to be caught by component
      throw error
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
              ratings={ratings}
              currentUserId={currentUserId}
              expandedId={expandedId}
              trackOpenId={trackOpenId}
              messageOpenId={messageOpenId}
              phaseTasks={getPhaseTasks(erp)}
              onSetPending={(item) => handleStageChange(item, 'Pending')}
              onToggleTrack={(id) => setTrackOpenId((prev) => (prev === id ? null : id))}
              onToggleMessage={(id) => setMessageOpenId((prev) => (prev === id ? null : id))}
              onGeneratePdf={handleGeneratePdf}
              onDelete={handleDeleteErp}
              onToggleDetails={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              onTrackNext={handleTrackStage}
              onToggleReadyProduct={handleToggleReadyProduct}
              users={users}
              assignableUsersByRole={assignableUsersByRole}
              onUpdateMemberAssignment={handleUpdateMemberAssignment}
              onPublishMemberPost={handlePublishMemberPost}
              onCloseMemberPost={handleCloseMemberPost}
              onLeaveAssignment={handleLeaveAssignment}
              onCompleteByReceiver={handleCompleteByReceiver}
              onRateParticipant={handleRateParticipant}
              onRateProvider={handleRateProvider}
              onApproveBooking={handleApproveBooking}
              onRejectBooking={handleRejectBooking}
              onApproveApplication={handleApproveApplication}
              onRejectApplication={handleRejectApplication}
              onOpenOwner={(ownerId) => navigate(`/dashboard/${ownerId}`)}
              toMediaUrl={toMediaUrl}
            />
          ))
        )}
      </div>
    </div>
  )
}
