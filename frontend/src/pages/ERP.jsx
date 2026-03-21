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
  const [ratings, setRatings] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [trackOpenId, setTrackOpenId] = useState(null)
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
        const [erpRes, postRes, ratingRes, meRes] = await Promise.all([
          api.get('/erp/'),
          api.get('/posts/'),
          api.get('/ratings/'),
          api.get('/auth/me/'),
        ])
        if (!active) return
        setErpItems(erpRes.data)
        setPosts(postRes.data)
        setRatings(ratingRes.data)
        setCurrentUserId(meRes.data?.id ?? null)
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

  const notify = async (title, messageText) => {
    try {
      await api.post('/notifications/', { title, message: messageText })
    } catch (error) {
      console.error(error)
    }
  }

  const handleStageChange = async (erp, stage) => {
    try {
      const { data } = await api.patch(`/erp/${erp.id}/update_stage/`, { stage })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      notify('ERP Status Updated', `Task ${erp.id} moved to ${stage}.`)
    } catch (error) {
      console.error(error)
    }
  }

  const getPhaseTasks = (erp) => {
    const hasWorkers = Array.isArray(erp.assigned_workers) && erp.assigned_workers.length > 0
    const hasPdfSlip = Boolean(erp.pdf_slip)
    const hasTotalCost = Number(erp.total_cost || 0) > 0
    const hasLinkedPost = Boolean(erp.post)

    return {
      Pending: [
        {
          label: 'Post linked to ERP task',
          done: hasLinkedPost,
        },
        {
          label: 'Assign at least one worker',
          done: hasWorkers,
        },
      ],
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

  const handleTrackStage = async (erp) => {
    if (erp.stage === 'Completed') {
      setMessage(`Task ${erp.id} is already in Completed phase.`)
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
        {filteredTasks.length === 0 ? (
          <div className="card">No ERP tasks found.</div>
        ) : (
          filteredTasks.map((erp) => (
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
              onOpenOwner={(ownerId) => navigate(`/dashboard/${ownerId}`)}
              toMediaUrl={toMediaUrl}
            />
          ))
        )}
      </div>
    </div>
  )
}
