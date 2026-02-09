import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

export default function ERP() {
  const [erpItems, setErpItems] = useState([])
  const [posts, setPosts] = useState([])
  const [ratings, setRatings] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [workerPool, setWorkerPool] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    stage: '',
    provider: '',
    location: '',
    rating: '',
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [erpRes, postRes, ratingRes] = await Promise.all([
          api.get('/erp/'),
          api.get('/posts/'),
          api.get('/ratings/'),
        ])
        if (!active) return
        setErpItems(erpRes.data)
        setPosts(postRes.data)
        setRatings(ratingRes.data)
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

  const handleAssignWorkers = async (erp, workerIds) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/assign_workers/`, { worker_ids: workerIds })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      notify('Workers Assigned', `Workers assigned to task ${erp.id}.`)
      setMessage('Workers assigned successfully.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to assign workers.')
    }
  }

  const handleGeneratePdf = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/generate_pdf/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      if (data.pdf_slip) {
        window.open(data.pdf_slip, '_blank')
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
      <div className="card">
        <h2 className="text-2xl font-semibold">ERP Management</h2>
        <p className="text-sm text-slate-500">Monitor and manage ERP tasks.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-2 text-2xl font-semibold">{analytics.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold">{analytics.completed}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold">{analytics.pending}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Revenue</p>
          <p className="mt-2 text-2xl font-semibold">${analytics.revenue.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Top Rated Workers</p>
          <div className="mt-2 space-y-1 text-sm">
            {ratingsByProvider.slice(0, 3).map((row) => (
              <div key={row.providerId} className="flex items-center justify-between">
                <span>Provider #{row.providerId}</span>
                <span className="font-semibold">{row.average.toFixed(2)}</span>
              </div>
            ))}
            {ratingsByProvider.length === 0 && <p className="text-xs text-slate-400">No ratings yet.</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Top Rated Services</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {analytics.topServices.length === 0 ? (
            <p className="text-slate-500">No ratings yet.</p>
          ) : (
            analytics.topServices.map((item) => (
              <div key={item.postId} className="flex items-center justify-between">
                <span>{postMap[item.postId]?.post_name || `Post #${item.postId}`}</span>
                <span className="font-semibold">{item.average.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card grid gap-4 lg:grid-cols-6">
        <div>
          <label className="text-xs font-semibold text-slate-500">Category</label>
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="Received">Received</option>
            <option value="Provided">Provided</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Stage</label>
          <select
            name="stage"
            value={filters.stage}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="On Process">On Process</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Provider ID</label>
          <input
            name="provider"
            value={filters.provider}
            onChange={handleFilterChange}
            placeholder="e.g. 12"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Location</label>
          <input
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            placeholder="City"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Min Rating</label>
          <select
            name="rating"
            value={filters.rating}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="5">5+</option>
            <option value="4">4+</option>
            <option value="3">3+</option>
            <option value="2">2+</option>
            <option value="1">1+</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Worker Pool</label>
          <input
            value={workerPool}
            onChange={(event) => setWorkerPool(event.target.value)}
            placeholder="IDs for auto assign"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

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
          filteredTasks.map((erp) => {
            const post = postMap[erp.post]
            const rating = averageRatingByPost[erp.post] || 0
            return (
              <div key={erp.id} className="card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-slate-500">{erp.category}</p>
                    <h3 className="text-lg font-semibold">{post?.post_name || `Task #${erp.id}`}</h3>
                    <p className="text-sm text-slate-500">{post?.location || 'Unknown location'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {erp.stage}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>Provider: #{erp.provider || 'N/A'}</span>
                  <span>Rating: {rating.toFixed(2)}</span>
                  <span>Total: ${Number(erp.total_cost || 0).toFixed(2)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['Pending', 'On Process', 'Completed'].map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => handleStageChange(erp, stage)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        erp.stage === stage
                          ? 'bg-brand-500 text-white'
                          : 'border border-slate-200 text-slate-600'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const raw = window.prompt('Enter worker IDs separated by comma')
                      if (!raw) return
                      const ids = raw
                        .split(',')
                        .map((id) => Number(id.trim()))
                        .filter(Boolean)
                      handleAssignWorkers(erp, ids)
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    Assign (Manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ids = workerPool
                        .split(',')
                        .map((id) => Number(id.trim()))
                        .filter(Boolean)
                      if (ids.length === 0) {
                        setMessage('Worker pool is empty for auto-assign.')
                        return
                      }
                      handleAssignWorkers(erp, ids)
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    Assign (Auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGeneratePdf(erp)}
                    className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600"
                  >
                    Generate PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === erp.id ? null : erp.id))}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {expandedId === erp.id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {expandedId === erp.id && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p>Service Type: {post?.service_type || '-'}</p>
                    <p>Post Type: {post?.post_type || '-'}</p>
                    <p>Brand: {post?.brand_company_name || '-'}</p>
                    <p>Website: {post?.website_link || '-'}</p>
                    <p>Assigned Workers: {(erp.assigned_workers || []).length}</p>
                    {erp.pdf_slip && (
                      <a
                        href={erp.pdf_slip}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-brand-600"
                      >
                        View PDF Slip
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
