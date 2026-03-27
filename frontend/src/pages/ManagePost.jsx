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
  const [productUnits, setProductUnits] = useState({})
  const [itemToggles, setItemToggles] = useState({})
  const [supplierNotesByPost, setSupplierNotesByPost] = useState({})
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

  const getItemKey = (type, id) => `${type}-${id}`

  const isItemEnabled = (postId, type, id) => {
    const postState = itemToggles[postId] || {}
    const key = getItemKey(type, id)
    return postState[key] !== false
  }

  const setItemEnabled = (postId, type, id, enabled, onDisableReset) => {
    setItemToggles((prev) => {
      const postState = prev[postId] || {}
      const key = getItemKey(type, id)
      return {
        ...prev,
        [postId]: {
          ...postState,
          [key]: enabled,
        },
      }
    })

    if (!enabled && typeof onDisableReset === 'function') {
      onDisableReset()
    }
  }

  const toggleItemEnabled = (postId, type, id, onDisableReset) => {
    const nextEnabled = !isItemEnabled(postId, type, id)
    setItemEnabled(postId, type, id, nextEnabled, onDisableReset)
  }

  const getBookingBreakdownForPost = (postId) => {
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    let expertiseTotal = 0
    let serviceTotal = 0
    let productTotal = 0
    const lineItems = []

    skillExpertiseRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'skill', row.id)
      const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
      const unitCost = Number(row.cost_per_unit || 0)
      const lineTotal = enabled ? workers * unitCost : 0
      expertiseTotal += lineTotal
      if (enabled && workers > 0) {
        lineItems.push({
          key: `skill-${row.id}`,
          title: row.skill_name,
          detail: `(${workers} person × 1 hr)`,
          amount: lineTotal,
        })
      }
    })

    newExpertiseRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'expertise', row.id)
      const persons = Number(expertisePersons[`expertise-${row.id}`] || 0)
      const duration = Number(expertiseDurations[`expertise-${row.id}-duration`] || 0)
      const unitCost = Number(row.cost || 0)
      const lineTotal = enabled ? persons * duration * unitCost : 0
      expertiseTotal += lineTotal
      if (enabled && persons > 0 && duration > 0) {
        lineItems.push({
          key: `expertise-${row.id}`,
          title: row.name,
          detail: `(${persons} person × ${duration} hr)`,
          amount: lineTotal,
        })
      }
    })

    serviceRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'service', row.id)
      const quantity = enabled ? 1 : 0
      const unitCost = Number(row.cost_per_unit || 0)
      const lineTotal = quantity * unitCost
      serviceTotal += lineTotal
      if (enabled) {
        lineItems.push({
          key: `service-${row.id}`,
          title: row.service_name,
          detail: '(included)',
          amount: lineTotal,
        })
      }
    })

    productRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'product', row.id)
      const units = Number(productUnits[`product-${row.id}`] || 0)
      const unitCost = Number(row.cost_per_unit || 0)
      const lineTotal = enabled ? units * unitCost : 0
      productTotal += lineTotal
      if (enabled && units > 0) {
        lineItems.push({
          key: `product-${row.id}`,
          title: row.product_name,
          detail: `(${units} ${row.unit || 'bag'})`,
          amount: lineTotal,
        })
      }
    })

    const subtotal = expertiseTotal + serviceTotal + productTotal
    const platformFee = 0
    const grandTotal = subtotal

    return {
      expertiseTotal,
      serviceTotal,
      productTotal,
      subtotal,
      platformFee,
      grandTotal,
      lineItems,
      itemCount: lineItems.length,
      hasSelection: grandTotal > 0,
      expertiseIncluded:
        skillExpertiseRows.some((row) => isItemEnabled(postId, 'skill', row.id)) ||
        newExpertiseRows.some((row) => isItemEnabled(postId, 'expertise', row.id)),
      servicesIncluded: serviceRows.some((row) => isItemEnabled(postId, 'service', row.id)),
      productsIncluded: productRows.some((row) => isItemEnabled(postId, 'product', row.id)),
    }
  }

  const getTotalForPost = (postId) => {
    return getBookingBreakdownForPost(postId).grandTotal
  }

  const getSupplierNoteForPost = (postId) => {
    if (Object.prototype.hasOwnProperty.call(supplierNotesByPost, postId)) {
      return supplierNotesByPost[postId]
    }

    const existingSnapshot = erpByPost[postId]?.configuration_snapshot || {}
    return (
      existingSnapshot?.notes?.supplier_note ||
      existingSnapshot?.supplier_note ||
      ''
    )
  }

  const buildConfigurationSnapshot = (post) => {
    const postId = post.id
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    const skillExpertise = skillExpertiseRows
      .map((row) => {
        if (!isItemEnabled(postId, 'skill', row.id)) return null
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
      .filter((row) => row && row.quantity > 0)

    const newExpertise = newExpertiseRows
      .map((row) => {
        if (!isItemEnabled(postId, 'expertise', row.id)) return null
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
      .filter((row) => row && row.quantity > 0 && row.duration > 0)

    const expertise = [...skillExpertise, ...newExpertise]

    const services = serviceRows
      .map((row) => {
        if (!isItemEnabled(postId, 'service', row.id)) return null
        const quantity = 1
        const unitCost = Number(row.cost_per_unit || 0)
        return {
          id: row.id,
          name: row.service_name,
          quantity,
          unit_cost: unitCost,
          line_total: quantity * unitCost,
        }
      })
      .filter((row) => row && row.quantity > 0)

    const products = productRows
      .map((row) => {
        if (!isItemEnabled(postId, 'product', row.id)) return null
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
      .filter((row) => row && row.quantity > 0)

    const expertiseTotal = expertise.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const serviceTotal = services.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const productTotal = products.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
    const subtotal = expertiseTotal + serviceTotal + productTotal
    const platform_fee = 0
    const grand = subtotal
    const supplier_note = String(getSupplierNoteForPost(postId) || '').trim()

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
      supplier_note,
      notes: {
        supplier_note,
      },
      totals: {
        expertise: expertiseTotal,
        services: serviceTotal,
        products: productTotal,
        subtotal,
        platform_fee,
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

  const CounterControl = ({ value, onChange, max, label, helperText }) => {
    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            {helperText ? <p className="text-xs text-slate-300">{helperText}</p> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange(Math.max(0, value - 1))}
              className="h-8 w-8 rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            >
              -
            </button>
            <div className="flex h-8 min-w-[44px] items-center justify-center rounded-md border border-white/25 bg-white/5 px-2 text-sm font-bold text-white">
              {value}
            </div>
            <button
              type="button"
              onClick={() => onChange(Math.min(max, value + 1))}
              className="h-8 w-8 rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>
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

  const BookingItemHeader = ({ icon, title, subtitle, priceText, priceUnitText, checked, onToggle }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className="flex cursor-pointer items-start justify-between gap-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/20 text-base leading-none shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{priceText}</p>
          {priceUnitText ? <p className="text-xs text-slate-300">{priceUnitText}</p> : null}
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
      </div>
    </div>
  )

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
                Following Post Details
              </h1>
              <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Defaults follow requested post details. Values can be reduced, but cannot exceed required limits.</p>
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
                const breakdown = getBookingBreakdownForPost(post.id)
                const postImageSrc = resolveMediaUrl(post.image || post.post_image || '')
                const hasExpertiseRows = (skillBreakdownByPost[post.id]?.expertise || []).length > 0 || (expertisesByPost[post.id] || []).length > 0
                const hasServiceRows = (skillBreakdownByPost[post.id]?.services || []).length > 0
                const hasProductRows = (productsByPost[post.id] || []).length > 0
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

                  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,960px)_320px] lg:justify-center lg:gap-5">
                    <div className="w-full space-y-5 p-5 sm:p-6">
                      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2.5 text-sm font-semibold text-blue-900">
                        ℹ️ Check only what you need - uncheck anything you want to skip.
                      </div>

                      {hasExpertiseRows && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Expertise</p>
                            <InclusionPill checked={breakdown.expertiseIncluded} />
                          </div>

                          {(skillBreakdownByPost[post.id]?.expertise || []).map((skill) => {
                            const workers = Number(skillWorkers[`skill-${skill.id}`] || 0)
                            const enabled = isItemEnabled(post.id, 'skill', skill.id)
                            const subtotal = enabled ? workers * Number(skill.cost_per_unit || 0) : 0
                            return (
                              <div
                                key={`skill-${skill.id}`}
                                className={`rounded-xl border border-violet-300/50 bg-gradient-to-br from-[#1b2254] via-[#2a225d] to-[#121735] p-4 shadow-lg transition ${
                                  enabled ? 'opacity-100' : 'opacity-50'
                                }`}
                              >
                                <BookingItemHeader
                                  icon="🧑‍💼"
                                  title={skill.skill_name}
                                  subtitle="Skilled professional"
                                  priceText={`৳ ${Number(skill.cost_per_unit || 0).toFixed(0)}`}
                                  priceUnitText={`per ${formatRateUnit(skill.unit).toLowerCase()}`}
                                  checked={enabled}
                                  onToggle={() =>
                                    toggleItemEnabled(post.id, 'skill', skill.id, () => {
                                      setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: 0 }))
                                    })
                                  }
                                />

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    <CounterControl
                                      value={workers}
                                      onChange={(val) => setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: val }))}
                                      max={Math.max(Number(skill.available_workers || 0), 1)}
                                      label="People required"
                                      helperText={`${Number(skill.available_workers || 0)} professionals available`}
                                    />

                                    <div className="flex items-center justify-between border-t border-white/15 pt-2">
                                      <span className="text-xs text-slate-300">Expertise subtotal</span>
                                      <span className="text-sm font-bold text-white">৳ {subtotal.toFixed(0)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {(expertisesByPost[post.id] || []).map((expertise) => {
                            const persons = Number(expertisePersons[`expertise-${expertise.id}`] || 0)
                            const duration = Number(expertiseDurations[`expertise-${expertise.id}-duration`] || 0)
                            const enabled = isItemEnabled(post.id, 'expertise', expertise.id)
                            const subtotal = enabled ? persons * duration * Number(expertise.cost || 0) : 0
                            return (
                              <div
                                key={`expertise-${expertise.id}`}
                                className={`rounded-xl border border-violet-300/50 bg-gradient-to-br from-[#1b2254] via-[#2a225d] to-[#121735] p-4 shadow-lg transition ${
                                  enabled ? 'opacity-100' : 'opacity-50'
                                }`}
                              >
                                <BookingItemHeader
                                  icon="🧑‍💼"
                                  title={expertise.name}
                                  subtitle="Skilled professional"
                                  priceText={`৳ ${Number(expertise.cost || 0).toFixed(0)}`}
                                  priceUnitText={`per ${formatRateUnit(expertise.unit).toLowerCase()}`}
                                  checked={enabled}
                                  onToggle={() =>
                                    toggleItemEnabled(post.id, 'expertise', expertise.id, () => {
                                      setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: 0 }))
                                      setExpertiseDurations((prev) => ({ ...prev, [`expertise-${expertise.id}-duration`]: 0 }))
                                    })
                                  }
                                />

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    <CounterControl
                                      value={persons}
                                      onChange={(val) => setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: val }))}
                                      max={Math.max(Number(expertise.available_person || 0), 1)}
                                      label="People required"
                                      helperText={`${Number(expertise.available_person || 0)} professionals available`}
                                    />
                                    <CounterControl
                                      value={duration}
                                      onChange={(val) => setExpertiseDurations((prev) => ({ ...prev, [`expertise-${expertise.id}-duration`]: val }))}
                                      max={365}
                                      label="Duration (hours)"
                                      helperText="Total hours needed"
                                    />

                                    <div className="flex items-center justify-between border-t border-white/15 pt-2">
                                      <span className="text-xs text-slate-300">Expertise subtotal</span>
                                      <span className="text-sm font-bold text-white">৳ {subtotal.toFixed(0)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </section>
                      )}

                      {hasServiceRows && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Service</p>
                            <InclusionPill checked={breakdown.servicesIncluded} />
                          </div>

                          {(skillBreakdownByPost[post.id]?.services || []).map((service) => {
                            const enabled = isItemEnabled(post.id, 'service', service.id)
                            const subtotal = enabled ? Number(service.cost_per_unit || 0) : 0
                            return (
                              <div
                                key={`service-${service.id}`}
                                className={`rounded-xl border border-violet-300/50 bg-gradient-to-br from-[#1b2254] via-[#2a225d] to-[#121735] p-4 shadow-lg transition ${
                                  enabled ? 'opacity-100' : 'opacity-50'
                                }`}
                              >
                                <BookingItemHeader
                                  icon="🛠️"
                                  title={service.service_name}
                                  subtitle="Full service"
                                  priceText={`৳ ${Number(service.cost_per_unit || 0).toFixed(0)}`}
                                  priceUnitText={`per ${formatRateUnit(service.unit).toLowerCase()}`}
                                  checked={enabled}
                                  onToggle={() => toggleItemEnabled(post.id, 'service', service.id)}
                                />

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                                      Included: Yes (binary selection)
                                    </p>

                                    <div className="flex items-center justify-between border-t border-white/15 pt-2">
                                      <span className="text-xs text-slate-300">Service subtotal</span>
                                      <span className="text-sm font-bold text-white">৳ {subtotal.toFixed(0)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </section>
                      )}

                      {hasProductRows && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Product</p>
                            <InclusionPill checked={breakdown.productsIncluded} />
                          </div>

                          {(productsByPost[post.id] || []).map((product) => {
                            const units = Number(productUnits[`product-${product.id}`] || 0)
                            const availableUnits = Math.max(Number(product.available_units || 0), 0)
                            const enabled = isItemEnabled(post.id, 'product', product.id)
                            const subtotal = enabled ? units * Number(product.cost_per_unit || 0) : 0
                            return (
                              <div
                                key={`product-${product.id}`}
                                className={`rounded-xl border border-violet-300/50 bg-gradient-to-br from-[#1b2254] via-[#2a225d] to-[#121725] p-4 shadow-lg transition ${
                                  enabled ? 'opacity-100' : 'opacity-50'
                                }`}
                              >
                                <BookingItemHeader
                                  icon="📦"
                                  title={product.product_name}
                                  subtitle="Premium quality"
                                  priceText={`৳ ${Number(product.cost_per_unit || 0).toFixed(0)}`}
                                  priceUnitText={`per ${String(product.unit || 'unit').toLowerCase()}`}
                                  checked={enabled}
                                  onToggle={() =>
                                    toggleItemEnabled(post.id, 'product', product.id, () => {
                                      setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: 0 }))
                                    })
                                  }
                                />

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    <CounterControl
                                      value={units}
                                      onChange={(val) => setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: val }))}
                                      max={availableUnits}
                                      label="Quantity (bags)"
                                      helperText={`Maximum ${availableUnits} available`}
                                    />

                                    <div className="flex items-center justify-between border-t border-white/15 pt-2">
                                      <span className="text-xs text-slate-300">Product subtotal</span>
                                      <span className="text-sm font-bold text-white">৳ {subtotal.toFixed(0)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </section>
                      )}

                      <div className="rounded-xl border border-slate-300 bg-white/80 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">Notes for supplier</p>
                        <textarea
                          rows={3}
                          placeholder="Any special requirements, access instructions, or preferred working hours..."
                          value={getSupplierNoteForPost(post.id)}
                          onChange={(event) =>
                            setSupplierNotesByPost((prev) => ({
                              ...prev,
                              [post.id]: event.target.value,
                            }))
                          }
                          className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300"
                        />
                      </div>
                    </div>

                    <div className="w-full border-t border-slate-200 p-5 sm:p-6 lg:sticky lg:top-6 lg:h-fit lg:self-start lg:border-l lg:border-t-0">
                      <div className="w-full rounded-xl border border-slate-300/70 bg-transparent p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="whitespace-nowrap text-lg font-bold text-slate-800">Booking Summary</h4>
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            {breakdown.itemCount} items
                          </span>
                        </div>

                        <div className="mt-4 max-h-44 space-y-2 overflow-y-auto border-y border-slate-200 py-3">
                          {breakdown.lineItems.length === 0 ? (
                            <div className="text-center text-slate-500">
                              <p className="mb-1 text-lg">👜</p>
                              <p className="text-sm">Add items to begin</p>
                            </div>
                          ) : (
                            breakdown.lineItems.map((item) => (
                              <div key={item.key} className="flex items-start justify-between gap-3 text-sm">
                                <div>
                                  <p className="text-slate-700">{item.title}</p>
                                  {item.detail ? <p className="text-xs text-slate-500">{item.detail}</p> : null}
                                </div>
                                <span className="font-semibold text-slate-800">৳ {Number(item.amount || 0).toFixed(0)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-slate-900">Total</span>
                            <span className="text-2xl font-extrabold text-violet-700">৳ {breakdown.grandTotal.toFixed(0)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Booking confirmed once supplier accepts. No charge until then.</p>
                        </div>

                        <button
                          onClick={() => handleCreateOrUpdateErp(post)}
                          disabled={breakdown.grandTotal <= 0}
                          className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                            breakdown.grandTotal > 0
                              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700'
                              : 'cursor-not-allowed bg-slate-300 text-slate-500'
                          }`}
                        >
                          Request booking ↗
                        </button>

                        <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
                          <p>• Secure booking</p>
                          <p>• No charge until accepted</p>
                        </div>
                      </div>
                    </div>
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
