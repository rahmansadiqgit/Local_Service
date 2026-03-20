import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import defaultAvatar from '../assets/default-avatar.svg'

export default function ERP() {
  const navigate = useNavigate()
  const [erpItems, setErpItems] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
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
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-36 sm:px-8 sm:py-4 sm:pr-40 lg:pr-44">
          <div>
            <h2
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              ERP Management
            </h2>
            <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Monitor and manage ERP tasks.</p>
          </div>
          <img
            src="/images/erp.png"
            alt="ERP header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-32 w-32 -translate-y-1/2 object-contain sm:h-36 sm:w-36 lg:h-40 lg:w-40"
          />
        </div>
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
            const snapshot = erp.configuration_snapshot || {}
            const snapshotPost = snapshot.post || {}
            const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
            const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
            const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
            const snapshotTotals = snapshot.totals || {}
            const rating = averageRatingByPost[erp.post] || 0
            const viewerRole =
              currentUserId && String(erp.provider) === String(currentUserId)
                ? 'Provider'
                : currentUserId && String(erp.receiver) === String(currentUserId)
                  ? 'Receiver'
                  : 'Viewer'
            const roleLabel =
              viewerRole === 'Provider'
                ? 'Providing'
                : viewerRole === 'Receiver'
                  ? 'Receiving'
                  : erp.category
            const stageStyle =
              erp.stage === 'Completed'
                ? 'bg-emerald-100 text-emerald-700'
                : erp.stage === 'On Process'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
            return (
              <div key={erp.id} className="card space-y-4 transition-shadow hover:shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-slate-500">{roleLabel}</p>
                    <h3 className="text-lg font-semibold">{post?.post_name || `Task #${erp.id}`}</h3>
                    <p className="text-sm text-slate-500">{post?.location || 'Unknown location'}</p>
                    {post?.owner_id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/${post.owner_id}`)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <img
                          src={toMediaUrl(post?.owner_profile_photo) || defaultAvatar}
                          alt={post?.owner_name || 'Post owner'}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                        <span>{post?.owner_name || `Owner #${post.owner_id}`}</span>
                      </button>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageStyle}`}>
                    {erp.stage}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
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
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <h4 className="text-sm font-semibold text-slate-800">Post Details</h4>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700">Title:</span> {snapshotPost.title || post?.post_title || '-'}</p>
                        <p><span className="font-semibold text-slate-700">Type:</span> {snapshotPost.type || post?.post_type || '-'}</p>
                        <p><span className="font-semibold text-slate-700">Name:</span> {snapshotPost.name || post?.post_name || '-'}</p>
                        <p><span className="font-semibold text-slate-700">Location:</span> {snapshotPost.location || post?.location || '-'}</p>
                        <p><span className="font-semibold text-slate-700">Brand:</span> {snapshotPost.brand_company_name || post?.brand_company_name || '-'}</p>
                        <p>
                          <span className="font-semibold text-slate-700">Website:</span>{' '}
                          {snapshotPost.website_link || post?.website_link ? (
                            <a
                              href={snapshotPost.website_link || post?.website_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600"
                            >
                              Open link
                            </a>
                          ) : '-'}
                        </p>
                      </div>
                      <p className="mt-2">
                        <span className="font-semibold text-slate-700">Description:</span>{' '}
                        {snapshotPost.description || post?.description || '-'}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-slate-700">Assigned Workers:</span> {(erp.assigned_workers || []).length}
                      </p>
                    </div>

                    {[{
                      title: 'Expertise (Modified)',
                      rows: snapshotExpertise,
                    }, {
                      title: 'Services (Modified)',
                      rows: snapshotServices,
                    }, {
                      title: 'Products (Modified)',
                      rows: snapshotProducts,
                    }].map((section) => (
                      section.rows.length > 0 ? (
                        <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-3">
                          <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                          <div className="mt-2 overflow-x-auto">
                            <table className="min-w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="px-2 py-1">Name</th>
                                  <th className="px-2 py-1">Unit</th>
                                  <th className="px-2 py-1">Qty</th>
                                  <th className="px-2 py-1">Duration</th>
                                  <th className="px-2 py-1">Unit Cost</th>
                                  <th className="px-2 py-1">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.rows.map((row) => (
                                  <tr key={`${section.title}-${row.id}`} className="border-b border-slate-100 last:border-none">
                                    <td className="px-2 py-1 font-medium text-slate-700">{row.name || '-'}</td>
                                    <td className="px-2 py-1">{row.unit || '-'}</td>
                                    <td className="px-2 py-1">{Number(row.quantity || 0)}</td>
                                    <td className="px-2 py-1">{Number(row.duration || 0)}</td>
                                    <td className="px-2 py-1">${Number(row.unit_cost || 0).toFixed(2)}</td>
                                    <td className="px-2 py-1 font-semibold text-slate-700">${Number(row.line_total || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null
                    ))}

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <h4 className="text-sm font-semibold text-slate-800">Final Cost Summary</h4>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700">Expertise Total:</span> ${Number(snapshotTotals.expertise || 0).toFixed(2)}</p>
                        <p><span className="font-semibold text-slate-700">Services Total:</span> ${Number(snapshotTotals.services || 0).toFixed(2)}</p>
                        <p><span className="font-semibold text-slate-700">Products Total:</span> ${Number(snapshotTotals.products || 0).toFixed(2)}</p>
                        <p><span className="font-semibold text-slate-700">Grand Total:</span> ${Number(snapshotTotals.grand || erp.total_cost || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {erp.pdf_slip && (
                      <a
                        href={toMediaUrl(erp.pdf_slip)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-brand-600"
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
