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
  const [applicationServiceNotes] = useState({})
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

  const getUnitPerPersonLabel = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'hours per person'
    if (normalized === 'daily') return 'days per person'
    if (normalized === 'monthly') return 'months per person'
    return 'units per person'
  }

  const getTotalUnitLabel = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'Total hours (auto)'
    if (normalized === 'daily') return 'Total days (auto)'
    if (normalized === 'monthly') return 'Total months (auto)'
    return 'Total units (auto)'
  }

  const getNeededPerPersonQuestion = (unit) => {
    const normalized = String(unit || '').trim().toLowerCase()
    if (normalized === 'hourly') return 'Hours you have to provide per person'
    if (normalized === 'daily') return 'Days you have to provide per person'
    if (normalized === 'monthly') return 'Months you have to provide per person'
    return 'Units you have to provide per person'
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
      const [myPostRes, allPostRes, skillRes, expertiseRes, productRes, erpRes] = await Promise.allSettled([
        api.get('/posts/?mine=1'),
        api.get('/posts/'),
        api.get('/skills/'),
        api.get('/expertises/'),
        api.get('/products/'),
        api.get('/erp/'),
      ])

      const getData = (result, fallback = []) => {
        return result?.status === 'fulfilled' ? (result.value?.data ?? fallback) : fallback
      }

      const myPosts = getData(myPostRes)
      const allPosts = getData(allPostRes)
      const skillsData = getData(skillRes)
      const expertisesData = getData(expertiseRes)
      const productsData = getData(productRes)
      const erpData = getData(erpRes)

      const failedEndpoints = []
      if (myPostRes.status === 'rejected') failedEndpoints.push('my posts')
      if (allPostRes.status === 'rejected') failedEndpoints.push('all posts')
      if (skillRes.status === 'rejected') failedEndpoints.push('skills')
      if (expertiseRes.status === 'rejected') failedEndpoints.push('expertises')
      if (productRes.status === 'rejected') failedEndpoints.push('products')
      if (erpRes.status === 'rejected') failedEndpoints.push('erp')

      if (failedEndpoints.length > 0) {
        showMessage(`Some data failed to load: ${failedEndpoints.join(', ')}`, 'error')
      }

      const mineIds = new Set((myPosts || []).map((post) => post.id))
      const erpPostIds = new Set((erpData || []).map((item) => item.post))
      const manageableIds = new Set([...erpPostIds])
      const selectedPostId = Number(id)
      const hasSelectedPostId = Number.isFinite(selectedPostId) && selectedPostId > 0
      const manageablePosts = (allPosts || []).filter((post) => {
        if (manageableIds.has(post.id)) return true
        if (hasSelectedPostId && Number(post.id) === selectedPostId) return true
        return false
      })

      setOwnPostIds(mineIds)
      setPosts(manageablePosts)
      setSkills(skillsData)
      setExpertises(expertisesData)
      setProducts(productsData)
      setErpItems(erpData)
    } catch (error) {
      console.error(error)
      showMessage('Error loading posts', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showMessage])


  useEffect(() => {
    loadPosts()
    // Listen for global refresh event to always reload post data after booking/application changes
    const handleRefresh = () => {
      loadPosts()
    }
    window.addEventListener('localix:notifications-refresh', handleRefresh)
    return () => {
      window.removeEventListener('localix:notifications-refresh', handleRefresh)
    }
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

  const consumedCapacityByPost = useMemo(() => {
    const toInt = (value, fallback = 0) => {
      const parsed = Number.parseInt(value, 10)
      return Number.isFinite(parsed) ? parsed : fallback
    }

    return (erpItems || []).reduce((acc, item) => {
      const snapshot = item?.configuration_snapshot || {}
      const postType = String(snapshot?.post?.type || '').trim().toLowerCase()
      const applicationStatus = String(snapshot?.application_submission?.status || '').trim().toLowerCase()
      const bookingStatus = String(snapshot?.booking_submission?.status || '').trim().toLowerCase()

      const shouldConsume =
        (postType === 'demand' && ['approved', 'accepted', 'confirmed'].includes(applicationStatus)) ||
        (postType === 'supply' && ['approved', 'accepted', 'confirmed'].includes(bookingStatus))

      if (!shouldConsume) return acc

      const products = Array.isArray(snapshot?.products) ? snapshot.products : []
      const expertise = Array.isArray(snapshot?.expertise) ? snapshot.expertise : []

      if (!acc[item.post]) {
        acc[item.post] = {
          products: {},
          expertisePeople: {},
          expertiseDuration: {},
        }
      }

      products.forEach((row) => {
        if (!row || typeof row !== 'object' || row.included === false) return
        const rowId = toInt(row.id, 0)
        const qty = toInt(row.offered_quantity ?? row.quantity ?? 0, 0)
        if (rowId <= 0 || qty <= 0) return
        acc[item.post].products[rowId] = (acc[item.post].products[rowId] || 0) + qty
      })

      expertise.forEach((row) => {
        if (!row || typeof row !== 'object' || row.included === false) return
        const rowId = toInt(row.id, 0)
        if (rowId <= 0) return

        const people = toInt(row.offered_people ?? row.quantity ?? 0, 0)
        const duration = toInt(row.offered_hours ?? row.duration ?? 0, 0)

        if (people > 0) {
          acc[item.post].expertisePeople[rowId] = (acc[item.post].expertisePeople[rowId] || 0) + people
        }
        if (duration > 0) {
          acc[item.post].expertiseDuration[rowId] = (acc[item.post].expertiseDuration[rowId] || 0) + duration
        }
      })

      return acc
    }, {})
  }, [erpItems])

  const getRemainingProductUnits = (postId, product) => {
    const total = Math.max(Number(product?.available_units || 0), 0)
    const consumed = Math.max(Number(consumedCapacityByPost?.[postId]?.products?.[product?.id] || 0), 0)
    return Math.max(total - consumed, 0)
  }

  const getRemainingExpertisePeople = (postId, expertise) => {
    const total = Math.max(Number(expertise?.available_person || 0), 0)
    const consumed = Math.max(Number(consumedCapacityByPost?.[postId]?.expertisePeople?.[expertise?.id] || 0), 0)
    return Math.max(total - consumed, 0)
  }

  const getRemainingExpertiseDuration = (postId, expertise) => {
    const perPersonUnit = Math.max(Number(expertise?.needed_budget_unit || 0), 0)
    const remainingPeople = getRemainingExpertisePeople(postId, expertise)
    return Math.max(remainingPeople * perPersonUnit, 0)
  }

  const getRemainingSkillPeople = (postId, skillRow) => {
    const total = Math.max(Number(skillRow?.available_workers || 0), 0)
    const consumed = Math.max(Number(consumedCapacityByPost?.[postId]?.expertisePeople?.[skillRow?.id] || 0), 0)
    return Math.max(total - consumed, 0)
  }

  const getRemainingSkillHours = (postId, skillRow) => {
    const total = Math.max(Number(skillRow?.needed_budget_unit || 0), 0)
    const consumed = Math.max(Number(consumedCapacityByPost?.[postId]?.expertiseDuration?.[skillRow?.id] || 0), 0)
    return Math.max(total - consumed, 0)
  }

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
      const peopleMax = getRemainingSkillPeople(postId, row)
      const hoursMax = getRemainingSkillHours(postId, row)
      const people = enabled ? peopleMax : 0
      const hours = enabled ? hoursMax : 0
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
      const peopleMax = getRemainingExpertisePeople(postId, row)
      const applyPeopleKey = `apply-expertise-${row.id}-people`
      const perPersonUnit = Math.max(Number(row.needed_budget_unit || 0), 0)
      const selectedPeople = getApplicationValue(applyPeopleKey, peopleMax)
      const people = enabled ? Math.max(0, Math.min(peopleMax, selectedPeople)) : 0
      const hours = enabled ? people * perPersonUnit : 0
      const requestedRate = Number(row.cost || 0)
      const offeredRate = getApplicationValue(`apply-expertise-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? people * offeredRate : 0
      if (enabled) expertiseTotal += lineTotal

      if (enabled && people > 0 && perPersonUnit <= 0) {
        validationErrors.push(`${row.name}: needed hire unit per person must be greater than 0.`)
      }

      if (enabled && people > 0 && offeredRate <= 0) {
        validationErrors.push(`${row.name}: add your per-person budget rate.`)
      }

      lineItems.push({
        key: `apply-expertise-${row.id}`,
        title: row.name,
        detail: `(${people} person x ${perPersonUnit} ${getUnitPerPersonLabel(row.unit).replace(' per person', '')})`,
        amount: lineTotal,
        included: enabled,
      })
    })

    serviceRows.forEach((row) => {
      const enabled = isItemEnabled(postId, 'service', row.id)
      const requestedRate = Number(row.cost_per_unit || 0)
      const offeredRate = getApplicationValue(`apply-service-${row.id}-rate`, requestedRate)
      const lineTotal = enabled ? offeredRate : 0
      if (enabled) serviceTotal += lineTotal
      if (enabled && offeredRate <= 0) {
        validationErrors.push(`${row.service_name}: add your service charge.`)
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
      const quantityMax = getRemainingProductUnits(postId, row)
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
        const peopleMax = getRemainingSkillPeople(postId, row)
        const hoursMax = getRemainingSkillHours(postId, row)
        const requestedRate = Number(row.cost_per_unit || 0)
        const offeredRate = getApplicationValue(`apply-skill-${row.id}-rate`, requestedRate)
        const enabled = isItemEnabled(postId, 'skill', row.id)
        const quantity = enabled ? peopleMax : 0
        const duration = enabled ? hoursMax : 0

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
        const peopleMax = getRemainingExpertisePeople(postId, row)
        const applyPeopleKey = `apply-expertise-${row.id}-people`
        const perPersonUnit = Math.max(Number(row.needed_budget_unit || 0), 0)
        const requestedRate = Number(row.cost || 0)
        const offeredRate = getApplicationValue(`apply-expertise-${row.id}-rate`, requestedRate)
        const enabled = isItemEnabled(postId, 'expertise', row.id)
        const selectedPeople = getApplicationValue(applyPeopleKey, peopleMax)
        const quantity = enabled ? Math.max(0, Math.min(peopleMax, selectedPeople)) : 0
        const duration = enabled ? perPersonUnit : 0
        const requestedHours = perPersonUnit

        return {
          id: row.id,
          source: 'expertise',
          name: row.name,
          unit: row.unit,
          included: enabled,
          requested_unit_per_person: perPersonUnit,
          requested_people: peopleMax,
          requested_hours: requestedHours,
          requested_rate: requestedRate,
          offered_people: quantity,
          offered_hours: duration,
          offered_unit_per_person: perPersonUnit,
          offered_rate: offeredRate,
          line_total: enabled ? quantity * offeredRate : 0,
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
      const quantityMax = getRemainingProductUnits(postId, row)
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
    const submittedSnapshot = {
      ...snapshot,
      application_submission: {
        ...(snapshot.application_submission || {}),
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      },
    }
    setSubmittingApplicationPostId(post.id)

    try {
      const existing = erpByPost[post.id]
      let erpRecord = existing
      const payload = {
        post: post.id,
        total_cost: Number(submittedSnapshot.totals?.grand || 0),
        configuration_snapshot: submittedSnapshot,
        is_configured: false,
      }

      if (existing) {
        try {
          const { data } = await api.patch(`/erp/${existing.id}/`, {
            total_cost: Number(submittedSnapshot.totals?.grand || 0),
            configuration_snapshot: submittedSnapshot,
            is_configured: false,
          })
          erpRecord = data
          setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        } catch (patchError) {
          const statusCode = patchError?.response?.status
          if (statusCode === 404 || statusCode === 403 || statusCode === 400) {
            const { data } = await api.post('/erp/', payload)
            erpRecord = data
            setErpItems((prev) => {
              const exists = prev.some((item) => item.id === data.id)
              return exists ? prev.map((item) => (item.id === data.id ? data : item)) : [...prev, data]
            })
          } else {
            throw patchError
          }
        }
      } else {
        const { data } = await api.post('/erp/', payload)
        erpRecord = data
        setErpItems((prev) => [...prev, data])
      }

      try {
        await api.post(`/erp/${erpRecord.id}/submit_application/`, {
          note: getApplicationNoteForPost(post.id),
        })
      } catch (submitError) {
        // Backward-compatible fallback when custom submit endpoint is not available.
        if (submitError?.response?.status !== 404) {
          throw submitError
        }
      }

      window.dispatchEvent(new Event('localix:notifications-refresh'))
      showMessage('Your application was submitted successfully. Please wait for acceptance.', 'success')
      setTimeout(() => {
        const targetErpId = Number(erpRecord?.id || 0)
        if (Number.isFinite(targetErpId) && targetErpId > 0) {
          navigate(`/erp?erp_id=${targetErpId}`)
        } else {
          navigate('/erp')
        }
      }, 500)
    } catch (error) {
      console.error(error)
      const statusCode = error?.response?.status
      const detail = error?.response?.data
      if (statusCode === 403) {
        showMessage('Failed submission: you are not allowed to submit this application.', 'error')
      } else if (statusCode === 400 && detail) {
        const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
        showMessage(`Failed submission: ${text}`, 'error')
      } else if (detail) {
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
    const payload = {
      post: post.id,
      total_cost: total,
      configuration_snapshot: snapshot,
      is_configured: true,
    }

    try {
      let erpRecordId = null
      if (existing) {
        try {
          const { data } = await api.patch(`/erp/${existing.id}/`, {
            total_cost: total,
            configuration_snapshot: snapshot,
            is_configured: true,
          })
          erpRecordId = Number(data?.id || 0)
          setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
          showMessage('Booking request sent. Waiting for approval.', 'success')
        } catch (patchError) {
          const statusCode = patchError?.response?.status
          if (statusCode === 404 || statusCode === 403 || statusCode === 400) {
            const { data } = await api.post('/erp/', payload)
            erpRecordId = Number(data?.id || 0)
            setErpItems((prev) => {
              const exists = prev.some((item) => item.id === data.id)
              return exists ? prev.map((item) => (item.id === data.id ? data : item)) : [...prev, data]
            })
            showMessage('Booking request sent. Waiting for approval.', 'success')
          } else {
            throw patchError
          }
        }
      } else {
        const { data } = await api.post('/erp/', payload)
        erpRecordId = Number(data?.id || 0)
        setErpItems((prev) => [...prev, data])
        showMessage('Booking request sent. Waiting for approval.', 'success')
      }

      window.dispatchEvent(new Event('localix:notifications-refresh'))

      setTimeout(() => {
        if (Number.isFinite(erpRecordId) && erpRecordId > 0) {
          navigate(`/erp?erp_id=${erpRecordId}`)
        } else {
          navigate('/erp')
        }
      }, 250)
    } catch (error) {
      console.error(error)
      const detail = error?.response?.data
      const text = detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''
      showMessage(text ? `Failed to manage ERP task: ${text}` : 'Failed to manage ERP task', 'error')
    }
  }

  const CounterControl = ({ value, onChange, max, label, helperText, disabled = false, strictMax = true, compact = false }) => {
    const isLocked = disabled
    const handleTypedValue = (rawValue) => {
      const parsed = Number(rawValue)
      if (!Number.isFinite(parsed)) {
        onChange(0)
        return
      }
      const normalized = Math.floor(parsed)
      const maxValue = Number(max || 0)
      const hasPositiveMax = Number.isFinite(maxValue) && maxValue > 0
      const shouldClampMax = strictMax && hasPositiveMax
      const next = shouldClampMax
        ? Math.max(0, Math.min(maxValue, normalized))
        : Math.max(0, normalized)
      onChange(next)
    }

    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            {helperText ? <p className="text-xs text-slate-300">{helperText}</p> : null}
          </div>
          <div className="flex items-center gap-1.5">
            {!isLocked && (
              <button
                type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                className="h-8 w-8 rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
              >
                -
              </button>
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={value}
              disabled={isLocked}
              onChange={(event) => handleTypedValue(event.target.value)}
              onBlur={(event) => handleTypedValue(event.target.value)}
              className={`${compact ? 'h-7 min-w-[52px] text-xs px-1.5' : 'h-8 min-w-[64px] text-sm px-2'} rounded-md border border-white/25 bg-white/5 text-center font-bold text-white outline-none ${
                isLocked ? 'cursor-not-allowed opacity-50' : 'focus:border-white/60'
              }`}
            />
            {!isLocked && (
              <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className="h-8 w-8 rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
              >
                +
              </button>
            )}
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

  const BookingItemHeader = ({ icon, title, subtitle, priceText, priceUnitText, checked, onToggle, disabled = false }) => (
    <div
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={(event) => {
        if (disabled) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className={`flex items-start justify-between gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/20 text-base leading-none shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs font-bold text-slate-300">{subtitle}</p>
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
          disabled={disabled}
          onChange={(event) => {
            event.stopPropagation()
            if (disabled) return
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
    const postId = Number(row?.post || 0)
    const remainingPeople = postId > 0 ? getRemainingSkillPeople(postId, row) : Math.max(Number(row.available_workers || 0), 0)
    if (Object.prototype.hasOwnProperty.call(skillWorkers, key)) {
      const current = Number(skillWorkers[key] || 0)
      if (postType === 'Demand') return Math.max(0, Math.min(current, remainingPeople))
      return current
    }
    return postType === 'Demand' ? remainingPeople : 0
  }

  const getExpertisePersonsValue = (postType, row) => {
    const key = `expertise-${row.id}`
    const postId = Number(row?.post || 0)
    const remainingPeople = postId > 0 ? getRemainingExpertisePeople(postId, row) : Math.max(Number(row.available_person || 0), 0)
    if (Object.prototype.hasOwnProperty.call(expertisePersons, key)) {
      const current = Number(expertisePersons[key] || 0)
      if (postType === 'Supply') return Math.max(0, Math.min(current, remainingPeople))
      return current
    }
    return postType === 'Demand' ? Math.max(Number(row.available_person || 0), 0) : 0
  }

  const getExpertiseDurationValue = (postType, row) => {
    const key = `expertise-${row.id}-duration`
    const postId = Number(row?.post || 0)
    const remainingDuration = postId > 0 ? getRemainingExpertiseDuration(postId, row) : Math.max(Number(row.needed_budget_unit || 0), 0)
    if (Object.prototype.hasOwnProperty.call(expertiseDurations, key)) {
      const current = Number(expertiseDurations[key] || 0)
      if (postType === 'Demand') return Math.max(0, Math.min(current, remainingDuration))
      return current
    }
    return postType === 'Demand' ? remainingDuration : 0
  }

  const getProductUnitsValue = (postType, row) => {
    const key = `product-${row.id}`
    const postId = Number(row?.post || 0)
    const remainingUnits = postId > 0 ? getRemainingProductUnits(postId, row) : Math.max(Number(row.available_units || 0), 0)
    if (Object.prototype.hasOwnProperty.call(productUnits, key)) {
      const current = Number(productUnits[key] || 0)
      if (postType === 'Supply') return Math.max(0, Math.min(current, remainingUnits))
      return current
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
              <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">Defaults follow requested post details. Values can be reduced, but cannot exceed required limits.</p>
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
                              ? getRemainingSkillPeople(post.id, skill)
                              : Math.max(Number(skill.available_workers || 0), 1)
                            const enabled = isItemEnabled(post.id, 'skill', skill.id)
                            const requestedRate = Number(skill.cost_per_unit || 0)
                            const applyPeopleKey = `apply-skill-${skill.id}-people`
                            const applyHoursKey = `apply-skill-${skill.id}-hours`
                            const applyRateKey = `apply-skill-${skill.id}-rate`
                            const applyHoursMax = post.post_type === 'Demand'
                              ? getRemainingSkillHours(post.id, skill)
                              : Math.max(Number(skill.needed_budget_unit || 0), 0)
                            const applyPeople = workersMax
                            const applyHours = applyHoursMax
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const peopleExhausted = workersMax <= 0
                            const hoursExhausted = applyHoursMax <= 0
                            const isSkillLocked = isApplyMode && peopleExhausted && hoursExhausted
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
                                  disabled={isSkillLocked}
                                  onToggle={() =>
                                    isSkillLocked
                                      ? null
                                      :
                                    toggleItemEnabled(post.id, 'skill', skill.id, () => {
                                      setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: 0 }))
                                    })
                                  }
                                />

                                {isSkillLocked && (
                                  <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                    {post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked'}
                                  </div>
                                )}

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyPeople}
                                          onChange={(val) => setApplicationValue(applyPeopleKey, val, workersMax)}
                                          max={workersMax}
                                          compact={true}
                                          disabled={true}
                                          label="People you'll provide"
                                          helperText={
                                            peopleExhausted
                                              ? (post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked')
                                              : `Max ${workersMax} person (as requested)`
                                          }
                                        />
                                        <CounterControl
                                          value={applyHours}
                                          onChange={(val) => setApplicationValue(applyHoursKey, val, applyHoursMax)}
                                          max={applyHoursMax}
                                          disabled={true}
                                          label="Hours you'll work"
                                          helperText={
                                            hoursExhausted
                                              ? (post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked')
                                              : `Max ${applyHoursMax} hrs (as requested)`
                                          }
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
                            const remainingPeople = getRemainingExpertisePeople(post.id, expertise)
                            const personsMax = getRemainingExpertisePeople(post.id, expertise)
                            const durationMax = getRemainingExpertiseDuration(post.id, expertise)
                            const enabled = isItemEnabled(post.id, 'expertise', expertise.id)
                            const requestedRate = Number(expertise.cost || 0)
                            const applyPeopleKey = `apply-expertise-${expertise.id}-people`
                            const applyRateKey = `apply-expertise-${expertise.id}-rate`
                            const perPersonUnit = Math.max(Number(expertise.needed_budget_unit || 0), 0)
                            const selectedApplyPeople = getApplicationValue(applyPeopleKey, personsMax)
                            const applyPeople = Math.max(0, Math.min(personsMax, selectedApplyPeople))
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const originalPeople = Math.max(Number((expertise.available_person_original ?? expertise.available_person) || 0), 0)
                            const peopleExhausted = originalPeople > 0 && personsMax <= 0
                            const isExpertiseLocked = (post.post_type === 'Supply' && remainingPeople <= 0) || (isApplyMode && peopleExhausted)
                            const subtotal = isApplyMode
                              ? (enabled ? applyPeople * applyRate : 0)
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
                                  priceUnitText={`per person / ${formatRateUnit(expertise.unit).toLowerCase()}`}
                                  checked={enabled}
                                  disabled={isExpertiseLocked}
                                  onToggle={() =>
                                    isExpertiseLocked
                                      ? null
                                      : toggleItemEnabled(post.id, 'expertise', expertise.id, () => {
                                          setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: 0 }))
                                          setExpertiseDurations((prev) => ({ ...prev, [`expertise-${expertise.id}-duration`]: 0 }))
                                        })
                                  }
                                />

                                {isExpertiseLocked && (
                                  <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                    {post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked'}
                                  </div>
                                )}

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyPeople}
                                          onChange={(val) => setApplicationValue(applyPeopleKey, val, personsMax)}
                                          max={personsMax}
                                          compact={true}
                                          disabled={isExpertiseLocked}
                                          label="People you'll provide"
                                          helperText={
                                            peopleExhausted
                                              ? (post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked')
                                              : `Max ${personsMax} person${post.post_type === 'Demand' ? ' (as requested)' : ' available'}`
                                          }
                                        />
                                        <CounterControl
                                          value={perPersonUnit}
                                          onChange={() => {}}
                                          max={perPersonUnit}
                                          disabled={true}
                                          strictMax={false}
                                          label={post.post_type === 'Demand' ? getNeededPerPersonQuestion(expertise.unit) : getDurationLabel(expertise.unit)}
                                          helperText={getUnitPerPersonLabel(expertise.unit)}
                                        />
                                        <OfferRateInput
                                          value={applyRate}
                                          onChange={(val) => setApplicationValue(applyRateKey, val)}
                                          requestedRate={requestedRate}
                                          label={`Your ${formatRateUnit(expertise.unit)} Budget (BDT) per person`}
                                          helperText={`Requester budget: ৳${requestedRate.toFixed(0)} per person / ${formatRateUnit(expertise.unit).toLowerCase()}`}
                                          unitLabel={`person/${formatRateUnit(expertise.unit).toLowerCase()}`}
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <CounterControl
                                          value={persons}
                                          onChange={(val) => setExpertisePersons((prev) => ({ ...prev, [`expertise-${expertise.id}`]: val }))}
                                          max={personsMax}
                                          label="People required"
                                          helperText={post.post_type === 'Demand' ? `${Number(expertise.available_person || 0)} required in post details` : `${remainingPeople} professionals available now`}
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
                            const isServiceLocked = Boolean(service.is_fully_booked)
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
                                  disabled={isServiceLocked}
                                  onToggle={() => (isServiceLocked ? null : toggleItemEnabled(post.id, 'service', service.id))}
                                />

                                {isServiceLocked && (
                                  <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                    {post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked'}
                                  </div>
                                )}

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
                            const remainingUnits = getRemainingProductUnits(post.id, product)
                            const unitsMax = post.post_type === 'Demand' ? availableUnits : remainingUnits
                            const enabled = isItemEnabled(post.id, 'product', product.id)
                            const requestedRate = Number(product.cost_per_unit || 0)
                            const applyQuantityKey = `apply-product-${product.id}-quantity`
                            const applyRateKey = `apply-product-${product.id}-rate`
                            const applyQuantity = getApplicationValue(applyQuantityKey, unitsMax)
                            const applyRate = getApplicationValue(applyRateKey, requestedRate)
                            const originalUnits = Math.max(Number((product.available_units_original ?? product.available_units) || 0), 0)
                            const unitsExhausted = originalUnits > 0 && unitsMax <= 0
                            const isProductLocked = (post.post_type === 'Supply' && remainingUnits <= 0) || (isApplyMode && unitsExhausted)
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
                                  disabled={isProductLocked}
                                  onToggle={() =>
                                    isProductLocked
                                      ? null
                                      : toggleItemEnabled(post.id, 'product', product.id, () => {
                                          setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: 0 }))
                                        })
                                  }
                                />

                                {isProductLocked && (
                                  <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                    {post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked'}
                                  </div>
                                )}

                                {enabled && (
                                  <div className="mt-4 space-y-3 border-t border-white/15 pt-3">
                                    {isApplyMode ? (
                                      <>
                                        <CounterControl
                                          value={applyQuantity}
                                          onChange={(val) => setApplicationValue(applyQuantityKey, val, unitsMax)}
                                          max={unitsMax}
                                          label="Quantity you can supply"
                                          helperText={
                                            isProductLocked
                                              ? (post.post_type === 'Demand' ? 'Already Applied' : 'Already Booked')
                                              : `Max ${availableUnits} unit (as requested)`
                                          }
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
                                          helperText={post.post_type === 'Demand' ? `${availableUnits} required in post details (cannot exceed)` : (remainingUnits > 0 ? `Maximum ${remainingUnits} available now` : 'Stock out')}
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
