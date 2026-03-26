import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

export default function ManagePost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [ownPostIds, setOwnPostIds] = useState(new Set())
  const [skills, setSkills] = useState([])
  const [expertises, setExpertises] = useState([])
  const [products, setProducts] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [skillWorkers, setSkillWorkers] = useState({})
  const [expertisePersons, setExpertisePersons] = useState({})
  const [expertiseDurations, setExpertiseDurations] = useState({})
  const [serviceDurations, setServiceDurations] = useState({})
  const [productUnits, setProductUnits] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const stripCategoryPrefix = (value) =>
    String(value || '')
      .replace(/^__expertise__::/i, '')
      .replace(/^__service__::/i, '')
      .trim()

  const isExpertiseSkill = (value) => /^__expertise__::/i.test(String(value || ''))
  const isServiceSkill = (value) => /^__service__::/i.test(String(value || ''))

  const normalizeCategoryLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'expertise') return 'Expertise'
    if (normalized === 'services' || normalized === 'service') return 'Service'
    if (normalized === 'product' || normalized === 'products') return 'Product'
    return ''
  }

  const parsePostCategories = (value) =>
    String(value || '')
      .split(',')
      .map((item) => normalizeCategoryLabel(item))
      .filter(Boolean)

  const formatRateUnit = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'Hour'
    if (normalized === 'daily') return 'Day'
    if (normalized === 'monthly') return 'Month'
    if (!normalized) return 'Unit'
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const resolveMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const backendOrigin = apiBase.replace(/\/api\/?$/, '')
    return value.startsWith('/') ? `${backendOrigin}${value}` : `${backendOrigin}/${value}`
  }

  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      const [myPostRes, allPostRes, skillRes, expertiseRes, productRes, erpRes] = await Promise.all([
        api.get('/posts/?mine=1'),
        api.get('/posts/'),
        api.get('/skills/'),
        api.get('/expertises/'),
        api.get('/products/'),
        api.get('/erp/'),
      ])

      const mineIds = new Set((myPostRes.data || []).map((post) => post.id))
      const erpPostIds = new Set((erpRes.data || []).map((item) => item.post))
      const manageableIds = new Set([...erpPostIds])
      const manageablePosts = (allPostRes.data || []).filter((post) => manageableIds.has(post.id))

      setOwnPostIds(mineIds)
      setPosts(manageablePosts)
      setSkills(skillRes.data)
      setExpertises(expertiseRes.data)
      setProducts(productRes.data)
      setErpItems(erpRes.data)
    } catch (error) {
      console.error(error)
      showMessage('Error loading posts', 'error')
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${postId}/`)
        setPosts((prev) => prev.filter((post) => post.id !== postId))
        setOwnPostIds((prev) => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })
        showMessage('Post deleted successfully', 'success')
      } catch (error) {
        console.error(error)
        showMessage('Failed to delete post', 'error')
      }
    }
  }

  const skillBreakdownByPost = useMemo(() => {
    const skillsGroupedByPost = skills.reduce((acc, skill) => {
      acc[skill.post] = acc[skill.post] || []
      acc[skill.post].push(skill)
      return acc
    }, {})

    return posts.reduce((acc, post) => {
      const rows = skillsGroupedByPost[post.id] || []
      const taggedExpertise = rows
        .filter((item) => isExpertiseSkill(item.skill_name))
        .map((item) => ({ ...item, skill_name: stripCategoryPrefix(item.skill_name) }))
      const taggedServices = rows
        .filter((item) => isServiceSkill(item.skill_name))
        .map((item) => ({ ...item, service_name: stripCategoryPrefix(item.skill_name) }))

      if (taggedExpertise.length || taggedServices.length) {
        acc[post.id] = { expertise: taggedExpertise, services: taggedServices }
        return acc
      }

      const categories = String(post.post_name || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const hasServicesCategory = categories.includes('services')
      const hasExpertiseCategory = categories.includes('expertise')

      const cleanedRows = rows.map((item) => ({ ...item, skill_name: stripCategoryPrefix(item.skill_name) }))

      if (hasServicesCategory && !hasExpertiseCategory) {
        acc[post.id] = {
          expertise: [],
          services: cleanedRows.map((item) => ({ ...item, service_name: item.skill_name })),
        }
      } else {
        acc[post.id] = { expertise: cleanedRows, services: [] }
      }

      return acc
    }, {})
  }, [posts, skills])

  const expertisesByPost = useMemo(() => {
    return expertises.reduce((acc, expertise) => {
      acc[expertise.post] = acc[expertise.post] || []
      acc[expertise.post].push(expertise)
      return acc
    }, {})
  }, [expertises])

  const productsByPost = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.post] = acc[product.post] || []
      acc[product.post].push(product)
      return acc
    }, {})
  }, [products])

  const erpByPost = useMemo(() => {
    return erpItems.reduce((acc, item) => {
      acc[item.post] = item
      return acc
    }, {})
  }, [erpItems])

  const getTotalForPost = (postId) => {
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []
    
    const skillExpertiseTotal = skillExpertiseRows.reduce((sum, row) => {
      const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
      return sum + workers * Number(row.cost_per_unit || 0)
    }, 0)
    
    const newExpertiseTotal = newExpertiseRows.reduce((sum, expertise) => {
      const persons = Number(expertisePersons[`expertise-${expertise.id}`] || 0)
      const duration = Number(expertiseDurations[`expertise-${expertise.id}-duration`] || 0)
      return sum + persons * duration * Number(expertise.cost || 0)
    }, 0)
    
    const serviceTotal = serviceRows.reduce((sum, row) => {
      const duration = Number(serviceDurations[`service-${row.id}-duration`] || 0)
      return sum + duration * Number(row.cost_per_unit || 0)
    }, 0)
    
    const productTotal = productRows.reduce((sum, row) => {
      const units = Number(productUnits[`product-${row.id}`] || 0)
      return sum + units * Number(row.cost_per_unit || 0)
    }, 0)
    
    return skillExpertiseTotal + newExpertiseTotal + serviceTotal + productTotal
  }

  const getCostBreakdownForPost = (postId) => {
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    const expertiseTotal =
      skillExpertiseRows.reduce((sum, row) => {
        const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
        return sum + workers * Number(row.cost_per_unit || 0)
      }, 0) +
      newExpertiseRows.reduce((sum, row) => {
        const persons = Number(expertisePersons[`expertise-${row.id}`] || 0)
        const duration = Number(expertiseDurations[`expertise-${row.id}-duration`] || 0)
        return sum + persons * duration * Number(row.cost || 0)
      }, 0)

    const serviceTotal = serviceRows.reduce((sum, row) => {
      const duration = Number(serviceDurations[`service-${row.id}-duration`] || 0)
      return sum + duration * Number(row.cost_per_unit || 0)
    }, 0)

    const productTotal = productRows.reduce((sum, row) => {
      const units = Number(productUnits[`product-${row.id}`] || 0)
      return sum + units * Number(row.cost_per_unit || 0)
    }, 0)

    const selectedCategories = [
      expertiseTotal > 0 ? 'expertise' : null,
      serviceTotal > 0 ? 'service' : null,
      productTotal > 0 ? 'product' : null,
    ].filter(Boolean)

    return {
      expertiseTotal,
      serviceTotal,
      productTotal,
      total: expertiseTotal + serviceTotal + productTotal,
      selectedCategories,
      selectedCount: selectedCategories.length,
      hasSelection: selectedCategories.length > 0,
    }
  }

  const buildConfigurationSnapshot = (post) => {
    const postId = post.id
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    const skillExpertise = skillExpertiseRows
      .map((row) => {
        const quantity = Number(skillWorkers[`skill-${row.id}`] || 0)
        const unitCost = Number(row.cost_per_unit || 0)
        return {
          id: row.id,
          name: row.skill_name,
          unit: row.unit,
          quantity,
          duration: 0,
          unit_cost: unitCost,
          line_total: quantity * unitCost,
        }
      })
      .filter((row) => row.quantity > 0)

    const newExpertise = newExpertiseRows
      .map((row) => {
        const quantity = Number(expertisePersons[`expertise-${row.id}`] || 0)
        const duration = Number(expertiseDurations[`expertise-${row.id}-duration`] || 0)
        const unitCost = Number(row.cost || 0)
        return {
          id: row.id,
          name: row.name,
          experience: row.experience,
          unit: row.unit,
          quantity,
          duration,
          unit_cost: unitCost,
          line_total: quantity * duration * unitCost,
        }
      })
      .filter((row) => row.quantity > 0 || row.duration > 0)

    const expertise = [...skillExpertise, ...newExpertise]

    const services = serviceRows
      .map((row) => {
        const duration = Number(serviceDurations[`service-${row.id}-duration`] || 0)
        const unitCost = Number(row.cost_per_unit || 0)
        return {
          id: row.id,
          name: row.service_name,
          unit: row.unit,
          quantity: duration > 0 ? 1 : 0,
          duration,
          unit_cost: unitCost,
          line_total: duration * unitCost,
        }
      })
      .filter((row) => row.duration > 0)

    const products = productRows
      .map((row) => {
        const quantity = Number(productUnits[`product-${row.id}`] || 0)
        const unitCost = Number(row.cost_per_unit || 0)
        return {
          id: row.id,
          name: row.product_name,
          unit: row.unit,
          quantity,
          duration: 0,
          unit_cost: unitCost,
          line_total: quantity * unitCost,
        }
      })
      .filter((row) => row.quantity > 0)

    const expertiseTotal = expertise.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const serviceTotal = services.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const productTotal = products.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const grand = expertiseTotal + serviceTotal + productTotal

    return {
      generated_at: new Date().toISOString(),
      post: {
        id: post.id,
        title: post.post_title || '',
        name: post.post_name || '',
        type: post.post_type || '',
        location: post.location || '',
        description: post.description || '',
        brand_company_name: post.brand_company_name || '',
        website_link: post.website_link || '',
        created_at: post.created_at || '',
        owner_id: post.owner_id || null,
        owner_name: post.owner_name || '',
        owner_status: post.owner_status || '',
        owner_supply_status: post.owner_supply_status || '',
        owner_demand_status: post.owner_demand_status || '',
      },
      expertise,
      services,
      products,
      totals: {
        expertise: expertiseTotal,
        services: serviceTotal,
        products: productTotal,
        grand,
      },
    }
  }

  const handleCreateOrUpdateErp = async (post) => {
    const snapshot = buildConfigurationSnapshot(post)
    const total = Number(snapshot.totals?.grand || getTotalForPost(post.id) || 0)
    if (total <= 0) {
      showMessage('Please select at least one category item before confirming booking', 'error')
      return
    }

    const existing = erpByPost[post.id]
    try {
      if (existing) {
        const { data } = await api.patch(`/erp/${existing.id}/`, {
          total_cost: total,
          configuration_snapshot: snapshot,
          is_configured: true,
        })
        setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        showMessage('Booking confirmed and ERP task updated', 'success')
      } else {
        const payload = {
          post: post.id,
          total_cost: total,
          configuration_snapshot: snapshot,
          is_configured: true,
        }
        const { data } = await api.post('/erp/', payload)
        setErpItems((prev) => [...prev, data])
        showMessage('Booking confirmed and ERP task created', 'success')
      }

      setTimeout(() => {
        navigate('/erp')
      }, 250)
    } catch (error) {
      console.error(error)
      showMessage('Failed to manage ERP task', 'error')
    }
  }

  const CounterControl = ({ value, onChange, max, label, unit }) => {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
            className="w-16 text-center text-lg font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg border-2 border-slate-300 dark:border-slate-600"
          />
          <button
            onClick={() => onChange(Math.min(max, value + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold transition"
          >
            +
          </button>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300">{unit}</span>
      </div>
    )
  }

  const visiblePosts = useMemo(() => {
    if (!id) return posts
    return posts.filter((post) => String(post.id) === String(id))
  }, [posts, id])

  return (
    <>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#dccbff] to-[#e5d7ff] p-0 text-slate-800 shadow-lg">
            <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
              <h1
                className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
                style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
              >
                Manage Your Posts
              </h1>
              <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Adjust expertise workers, service duration, and product units with real-time cost calculation.</p>
              <img
                src="/images/manage_post.png"
                alt="Manage post header illustration"
                className="pointer-events-none absolute right-14 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
              />
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`card rounded-2xl p-4 animate-slide-in ${
              messageType === 'success' ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300' : 
              messageType === 'error' ? 'bg-red-50 border-2 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300' : 
              'bg-blue-50 border-2 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
            }`}>
              <p className="font-semibold text-center">{message}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div
              className="card rounded-3xl p-16 text-center shadow-lg"
              style={{
                backgroundColor: 'rgba(236, 225, 255, 0.56)',
                backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
              }}
            >
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-300 border-t-brand-500"></div>
              </div>
              <p className="mt-6 text-slate-600 dark:text-slate-400 text-lg font-semibold">Loading your posts...</p>
            </div>
          )}

          {/* No Posts State */}
          {!loading && visiblePosts.length === 0 && (
            <div
              className="card rounded-3xl p-16 text-center shadow-lg"
              style={{
                backgroundColor: 'rgba(236, 225, 255, 0.56)',
                backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
              }}
            >
              <div className="text-6xl mb-6">📭</div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No posts to manage</p>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Book or apply to a post to start managing it here.</p>
            </div>
          )}

          {/* Posts List */}
          {!loading && visiblePosts.length > 0 && (
            <div className="space-y-8">
              {visiblePosts.map((post) => {
                const breakdown = getCostBreakdownForPost(post.id)
                const postImageSrc = resolveMediaUrl(post.image || post.post_image || '')
                return (
                <div
                  key={post.id}
                  className="relative rounded-3xl border border-violet-200/80 shadow-xl overflow-hidden backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(236, 225, 255, 0.56)',
                    backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
                  }}
                >
                  {/* Post Header */}
                  <div className="relative overflow-hidden rounded-t-3xl border-b-2 border-slate-300/70 bg-gradient-to-br from-[#08174f] via-[#1e3a8a] to-[#6d28d9] p-8 text-white dark:from-[#050d2f] dark:via-[#102a6b] dark:to-[#4c1d95]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_50%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold tracking-wide text-cyan-100 shadow-sm backdrop-blur-sm mb-3">
                          {post.post_type === 'Supply' ? '📦 AVAILABLE' : '🔍 DEMAND'}
                        </span>
                        <h2 className="text-3xl font-bold text-white drop-shadow-sm">{post.post_title || 'Post Details'}</h2>
                        <p className="mt-2 flex items-center gap-2 text-blue-100/95">
                          <span>📍</span> {post.location || 'Location not specified'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {parsePostCategories(post.post_name).length > 0 ? (
                            parsePostCategories(post.post_name).map((category) => (
                              <span
                                key={`${post.id}-${category}`}
                                className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-4 py-1.5 text-sm font-semibold tracking-wide text-cyan-100 shadow-sm backdrop-blur-sm"
                              >
                                {category}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-blue-100/90 backdrop-blur-sm">
                              Uncategorized
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full md:w-52 flex flex-col items-start gap-3 md:items-end">
                        {ownPostIds.has(post.id) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white font-bold rounded-2xl transition transform hover:scale-105 shadow-lg"
                          >
                            🗑️ Delete Post
                          </button>
                        )}
                        {postImageSrc && (
                          <div className="w-full max-w-[240px] overflow-hidden rounded-2xl border border-white/35 bg-white/10 p-1.5 shadow-lg backdrop-blur-sm">
                            <img
                              src={postImageSrc}
                              alt={post.post_title || post.post_name || 'Post image'}
                              className="h-40 w-full rounded-xl object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Management Section */}
                  {(skillBreakdownByPost[post.id]?.expertise || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">🛠️</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Expertise Management</h3>
                        <span className="ml-auto px-3 py-1 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full font-semibold">
                          {(skillBreakdownByPost[post.id]?.expertise || []).length} expertise
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(skillBreakdownByPost[post.id]?.expertise || []).map((skill) => {
                          const workers = Number(skillWorkers[`skill-${skill.id}`] || 0)
                          const totalCost = workers * Number(skill.cost_per_unit || 0)
                          const workType = formatRateUnit(skill.unit)
                          return (
                            <div key={skill.id} className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-500 transition">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">Expertise</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{skill.skill_name}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">
                                Work Type: <span className="font-semibold">{workType}</span>
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
                                Charge: <span className="font-semibold">{Number(skill.cost_per_unit || 0).toFixed(2)} BDT</span> per <span className="font-semibold">{workType}</span>
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Available Person: {Number(skill.available_workers || 0)}</p>
                              
                              <div className="mb-4">
                                <CounterControl
                                  value={workers}
                                  onChange={(val) => setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: val }))}
                                  max={Math.max(Number(skill.available_workers || 0), 1)}
                                  label="Required Person"
                                  unit={workers === 1 ? 'person' : 'persons'}
                                />
                              </div>
                              
                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Expertise Management Section */}
                  {(expertisesByPost[post.id] || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">💼</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Expertise</h3>
                        <span className="ml-auto px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
                          {(expertisesByPost[post.id] || []).length} expertise
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(expertisesByPost[post.id] || []).map((expertise) => {
                          const persons = Number(expertisePersons[`expertise-${expertise.id}`] || 0)
                          const duration = Number(expertiseDurations[`expertise-${expertise.id}-duration`] || 0)
                          const durationUnit = expertise.unit || 'duration unit'
                          const workType = formatRateUnit(expertise.unit)
                          const totalCost = persons * duration * Number(expertise.cost || 0)
                          return (
                            <div key={expertise.id} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">Expertise</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{expertise.name}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">
                                Work Type: <span className="font-semibold">{workType}</span>
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
                                Charge: <span className="font-semibold">{Number(expertise.cost || 0).toFixed(2)} BDT</span> per <span className="font-semibold">{workType}</span>
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">Available Person: {expertise.available_person}</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <CounterControl
                                  value={persons}
                                  onChange={(val) => setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: val }))}
                                  max={Math.max(expertise.available_person || 1, 1)}
                                  label="People Required"
                                  unit={persons === 1 ? 'person' : 'persons'}
                                />
                                <CounterControl
                                  value={duration}
                                  onChange={(val) => setExpertiseDurations((prev) => ({ ...prev, [`expertise-${expertise.id}-duration`]: val }))}
                                  max={365}
                                  label="Duration Needed"
                                  unit={durationUnit}
                                />
                              </div>
                              
                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Services Management Section */}
                  {(skillBreakdownByPost[post.id]?.services || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">🧹</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Service</h3>
                        <span className="ml-auto px-3 py-1 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-full font-semibold">
                          {(skillBreakdownByPost[post.id]?.services || []).length} services
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(skillBreakdownByPost[post.id]?.services || []).map((service) => {
                          const duration = Number(serviceDurations[`service-${service.id}-duration`] || 0)
                          const totalCost = duration * Number(service.cost_per_unit || 0)
                          const durationUnit = formatRateUnit(service.unit)

                          return (
                            <div key={service.id} className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500 transition">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">Service</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{service.service_name}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">
                                Service Duration: <span className="font-semibold">{durationUnit}</span>
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
                                Service Cost: <span className="font-semibold">{Number(service.cost_per_unit || 0).toFixed(2)} BDT</span> per <span className="font-semibold">{durationUnit}</span>
                              </p>

                              <div className="grid grid-cols-1 gap-4 mb-4">
                                <CounterControl
                                  value={duration}
                                  onChange={(val) => setServiceDurations((prev) => ({ ...prev, [`service-${service.id}-duration`]: val }))}
                                  max={365}
                                  label="Duration Needed"
                                  unit={durationUnit}
                                />
                              </div>

                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Products Management Section */}
                  {(productsByPost[post.id] || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">📦</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Product</h3>
                        <span className="ml-auto px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full font-semibold">
                          {(productsByPost[post.id] || []).length} products
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(productsByPost[post.id] || []).map((product) => {
                          const units = Number(productUnits[`product-${product.id}`] || 0)
                          const availableUnits = Math.max(Number(product.available_units || 0), 0)
                          const productUnit = product.unit || 'unit'
                          const totalCost = units * Number(product.cost_per_unit || 0)
                          return (
                            <div key={product.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 transition">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">Product</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{product.product_name}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">
                                Unit: <span className="font-semibold">{productUnit}</span>
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
                                Cost: <span className="font-semibold">{Number(product.cost_per_unit || 0).toFixed(2)} BDT</span> per <span className="font-semibold">{productUnit}</span>
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Available Quantity: {availableUnits}
                              </p>
                              
                              <div className="mb-4">
                                <CounterControl
                                  value={units}
                                  onChange={(val) => setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: val }))}
                                  max={availableUnits}
                                  label="Units Required"
                                  unit={units === 1 ? 'unit' : 'units'}
                                />
                              </div>
                              
                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  <div className="rounded-b-3xl border-t-2 border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-8 dark:from-emerald-900/10 dark:to-blue-900/10 dark:border-slate-700">
                    {breakdown.hasSelection && (
                      <div className={`grid grid-cols-1 gap-6 mb-6 ${breakdown.selectedCount > 1 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1 lg:grid-cols-1'}`}>
                        {breakdown.expertiseTotal > 0 && (
                          <div className="rounded-2xl p-6 shadow-md border border-violet-200/80" style={{ backgroundColor: 'rgba(239, 228, 255, 0.58)' }}>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">Expertise Charge</p>
                            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">${breakdown.expertiseTotal.toFixed(2)}</p>
                          </div>
                        )}
                        {breakdown.serviceTotal > 0 && (
                          <div className="rounded-2xl p-6 shadow-md border border-violet-200/80" style={{ backgroundColor: 'rgba(239, 228, 255, 0.58)' }}>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">Service Cost</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${breakdown.serviceTotal.toFixed(2)}</p>
                          </div>
                        )}
                        {breakdown.productTotal > 0 && (
                          <div className="rounded-2xl p-6 shadow-md border border-violet-200/80" style={{ backgroundColor: 'rgba(239, 228, 255, 0.58)' }}>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">Product Cost</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">${breakdown.productTotal.toFixed(2)}</p>
                          </div>
                        )}
                        {breakdown.selectedCount > 1 && (
                          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-2xl p-6 shadow-lg text-white">
                            <p className="text-sm font-semibold mb-2 opacity-90">Total Cost</p>
                            <p className="text-3xl font-bold">${breakdown.total.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleCreateOrUpdateErp(post)}
                      disabled={!breakdown.hasSelection}
                      className={`block mx-auto w-fit px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition shadow-md ${
                        breakdown.hasSelection
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 dark:from-violet-700 dark:to-fuchsia-700 dark:hover:from-violet-800 dark:hover:to-fuchsia-800 active:scale-[0.99]'
                          : 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-70'
                      }`}
                    >
                      ✓ Confirm your Booking
                    </button>
                    {!breakdown.hasSelection && (
                      <p className="mt-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        Select at least one category item to enable confirmation.
                      </p>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
      </div>
    </>
  )
}
