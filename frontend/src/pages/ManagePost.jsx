import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

export default function ManagePost() {
  const { id } = useParams()
  const location = useLocation()
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
  const [applicationValues, setApplicationValues] = useState({})
  const [applicationServiceNotes, setApplicationServiceNotes] = useState({})
  const [applicationNotesByPost, setApplicationNotesByPost] = useState({})
  const [submittingApplicationPostId, setSubmittingApplicationPostId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const forcedActionType = String(location.state?.actionType || '').trim().toLowerCase()

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

  const getDurationLabel = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'Duration (hours)'
    if (normalized === 'daily') return 'Duration (days)'
    if (normalized === 'monthly') return 'Duration (months)'
    return 'Duration'
  }

  const getDurationHelperText = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'Total hours needed'
    if (normalized === 'daily') return 'Total days needed'
    if (normalized === 'monthly') return 'Total months needed'
    return 'Total duration needed'
  }

  const getQuantityLabel = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized.includes('bag')) return 'Quantity (bags)'
    if (normalized.includes('box')) return 'Quantity (boxes)'
    if (normalized.includes('pack')) return 'Quantity (packs)'
    if (normalized.includes('bottle') || normalized.includes('liter')) return 'Quantity (bottles)'
    if (normalized.includes('kg') || normalized.includes('kilogram')) return 'Quantity (kg)'
    if (normalized.includes('piece') || normalized.includes('unit')) return 'Quantity (pieces)'
    if (!normalized) return 'Quantity'
    return `Quantity (${normalized})`
  }

  const getActionModeForPost = (post) => {
    if (forcedActionType === 'apply' || forcedActionType === 'book') {
      return forcedActionType
    }
    return String(post?.post_type || '').toLowerCase() === 'demand' ? 'apply' : 'book'
  }

  const getApplicationValue = (key, fallback = 0) => {
    if (Object.prototype.hasOwnProperty.call(applicationValues, key)) {
      return Number(applicationValues[key] || 0)
    }
    return Number(fallback || 0)
  }

  const setApplicationValue = (key, nextValue, maxValue) => {
    const max = Number.isFinite(Number(maxValue)) ? Number(maxValue) : Number.MAX_SAFE_INTEGER
    const safe = Math.max(0, Math.min(max, Number(nextValue || 0)))
    setApplicationValues((prev) => ({ ...prev, [key]: safe }))
  }

  const getNegotiationBadge = (offered, requested) => {
    const offeredValue = Number(offered || 0)
    const requestedValue = Number(requested || 0)
    if (offeredValue < requestedValue) {
      return { text: 'LOWER', icon: '↓', className: 'border-emerald-300 bg-emerald-500/15 text-emerald-100' }
    }
    if (offeredValue > requestedValue) {
      return { text: 'HIGHER', icon: '↑', className: 'border-rose-300 bg-rose-500/15 text-rose-100' }
    }
    return { text: 'BUDGET', icon: '=', className: 'border-amber-300 bg-amber-500/15 text-amber-100' }
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
      const selectedPostId = Number(id)
      const hasSelectedPostId = Number.isFinite(selectedPostId) && selectedPostId > 0
      const manageablePosts = (allPostRes.data || []).filter((post) => {
        if (manageableIds.has(post.id)) return true
        if (hasSelectedPostId && Number(post.id) === selectedPostId) return true
        return false
      })

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
  }, [id, showMessage])

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
    const post = posts.find((item) => item.id === postId)
    const postType = post?.post_type || ''
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
      const workers = getSkillWorkersValue(postType, row)
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
      const persons = getExpertisePersonsValue(postType, row)
      const duration = getExpertiseDurationValue(postType, row)
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
      const units = getProductUnitsValue(postType, row)
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

  const getApplicationNoteForPost = (postId) => {
    if (Object.prototype.hasOwnProperty.call(applicationNotesByPost, postId)) {
      return applicationNotesByPost[postId]
    }
    const existingSnapshot = erpByPost[postId]?.configuration_snapshot || {}
    return existingSnapshot?.notes?.requester_note || existingSnapshot?.requester_note || ''
  }

  const getApplicationServiceNote = (postId, serviceId) => {
    const key = `${postId}-service-${serviceId}`
    return String(applicationServiceNotes[key] || '')
  }

  const getApplicationBreakdownForPost = (postId) => {
    const post = posts.find((item) => item.id === postId)
    const postType = post?.post_type || ''
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    const lineItems = []
    const validationErrors = []
    let expertiseTotal = 0
    let serviceTotal = 0
    let productTotal = 0

    skillExpertiseRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'skill', row.id)
      const peopleMax = Math.max(Number(row.available_workers || 0), 0)
      const people = getApplicationValue(`apply-skill-${row.id}-people`, peopleMax)
      const hours = getApplicationValue(`apply-skill-${row.id}-hours`, 0)
      const requestedRate = Number(row.cost_per_unit || 0)
      const offeredRate = getApplicationValue(`apply-skill-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? people * hours * offeredRate : 0
      if (enabled) expertiseTotal += lineTotal

      if (enabled && people > 0 && hours > 0 && offeredRate <= 0) {
        validationErrors.push(`${row.skill_name}: add your hourly offer rate.`)
      }

      lineItems.push({
        key: `apply-skill-${row.id}`,
        title: row.skill_name,
        detail: `(${people} person x ${hours} hr)` ,
        amount: lineTotal,
        included: enabled,
      })
    })

    newExpertiseRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'expertise', row.id)
      const peopleMax = Math.max(Number(row.available_person || 0), 0)
      const people = getApplicationValue(`apply-expertise-${row.id}-people`, peopleMax)
      const hoursMax = Math.max(Number(row.needed_budget_unit || 0), 0)
      const hours = getApplicationValue(`apply-expertise-${row.id}-hours`, hoursMax)
      const requestedRate = Number(row.cost || 0)
      const offeredRate = getApplicationValue(`apply-expertise-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? people * hours * offeredRate : 0
      if (enabled) expertiseTotal += lineTotal

      if (enabled && people > 0 && hours > 0 && offeredRate <= 0) {
        validationErrors.push(`${row.name}: add your hourly offer rate.`)
      }

      lineItems.push({
        key: `apply-expertise-${row.id}`,
        title: row.name,
        detail: `(${people} person x ${hours} hr)`,
        amount: lineTotal,
        included: enabled,
      })
    })

    serviceRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'service', row.id)
      const requestedRate = Number(row.cost_per_unit || 0)
      const offeredRate = getApplicationValue(`apply-service-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? offeredRate : 0
      const note = getApplicationServiceNote(postId, row.id)
      if (enabled) serviceTotal += lineTotal
      if (enabled && offeredRate <= 0) {
        validationErrors.push(`${row.service_name}: add your service charge.`)
      }
      if (enabled && !String(note || '').trim()) {
        validationErrors.push(`${row.service_name}: delivery description is required.`)
      }

      lineItems.push({
        key: `apply-service-${row.id}`,
        title: row.service_name,
        detail: enabled ? '(willing to provide)' : '(not offering)',
        amount: lineTotal,
        included: enabled,
      })
    })

    productRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'product', row.id)
      const quantityMax = Math.max(Number(row.available_units || 0), 0)
      const quantity = getApplicationValue(`apply-product-${row.id}-quantity`, quantityMax)
      const requestedRate = Number(row.cost_per_unit || 0)
      const offeredRate = getApplicationValue(`apply-product-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? quantity * offeredRate : 0
      if (enabled) productTotal += lineTotal
      if (enabled && quantity > 0 && offeredRate <= 0) {
        validationErrors.push(`${row.product_name}: add your unit offer rate.`)
      }

      lineItems.push({
        key: `apply-product-${row.id}`,
        title: row.product_name,
        detail: `(${quantity} ${row.unit || 'unit'})`,
        amount: lineTotal,
        included: enabled,
      })
    })

    const subtotal = expertiseTotal + serviceTotal + productTotal
    const includedCount = lineItems.filter((item) => item.included).length

    return {
      expertiseTotal,
      serviceTotal,
      productTotal,
      grandTotal: subtotal,
      lineItems,
      itemCount: includedCount,
      hasSelection: includedCount > 0,
      validationErrors,
      expertiseIncluded:
        skillExpertiseRows.some((row) => isItemEnabled(postId, 'skill', row.id)) ||
        newExpertiseRows.some((row) => isItemEnabled(postId, 'expertise', row.id)),
      servicesIncluded: serviceRows.some((row) => isItemEnabled(postId, 'service', row.id)),
      productsIncluded: productRows.some((row) => isItemEnabled(postId, 'product', row.id)),
      postType,
    }
  }

  const buildApplicationSnapshot = (post) => {
    const postId = post.id
    const skillExpertiseRows = skillBreakdownByPost[postId]?.expertise || []
    const serviceRows = skillBreakdownByPost[postId]?.services || []
    const newExpertiseRows = expertisesByPost[postId] || []
    const productRows = productsByPost[postId] || []

    const expertise = [
      ...skillExpertiseRows.map((row) => {
        const peopleMax = Math.max(Number(row.available_workers || 0), 0)
        const hoursMax = Math.max(Number(row.needed_budget_unit || 0), 0)
        const requestedRate = Number(row.cost_per_unit || 0)
        const quantity = getApplicationValue(`apply-skill-${row.id}-people`, peopleMax)
        const duration = getApplicationValue(`apply-skill-${row.id}-hours`, 0)
        const offeredRate = getApplicationValue(`apply-skill-${row.id}-rate`, requestedRate)
        const enabled = isItemEnabled(postId, 'skill', row.id)

        return {
          id: row.id,
          source: 'skill',
          name: row.skill_name,
          unit: row.unit,
          included: enabled,
          requested_people: peopleMax,
          requested_hours: hoursMax,
          requested_rate: requestedRate,
          offered_people: quantity,
          offered_hours: duration,
          offered_rate: offeredRate,
          line_total: enabled ? quantity * duration * offeredRate : 0,
        }
      }),
      ...newExpertiseRows.map((row) => {
        const peopleMax = Math.max(Number(row.available_person || 0), 0)
        const hoursMax = Math.max(Number(row.needed_budget_unit || 0), 0)
        const requestedRate = Number(row.cost || 0)
        const quantity = getApplicationValue(`apply-expertise-${row.id}-people`, peopleMax)
        const duration = getApplicationValue(`apply-expertise-${row.id}-hours`, hoursMax)
        const offeredRate = getApplicationValue(`apply-expertise-${row.id}-rate`, requestedRate)
        const enabled = isItemEnabled(postId, 'expertise', row.id)

        return {
          id: row.id,
          source: 'expertise',
          name: row.name,
          unit: row.unit,
          included: enabled,
          requested_people: peopleMax,
          requested_hours: hoursMax,
          requested_rate: requestedRate,
          offered_people: quantity,
          offered_hours: duration,
          offered_rate: offeredRate,
          line_total: enabled ? quantity * duration * offeredRate : 0,
        }
      }),
    ]

    const services = serviceRows.map((row) => {
      const requestedRate = Number(row.cost_per_unit || 0)
      const offeredRate = getApplicationValue(`apply-service-${row.id}-rate`, requestedRate)
      const enabled = isItemEnabled(postId, 'service', row.id)
      return {
        id: row.id,
        name: row.service_name,
        included: enabled,
        requested_rate: requestedRate,
        offered_rate: offeredRate,
        line_total: enabled ? offeredRate : 0,
        delivery_description: getApplicationServiceNote(postId, row.id),
      }
    })

    const products = productRows.map((row) => {
      const quantityMax = Math.max(Number(row.available_units || 0), 0)
      const requestedRate = Number(row.cost_per_unit || 0)
      const quantity = getApplicationValue(`apply-product-${row.id}-quantity`, quantityMax)
      const offeredRate = getApplicationValue(`apply-product-${row.id}-rate`, requestedRate)
      const enabled = isItemEnabled(postId, 'product', row.id)
      return {
        id: row.id,
        name: row.product_name,
        unit: row.unit,
        included: enabled,
        requested_quantity: quantityMax,
        requested_rate: requestedRate,
        offered_quantity: quantity,
        offered_rate: offeredRate,
        line_total: enabled ? quantity * offeredRate : 0,
      }
    })

    const breakdown = getApplicationBreakdownForPost(postId)
    const requester_note = String(getApplicationNoteForPost(postId) || '').trim()

    return {
      generated_at: new Date().toISOString(),
      proposal_mode: 'application',
      post: {
        id: post.id,
        title: post.post_title || '',
        name: post.post_name || '',
        type: post.post_type || '',
        owner_id: post.owner_id || null,
      },
      expertise,
      services,
      products,
      requester_note,
      notes: {
        requester_note,
      },
      totals: {
        expertise: breakdown.expertiseTotal,
        services: breakdown.serviceTotal,
        products: breakdown.productTotal,
        grand: breakdown.grandTotal,
      },
      application_submission: {
        submitted_by: null,
        submitted_at: null,
        status: 'draft',
      },
    }
  }

  const handleSubmitApplication = async (post) => {
    const breakdown = getApplicationBreakdownForPost(post.id)
    if (!breakdown.hasSelection) {
      showMessage('Select at least one item before submitting your application.', 'error')
      return
    }
    if (breakdown.validationErrors.length > 0) {
      showMessage(breakdown.validationErrors[0], 'error')
      return
    }

    const snapshot = buildApplicationSnapshot(post)
    setSubmittingApplicationPostId(post.id)

    try {
      const existing = erpByPost[post.id]
      let erpRecord = existing

      if (existing) {
        const { data } = await api.patch(`/erp/${existing.id}/`, {
          total_cost: Number(snapshot.totals?.grand || 0),
          configuration_snapshot: snapshot,
          is_configured: false,
        })
        erpRecord = data
        setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      } else {
        const payload = {
          post: post.id,
          total_cost: Number(snapshot.totals?.grand || 0),
          configuration_snapshot: snapshot,
          is_configured: false,
        }
        const { data } = await api.post('/erp/', payload)
        erpRecord = data
        setErpItems((prev) => [...prev, data])
      }

      await api.post(`/erp/${erpRecord.id}/submit_application/`, {
        note: getApplicationNoteForPost(post.id),
      })

      window.dispatchEvent(new Event('localix:notifications-refresh'))
      showMessage('Your application was submitted successfully. Please wait for acceptance.', 'success')
      setTimeout(() => {
        navigate('/feed')
      }, 500)
    } catch (error) {
      console.error(error)
      const statusCode = error?.response?.status
      const detail = error?.response?.data
      if (statusCode === 404) {
        showMessage('Failed submission: application submit endpoint not found. Please restart backend.', 'error')
      } else if (statusCode === 403) {
        showMessage('Failed submission: you are not allowed to submit this application.', 'error')
      } else if (statusCode === 400 && detail) {
        const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
        showMessage(`Failed submission: ${text}`, 'error')
      } else {
        showMessage('Failed submission due to a server/network error. Please try again.', 'error')
      }
    } finally {
      setSubmittingApplicationPostId(null)
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
        if (!isItemEnabled(postId, 'skill', row.id)) return null
        const quantity = getSkillWorkersValue(post.post_type, row)
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
        const quantity = getExpertisePersonsValue(post.post_type, row)
        const duration = getExpertiseDurationValue(post.post_type, row)
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
        const quantity = getProductUnitsValue(post.post_type, row)
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

  const OfferRateInput = ({ value, onChange, requestedRate, label, helperText, unitLabel = 'hr' }) => {
    const badge = getNegotiationBadge(value, requestedRate)

    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-slate-300">{helperText}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2">
          <span className="text-sm font-semibold text-white">৳</span>
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) => onChange(Number(event.target.value || 0))}
            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-300"
            placeholder="0"
          />
          <span className="text-xs text-slate-300">/{unitLabel}</span>
        </div>
      </div>
    )
  }

  const InclusionPill = ({ checked, mode = 'book' }) => (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        checked
          ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
          : 'border-slate-300 bg-slate-100 text-slate-600'
      }`}
    >
      {mode === 'apply' ? (checked ? 'Included in application' : 'Not offering') : (checked ? 'Included in booking' : 'Not included')}
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

  const getSkillWorkersValue = (postType, row) => {
    const key = `skill-${row.id}`
    if (Object.prototype.hasOwnProperty.call(skillWorkers, key)) {
      return Number(skillWorkers[key] || 0)
    }
    return postType === 'Demand' ? Math.max(Number(row.available_workers || 0), 0) : 0
  }

  const getExpertisePersonsValue = (postType, row) => {
    const key = `expertise-${row.id}`
    if (Object.prototype.hasOwnProperty.call(expertisePersons, key)) {
      return Number(expertisePersons[key] || 0)
    }
    return postType === 'Demand' ? Math.max(Number(row.available_person || 0), 0) : 0
  }

  const getExpertiseDurationValue = (postType, row) => {
    const key = `expertise-${row.id}-duration`
    if (Object.prototype.hasOwnProperty.call(expertiseDurations, key)) {
      return Number(expertiseDurations[key] || 0)
    }
    return postType === 'Demand' ? Math.max(Number(row.needed_budget_unit || 0), 0) : 0
  }

  const getProductUnitsValue = (postType, row) => {
    const key = `product-${row.id}`
    if (Object.prototype.hasOwnProperty.call(productUnits, key)) {
      return Number(productUnits[key] || 0)
    }
    return postType === 'Demand' ? Math.max(Number(row.available_units || 0), 0) : 0
  }

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
                const isApplyMode = getActionModeForPost(post) === 'apply'
                const breakdown = isApplyMode ? getApplicationBreakdownForPost(post.id) : getBookingBreakdownForPost(post.id)
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
                        {isApplyMode
                          ? 'Select the categories you can fulfill and submit your offer details.'
                          : 'Check only what you need - uncheck anything you want to skip.'}
                      </div>

                      {hasExpertiseRows && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Expertise</p>
                            <InclusionPill checked={breakdown.expertiseIncluded} mode={isApplyMode ? 'apply' : 'book'} />
                          </div>

                          {(skillBreakdownByPost[post.id]?.expertise || []).map((skill) => {
                            const workers = getSkillWorkersValue(post.post_type, skill)
                            const workersMax = post.post_type === 'Demand'
                              ? Math.max(Number(skill.available_workers || 0), 0)
                              : Math.max(Number(skill.available_workers || 0), 1)
                            const enabled = isItemEnabled(post.id, 'skill', skill.id)
                            const requestedRate = Number(skill.cost_per_unit || 0)
                            const applyPeopleKey = `apply-skill-${skill.id}-people`
                            const applyHoursKey = `apply-skill-${skill.id}-hours`
                            const applyRateKey = `apply-skill-${skill.id}-rate`
                            const applyHoursMax = Math.max(Number(skill.needed_budget_unit || 0), 0)
                            const applyPeople = getApplicationValue(applyPeopleKey, workersMax)
                            const applyHours = getApplicationValue(applyHoursKey, applyHoursMax)
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const subtotal = isApplyMode
                              ? (enabled ? applyPeople * applyHours * applyRate : 0)
                              : (enabled ? workers * Number(skill.cost_per_unit || 0) : 0)
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
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyPeople}
                                          onChange={(val) => setApplicationValue(applyPeopleKey, val, workersMax)}
                                          max={workersMax}
                                          label="People you'll provide"
                                          helperText={`Max ${workersMax} person (as requested)`}
                                        />
                                        <CounterControl
                                          value={applyHours}
                                          onChange={(val) => setApplicationValue(applyHoursKey, val, applyHoursMax)}
                                          max={applyHoursMax}
                                          label="Hours you'll work"
                                          helperText={`Max ${applyHoursMax} hrs (as requested)`}
                                        />
                                        <OfferRateInput
                                          value={applyRate}
                                          onChange={(val) => setApplicationValue(applyRateKey, val)}
                                          requestedRate={requestedRate}
                                          label="Your rate per hour"
                                          helperText={`Requester budget: ৳${requestedRate.toFixed(0)}/hr`}
                                          unitLabel="hr"
                                        />
                                      </>
                                    ) : (
                                      <CounterControl
                                        value={workers}
                                        onChange={(val) => setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: val }))}
                                        max={workersMax}
                                        label="People required"
                                        helperText={post.post_type === 'Demand' ? `${Number(skill.available_workers || 0)} required in post details` : `${Number(skill.available_workers || 0)} professionals available`}
                                      />
                                    )}

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
                            const persons = getExpertisePersonsValue(post.post_type, expertise)
                            const duration = getExpertiseDurationValue(post.post_type, expertise)
                            const personsMax = post.post_type === 'Demand'
                              ? Math.max(Number(expertise.available_person || 0), 0)
                              : Math.max(Number(expertise.available_person || 0), 1)
                            const durationMax = post.post_type === 'Demand'
                              ? Math.max(Number(expertise.needed_budget_unit || 0), 0)
                              : 365
                            const enabled = isItemEnabled(post.id, 'expertise', expertise.id)
                            const requestedRate = Number(expertise.cost || 0)
                            const applyPeopleKey = `apply-expertise-${expertise.id}-people`
                            const applyHoursKey = `apply-expertise-${expertise.id}-hours`
                            const applyRateKey = `apply-expertise-${expertise.id}-rate`
                            const applyPeople = getApplicationValue(applyPeopleKey, personsMax)
                            const applyHours = getApplicationValue(applyHoursKey, durationMax)
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const subtotal = isApplyMode
                              ? (enabled ? applyPeople * applyHours * applyRate : 0)
                              : (enabled ? persons * duration * Number(expertise.cost || 0) : 0)
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
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyPeople}
                                          onChange={(val) => setApplicationValue(applyPeopleKey, val, personsMax)}
                                          max={personsMax}
                                          label="People you'll provide"
                                          helperText={`Max ${personsMax} person (as requested)`}
                                        />
                                        <CounterControl
                                          value={applyHours}
                                          onChange={(val) => setApplicationValue(applyHoursKey, val, durationMax)}
                                          max={durationMax}
                                          label="Hours you'll work"
                                          helperText={`Max ${durationMax} hrs (as requested)`}
                                        />
                                        <OfferRateInput
                                          value={applyRate}
                                          onChange={(val) => setApplicationValue(applyRateKey, val)}
                                          requestedRate={requestedRate}
                                          label="Your rate per hour"
                                          helperText={`Requester budget: ৳${requestedRate.toFixed(0)}/hr`}
                                          unitLabel="hr"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <CounterControl
                                          value={persons}
                                          onChange={(val) => setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: val }))}
                                          max={personsMax}
                                          label="People required"
                                          helperText={post.post_type === 'Demand' ? `${Number(expertise.available_person || 0)} required in post details` : `${Number(expertise.available_person || 0)} professionals available`}
                                        />
                                        <CounterControl
                                          value={duration}
                                          onChange={(val) => setExpertiseDurations((prev) => ({ ...prev, [`expertise-${expertise.id}-duration`]: val }))}
                                          max={durationMax}
                                          label={post.post_type === 'Demand' ? 'Needed hire unit' : getDurationLabel(expertise.unit)}
                                          helperText={post.post_type === 'Demand' ? `${Number(expertise.needed_budget_unit || 0)} required in post details` : getDurationHelperText(expertise.unit)}
                                        />
                                      </>
                                    )}

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
                            <InclusionPill checked={breakdown.servicesIncluded} mode={isApplyMode ? 'apply' : 'book'} />
                          </div>

                          {(skillBreakdownByPost[post.id]?.services || []).map((service) => {
                            const enabled = isItemEnabled(post.id, 'service', service.id)
                            const requestedRate = Number(service.cost_per_unit || 0)
                            const applyRateKey = `apply-service-${service.id}-rate`
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const subtotal = isApplyMode
                              ? (enabled ? applyRate : 0)
                              : (enabled ? Number(service.cost_per_unit || 0) : 0)
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

                                {isApplyMode && !enabled && (
                                  <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                    ✕ You are not offering this service in this application
                                  </div>
                                )}

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    {isApplyMode ? (
                                      <>
                                        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                                          <p className="text-xs text-emerald-100">✓ You are willing to provide this service</p>
                                        </div>
                                        <OfferRateInput
                                          value={applyRate}
                                          onChange={(val) => setApplicationValue(applyRateKey, val)}
                                          requestedRate={requestedRate}
                                          label="Your service charge"
                                          helperText={`Requester budget: ৳${requestedRate.toFixed(0)}`}
                                          unitLabel={String(service.unit || 'service').toLowerCase()}
                                        />
                                        <div>
                                          <p className="mb-1 text-xs font-semibold text-slate-200">Delivery description</p>
                                          <textarea
                                            rows={3}
                                            value={getApplicationServiceNote(post.id, service.id)}
                                            onChange={(event) => {
                                              const key = `${post.id}-service-${service.id}`
                                              setApplicationServiceNotes((prev) => ({
                                                ...prev,
                                                [key]: event.target.value,
                                              }))
                                            }}
                                            placeholder="Describe process, tools, timeline, and delivery details..."
                                            className="w-full resize-none rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-300 focus:border-violet-300 focus:ring-1 focus:ring-violet-300"
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2">
                                        <p className="text-xs text-blue-100">
                                          ✓ This service is included in your booking
                                        </p>
                                      </div>
                                    )}

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
                            <InclusionPill checked={breakdown.productsIncluded} mode={isApplyMode ? 'apply' : 'book'} />
                          </div>

                          {(productsByPost[post.id] || []).map((product) => {
                            const units = getProductUnitsValue(post.post_type, product)
                            const availableUnits = Math.max(Number(product.available_units || 0), 0)
                            const unitsMax = post.post_type === 'Demand' ? availableUnits : availableUnits
                            const enabled = isItemEnabled(post.id, 'product', product.id)
                            const requestedRate = Number(product.cost_per_unit || 0)
                            const applyQuantityKey = `apply-product-${product.id}-quantity`
                            const applyRateKey = `apply-product-${product.id}-rate`
                            const applyQuantity = getApplicationValue(applyQuantityKey, unitsMax)
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const subtotal = isApplyMode
                              ? (enabled ? applyQuantity * applyRate : 0)
                              : (enabled ? units * Number(product.cost_per_unit || 0) : 0)
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
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyQuantity}
                                          onChange={(val) => setApplicationValue(applyQuantityKey, val, unitsMax)}
                                          max={unitsMax}
                                          label="Quantity you can supply"
                                          helperText={`Max ${availableUnits} unit (as requested)`}
                                        />
                                        <OfferRateInput
                                          value={applyRate}
                                          onChange={(val) => setApplicationValue(applyRateKey, val)}
                                          requestedRate={requestedRate}
                                          label="Your price per unit"
                                          helperText={`Requester budget: ৳${requestedRate.toFixed(0)}/${String(product.unit || 'unit').toLowerCase()}`}
                                          unitLabel={String(product.unit || 'unit').toLowerCase()}
                                        />
                                      </>
                                    ) : (
                                      <CounterControl
                                        value={units}
                                        onChange={(val) => setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: val }))}
                                        max={unitsMax}
                                        label={getQuantityLabel(product.unit)}
                                        helperText={post.post_type === 'Demand' ? `${availableUnits} required in post details (cannot exceed)` : `Maximum ${availableUnits} available`}
                                      />
                                    )}

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
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                          {isApplyMode ? 'Notes for requester' : 'Notes for supplier'}
                        </p>
                        <textarea
                          rows={3}
                          placeholder={isApplyMode ? 'Add any questions, delivery assumptions, or extra details for the requester...' : 'Any special requirements, access instructions, or preferred working hours...'}
                          value={isApplyMode ? getApplicationNoteForPost(post.id) : getSupplierNoteForPost(post.id)}
                          onChange={(event) =>
                            isApplyMode
                              ? setApplicationNotesByPost((prev) => ({
                                  ...prev,
                                  [post.id]: event.target.value,
                                }))
                              : setSupplierNotesByPost((prev) => ({
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
                          <h4 className="whitespace-nowrap text-lg font-bold text-slate-800">{isApplyMode ? 'Application Summary' : 'Booking Summary'}</h4>
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
                                  <p className={isApplyMode && item.included === false ? 'text-slate-500 line-through' : 'text-slate-700'}>{item.title}</p>
                                  {item.detail ? <p className="text-xs text-slate-500">{item.detail}</p> : null}
                                </div>
                                <span className={isApplyMode && item.included === false ? 'font-semibold text-slate-400 line-through' : 'font-semibold text-slate-800'}>৳ {Number(item.amount || 0).toFixed(0)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-slate-900">Total</span>
                            <span className="text-2xl font-extrabold text-violet-700">৳ {breakdown.grandTotal.toFixed(0)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {isApplyMode
                              ? 'Your application is sent to the requester for review and acceptance.'
                              : 'Booking confirmed once supplier accepts. No charge until then.'}
                          </p>
                        </div>

                        <button
                          onClick={() => (isApplyMode ? handleSubmitApplication(post) : handleCreateOrUpdateErp(post))}
                          disabled={isApplyMode ? breakdown.itemCount <= 0 || submittingApplicationPostId === post.id : breakdown.grandTotal <= 0}
                          className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                            (isApplyMode ? breakdown.itemCount > 0 : breakdown.grandTotal > 0)
                              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700'
                              : 'cursor-not-allowed bg-slate-300 text-slate-500'
                          }`}
                        >
                          {isApplyMode
                            ? (submittingApplicationPostId === post.id ? 'Submitting application...' : 'Submit application ↗')
                            : 'Request booking ↗'}
                        </button>

                        <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
                          {isApplyMode ? (
                            <>
                              <p>• Requester reviews and accepts</p>
                              <p>• Notifications are sent to both sides</p>
                            </>
                          ) : (
                            <>
                              <p>• Secure booking</p>
                              <p>• No charge until accepted</p>
                            </>
                          )}
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
