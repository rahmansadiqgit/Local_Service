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
  const [includedCategories, setIncludedCategories] = useState({})
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
    return getCostBreakdownForPost(postId).total
  }

  const getCategorySelection = (postId) => {
    const current = includedCategories[postId] || {}
    return {
      expertise: Boolean(current.expertise),
      services: Boolean(current.services),
      products: Boolean(current.products),
    }
  }

  const toggleCategorySelection = (postId, categoryKey) => {
    setIncludedCategories((prev) => {
      const current = prev[postId] || {}
      return {
        ...prev,
        [postId]: {
          ...current,
          [categoryKey]: !Boolean(current[categoryKey]),
        },
      }
    })
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

    const selection = getCategorySelection(postId)

    const selectedExpertiseTotal = selection.expertise ? expertiseTotal : 0
    const selectedServiceTotal = selection.services ? serviceTotal : 0
    const selectedProductTotal = selection.products ? productTotal : 0

    const selectedCategories = [
      selection.expertise && expertiseTotal > 0 ? 'expertise' : null,
      selection.services && serviceTotal > 0 ? 'service' : null,
      selection.products && productTotal > 0 ? 'product' : null,
    ].filter(Boolean)

    return {
      expertiseTotal: selectedExpertiseTotal,
      serviceTotal: selectedServiceTotal,
      productTotal: selectedProductTotal,
      total: selectedExpertiseTotal + selectedServiceTotal + selectedProductTotal,
      selectedCategories,
      selectedCount: selectedCategories.length,
      hasSelection: selectedCategories.length > 0,
      selection,
    }
  }

  const buildConfigurationSnapshot = (post) => {
    const postId = post.id
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []
    const selection = getCategorySelection(postId)

    const skillExpertise = (selection.expertise ? skillExpertiseRows : [])
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

    const newExpertise = (selection.expertise ? newExpertiseRows : [])
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

    const services = (selection.services ? serviceRows : [])
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

    const products = (selection.products ? productRows : [])
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

  const InclusionPill = ({ checked }) => (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        checked
          ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
          : 'border-slate-300 bg-slate-100 text-slate-600'
      }`}
    >
      {checked ? 'Included in booking' : 'Not included'}
    </span>
  )

  const CategoryToggle = ({ postId, categoryKey, checked }) => (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleCategorySelection(postId, categoryKey)}
        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      <InclusionPill checked={checked} />
    </label>
  )

  const visiblePosts = useMemo(() => {
    if (!id) return posts
    return posts.filter((post) => String(post.id) === String(id))
  }, [posts, id])

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'rgba(236, 225, 255, 0.56)',
        backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
      }}
    >
      <div className="space-y-6">
        {/* Status Message */}
        {message && (
          <div className={`card rounded-2xl p-4 animate-slide-in mx-4 mt-4 ${
            messageType === 'success' ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300' : 
            messageType === 'error' ? 'bg-red-50 border-2 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300' : 
            'bg-blue-50 border-2 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
          }`}>
            <p className="font-semibold text-center">{message}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="card rounded-3xl p-16 text-center shadow-lg bg-white/80 backdrop-blur">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-300 border-t-brand-500"></div>
              </div>
              <p className="mt-6 text-slate-600 dark:text-slate-400 text-lg font-semibold">Loading your posts...</p>
            </div>
          </div>
        )}

        {/* No Posts State */}
        {!loading && visiblePosts.length === 0 && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="card rounded-3xl p-16 text-center shadow-lg bg-white/80 backdrop-blur">
              <div className="text-6xl mb-6">📭</div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No posts to manage</p>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Book or apply to a post to start managing it here.</p>
            </div>
          </div>
        )}

        {/* Posts List */}
        {!loading && visiblePosts.length > 0 && (
          <div className="space-y-8 p-4">
            {visiblePosts.map((post) => {
              const breakdown = getCostBreakdownForPost(post.id)
              const postImageSrc = resolveMediaUrl(post.image || post.post_image || '')
              const hasExpertiseRows = (skillBreakdownByPost[post.id]?.expertise || []).length > 0 || (expertisesByPost[post.id] || []).length > 0
              const hasServiceRows = (skillBreakdownByPost[post.id]?.services || []).length > 0
              const hasProductRows = (productsByPost[post.id] || []).length > 0

              return (
                <div
                  key={post.id}
                  className="relative rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden backdrop-blur-md bg-white"
                >
                  {/* STICKY TOPBAR */}
                  <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                      <button
                        onClick={() => navigate(-1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
                        aria-label="Go back"
                      >
                        &lt;
                      </button>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-bold text-slate-900">{post.post_title || 'Post Details'}</h2>
                        <p className="truncate text-xs text-slate-600">
                          {post.location || 'Location'} • {parsePostCategories(post.post_name).join(', ') || 'Uncategorized'}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-amber-600">★ {post.rating_average || '4.8'}</p>
                        </div>
                        {postImageSrc && (
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-100">
                            <img
                              src={postImageSrc}
                              alt={post.post_title || 'Post'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SUPPLIER STRIP */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-800">
                        {String(post.owner_name || 'S').trim().charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{post.owner_name || 'Supplier'}</p>
                        <p className="truncate text-xs text-slate-600">{post.location || 'Dhaka'}</p>
                      </div>
                    </div>
                    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✓ Available
                    </span>
                  </div>

                  {/* TWO-COLUMN LAYOUT */}
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-0">
                    {/* LEFT COLUMN - Booking Items */}
                    <div className="overflow-y-auto">
                      {/* Blue Hint Bar */}
                      <div className="border-b border-slate-200 bg-blue-50 px-5 py-3 sm:px-6">
                        <p className="text-sm font-semibold text-blue-900">ℹ️ Check only what you need — uncheck anything to skip.</p>
                      </div>

                      {/* EXPERTISE SECTION */}
                      {(hasExpertiseRows) && (
                        <div className="border-b border-slate-200 p-5 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold text-slate-900">Expertise</h3>
                            <CategoryToggle postId={post.id} categoryKey="expertise" checked={breakdown.selection.expertise} />
                          </div>
                          <div className="space-y-3">
                            {((skillBreakdownByPost[post.id]?.expertise || [])
                              .concat(expertisesByPost[post.id] || []))
                              .map((item, idx) => {
                                const isSkill = 'cost_per_unit' in item
                                const key = isSkill ? `skill-${item.id}` : `expertise-${item.id}`
                                const workers = isSkill ? Number(skillWorkers[key] || 0) : Number(expertisePersons[`expertise-${item.id}`] || 0)
                                const duration = isSkill ? 0 : Number(expertiseDurations[`expertise-${item.id}-duration`] || 0)
                                const cost = isSkill ? Number(item.cost_per_unit || 0) : Number(item.cost || 0)
                                const totalCost = isSkill ? workers * cost : workers * duration * cost
                                const name = isSkill ? item.skill_name : item.name

                                return (
                                  <div
                                    key={`${key}-${idx}`}
                                    className={`rounded-xl border-2 p-4 transition ${
                                      breakdown.selection.expertise
                                        ? 'border-slate-300 bg-white'
                                        : 'border-slate-200 bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-900 truncate">{name}</h4>
                                        <p className="text-xs text-slate-600 mt-0.5">{Number(cost).toFixed(0)} BDT per hour</p>
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={breakdown.selection.expertise}
                                        onChange={() => toggleCategorySelection(post.id, 'expertise')}
                                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-violet-600"
                                      />
                                    </div>

                                    {breakdown.selection.expertise && (
                                      <>
                                        <div className="space-y-3 mb-3">
                                          {isSkill ? (
                                            <CounterControl
                                              value={workers}
                                              onChange={(val) => setSkillWorkers((prev) => ({ ...prev, [key]: val }))}
                                              max={Number(item.available_workers || 10)}
                                              label="People Required"
                                              unit="person"
                                            />
                                          ) : (
                                            <>
                                              <CounterControl
                                                value={workers}
                                                onChange={(val) => setExpertisePersons((prev) => ({ ...prev, [`expertise-${item.id}`]: val }))}
                                                max={item.available_person || 10}
                                                label="People Required"
                                                unit="person"
                                              />
                                              <CounterControl
                                                value={duration}
                                                onChange={(val) => setExpertiseDurations((prev) => ({ ...prev, [`expertise-${item.id}-duration`]: val }))}
                                                max={365}
                                                label="Duration (hours)"
                                                unit="hour"
                                              />
                                            </>
                                          )}
                                        </div>
                                        <div className="border-t border-slate-200 pt-3 text-right">
                                          <p className="text-xs text-slate-600">Subtotal</p>
                                          <p className="text-lg font-bold text-slate-900">{Number(totalCost).toFixed(0)} BDT</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* SERVICES SECTION */}
                      {hasServiceRows && (
                        <div className="border-b border-slate-200 p-5 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold text-slate-900">Services</h3>
                            <CategoryToggle postId={post.id} categoryKey="services" checked={breakdown.selection.services} />
                          </div>
                          <div className="space-y-3">
                            {(skillBreakdownByPost[post.id]?.services || []).map((service) => {
                              const duration = Number(serviceDurations[`service-${service.id}-duration`] || 0)
                              const cost = Number(service.cost_per_unit || 0)
                              const totalCost = duration * cost

                              return (
                                <div
                                  key={service.id}
                                  className={`rounded-xl border-2 p-4 transition ${
                                    breakdown.selection.services
                                      ? 'border-slate-300 bg-white'
                                      : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-slate-900 truncate">{service.service_name}</h4>
                                      <p className="text-xs text-slate-600 mt-0.5">{Number(cost).toFixed(0)} BDT per hour</p>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={breakdown.selection.services}
                                      onChange={() => toggleCategorySelection(post.id, 'services')}
                                      className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-violet-600"
                                    />
                                  </div>

                                  {breakdown.selection.services && (
                                    <>
                                      <div className="mb-3">
                                        <CounterControl
                                          value={duration}
                                          onChange={(val) => setServiceDurations((prev) => ({ ...prev, [`service-${service.id}-duration`]: val }))}
                                          max={365}
                                          label="Duration (hours)"
                                          unit="hour"
                                        />
                                      </div>
                                      <div className="border-t border-slate-200 pt-3 text-right">
                                        <p className="text-xs text-slate-600">Subtotal</p>
                                        <p className="text-lg font-bold text-slate-900">{Number(totalCost).toFixed(0)} BDT</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* PRODUCTS SECTION */}
                      {hasProductRows && (
                        <div className="border-b border-slate-200 p-5 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold text-slate-900">Products</h3>
                            <CategoryToggle postId={post.id} categoryKey="products" checked={breakdown.selection.products} />
                          </div>
                          <div className="space-y-3">
                            {(productsByPost[post.id] || []).map((product) => {
                              const units = Number(productUnits[`product-${product.id}`] || 0)
                              const cost = Number(product.cost_per_unit || 0)
                              const totalCost = units * cost
                              const availableUnits = Math.max(Number(product.available_units || 0), 0)

                              return (
                                <div
                                  key={product.id}
                                  className={`rounded-xl border-2 p-4 transition ${
                                    breakdown.selection.products
                                      ? 'border-slate-300 bg-white'
                                      : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-slate-900 truncate">{product.product_name}</h4>
                                      <p className="text-xs text-slate-600 mt-0.5">{Number(cost).toFixed(0)} BDT per unit • {availableUnits} in stock</p>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={breakdown.selection.products}
                                      onChange={() => toggleCategorySelection(post.id, 'products')}
                                      className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-violet-600"
                                    />
                                  </div>

                                  {breakdown.selection.products && (
                                    <>
                                      <div className="mb-3">
                                        <CounterControl
                                          value={units}
                                          onChange={(val) => setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: val }))}
                                          max={availableUnits}
                                          label="Quantity"
                                          unit="unit"
                                        />
                                      </div>
                                      <div className="border-t border-slate-200 pt-3 text-right">
                                        <p className="text-xs text-slate-600">Subtotal</p>
                                        <p className="text-lg font-bold text-slate-900">{Number(totalCost).toFixed(0)} BDT</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* NOTES FOR SUPPLIER */}
                      <div className="border-b border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                        <p className="text-xs font-semibold tracking-wide text-slate-600 mb-3">NOTES FOR SUPPLIER</p>
                        <textarea
                          rows={3}
                          placeholder="Any special requirements, access instructions, or preferred working hours..."
                          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300"
                        />
                      </div>
                    </div>

                    {/* RIGHT COLUMN - Order Summary (Sticky on lg) */}
                    <div className="border-l border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 lg:sticky lg:top-[120px] lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
                      <h4 className="text-lg font-bold text-slate-900 mb-1">Order summary</h4>
                      <p className="text-xs text-slate-600 mb-4">
                        {breakdown.selectedCount > 0 ? (
                          <>
                            <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{breakdown.selectedCount} item{breakdown.selectedCount !== 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          'Add items to begin'
                        )}
                      </p>

                      {breakdown.selectedCount === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm font-semibold">No items selected</p>
                          <p className="text-xs mt-1">Check boxes above to add items</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2 border-t border-slate-200 pt-3 mb-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Subtotal</span>
                              <span className="font-semibold text-slate-900">{Number(breakdown.total).toFixed(0)} BDT</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-3 mb-4">
                            <div className="flex justify-between">
                              <span className="text-lg font-bold text-slate-900">Total</span>
                              <span className="text-2xl font-bold text-violet-600">{Number(breakdown.total).toFixed(0)} BDT</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Booking confirmed once supplier accepts. No charge until then.</p>
                          </div>

                          <button
                            onClick={() => handleCreateOrUpdateErp(post)}
                            disabled={!breakdown.hasSelection}
                            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition mb-3 ${
                              breakdown.hasSelection
                                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700'
                                : 'cursor-not-allowed bg-slate-300 text-slate-500'
                            }`}
                          >
                            Request booking ↗
                          </button>

                          <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-start gap-2">
                              <span>🔒</span>
                              <span>Secure booking</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span>📅</span>
                              <span>Free cancellation 24h</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span>💳</span>
                              <span>No charge until accepted</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {ownPostIds.has(post.id) && (
                    <div className="border-t border-slate-200 bg-white p-4 text-center">
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition text-sm"
                      >
                        🗑️ Delete Post
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
