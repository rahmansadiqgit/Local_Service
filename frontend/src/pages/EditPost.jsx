import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import LocationPickerMap from '../components/LocationPickerMap'
import useAuth from '../context/useAuth'

const CATEGORY_OPTIONS = ['Expertise', 'Services', 'Product']
const POST_TYPE_OPTIONS = [
  { value: 'Supply', label: 'Sell / Offer Something (Available)' },
  { value: 'Demand', label: 'Ask / Request Something (Demand)' },
]
const COMMON_PRODUCT_UNITS = [
  'piece',
  'kg',
  'gram',
  'liter',
  'ml',
  'dozen',
  'pack',
  'bag',
  'box',
  'meter',
  'feet',
]

const toCoordinateOrNull = (value) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const imageInputRef = useRef(null)
  const postTypeMenuRef = useRef(null)
  const categoryMenuRef = useRef(null)
  const geocodeRequestRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [isLocked, setIsLocked] = useState(false)
  const [post, setPost] = useState({
    post_type: 'Supply',
    post_name: '',
    post_title: '',
    description: '',
    brand_company_name: '',
    location: '',
    latitude: '',
    longitude: '',
    website_link: '',
    image: '',
  })

  const [selectedCategories, setSelectedCategories] = useState([])
  const [expertises, setExpertises] = useState([
    { name: '', experience: '', unit: '', needed_budget_unit: '', cost: '', available_person: 0 },
  ])
  const [services, setServices] = useState([{ service_name: '', description: '', cost_per_unit: '' }])
  const [products, setProducts] = useState([
    { product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 },
  ])

  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [showPostTypeMenu, setShowPostTypeMenu] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [headerImageSrc, setHeaderImageSrc] = useState('/images/edit_post.jpeg')
  const [locationLoading, setLocationLoading] = useState(false)

  const postId = Number(id)
  const isDemand = post.post_type === 'Demand'

  const currentImageName = useMemo(() => {
    if (!post.image) return ''
    try {
      const rawName = String(post.image).split('/').pop() || ''
      return decodeURIComponent(rawName)
    } catch {
      return String(post.image).split('/').pop() || ''
    }
  }, [post.image])

  const toMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const backendOrigin = apiBase.replace(/\/api\/?$/, '')
    if (value.startsWith('/')) return `${backendOrigin}${value}`
    return `${backendOrigin}/${value}`
  }

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => setPreviewUrl(String(reader.result || ''))
      reader.readAsDataURL(imageFile)
      return
    }
    setPreviewUrl('')
  }, [imageFile])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (postTypeMenuRef.current && !postTypeMenuRef.current.contains(event.target)) {
        setShowPostTypeMenu(false)
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setShowCategoryMenu(false)
      }
    }

    if (showPostTypeMenu || showCategoryMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPostTypeMenu, showCategoryMenu])

  const geocodeLocationQuery = async (rawQuery, { replaceInputText = false } = {}) => {
    const query = String(rawQuery || '').trim()
    if (query.length < 2) return false

    const requestId = ++geocodeRequestRef.current
    setLocationLoading(true)

    try {
      const urls = [
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query}, Bangladesh`)}&format=jsonv2&limit=1&countrycodes=bd`,
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=bd`,
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`,
      ]

      let first = null
      for (const url of urls) {
        const response = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!response.ok) continue
        const data = await response.json()
        first = Array.isArray(data) ? data[0] : null
        if (first?.lat && first?.lon) break
      }

      if (!first?.lat || !first?.lon) return false
      if (requestId !== geocodeRequestRef.current) return false

      setPost((prev) => {
        if (prev.location?.trim() !== query) return prev
        return {
          ...prev,
          latitude: String(first.lat),
          longitude: String(first.lon),
          location: replaceInputText ? (first.display_name || prev.location) : prev.location,
        }
      })

      return true
    } catch {
      return false
    } finally {
      if (requestId === geocodeRequestRef.current) {
        setLocationLoading(false)
      }
    }
  }

  useEffect(() => {
    const query = post.location?.trim()
    const hasCoordinates =
      toCoordinateOrNull(post.latitude) !== null &&
      toCoordinateOrNull(post.longitude) !== null

    if (!query || hasCoordinates || isLocked) return

    const timeoutId = setTimeout(async () => {
      await geocodeLocationQuery(query, { replaceInputText: false })
    }, 700)

    return () => clearTimeout(timeoutId)
  }, [post.location, post.latitude, post.longitude, isLocked])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!Number.isFinite(postId) || postId <= 0) {
        setMessage('Invalid post id.')
        setLoading(false)
        return
      }

      try {
        const [postRes, skillsRes, expertisesRes, productsRes, erpRes] = await Promise.all([
          api.get(`/posts/${postId}/`),
          api.get('/skills/'),
          api.get('/expertises/'),
          api.get('/products/'),
          api.get('/erp/'),
        ])

        if (!active) return

        const foundPost = postRes.data || {}
        const ownerId = Number(foundPost.owner_id ?? foundPost.owner)
        if (!user?.id || Number(user.id) !== ownerId) {
          setMessage('You can edit only your own posts.')
          setLoading(false)
          return
        }

        const allErp = Array.isArray(erpRes.data) ? erpRes.data : []
        const hasExternal = allErp.some((erp) => {
          if (Number(erp?.post) !== postId) return false
          const providerId = Number(erp?.provider)
          const receiverId = Number(erp?.receiver)
          return (
            (Number.isFinite(providerId) && providerId > 0 && providerId !== ownerId) ||
            (Number.isFinite(receiverId) && receiverId > 0 && receiverId !== ownerId)
          )
        })

        setIsLocked(Boolean(hasExternal))

        setPost({
          post_type: String(foundPost.post_type || 'Supply'),
          post_name: String(foundPost.post_name || ''),
          post_title: String(foundPost.post_title || ''),
          description: String(foundPost.description || ''),
          brand_company_name: String(foundPost.brand_company_name || ''),
          location: String(foundPost.location || ''),
          latitude: '',
          longitude: '',
          website_link: String(foundPost.website_link || ''),
          image: foundPost.image || '',
        })

        const categories = String(foundPost.post_name || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        setSelectedCategories(categories)

        const postSkills = (Array.isArray(skillsRes.data) ? skillsRes.data : []).filter((item) => Number(item.post) === postId)
        const postExpertises = (Array.isArray(expertisesRes.data) ? expertisesRes.data : []).filter((item) => Number(item.post) === postId)
        const postProducts = (Array.isArray(productsRes.data) ? productsRes.data : []).filter((item) => Number(item.post) === postId)

        const expertiseRowsFromSkills = postSkills
          .filter((item) => /^__expertise__::/i.test(String(item.skill_name || '')))
          .map((item) => ({
            name: String(item.skill_name || '').replace(/^__expertise__::/i, ''),
            experience: item.description || '',
            unit: '',
            needed_budget_unit: '',
            cost: item.cost_per_unit ?? '',
            available_person: 0,
          }))

        const serviceRows = postSkills
          .filter((item) => /^__service__::/i.test(String(item.skill_name || '')))
          .map((item) => ({
            service_name: String(item.skill_name || '').replace(/^__service__::/i, ''),
            description: item.description || '',
            cost_per_unit: item.cost_per_unit,
          }))

        setServices(serviceRows.length ? serviceRows : [{ service_name: '', description: '', cost_per_unit: '' }])

        setExpertises(
          postExpertises.length
            ? postExpertises.map((item) => ({
                id: item.id,
                name: item.name || '',
                experience: item.experience || '',
                unit: item.unit || '',
                needed_budget_unit: item.needed_budget_unit ?? '',
                cost: item.cost ?? '',
                available_person: item.available_person ?? 0,
              }))
            : expertiseRowsFromSkills.length
              ? expertiseRowsFromSkills
              : [{ name: '', experience: '', unit: '', needed_budget_unit: '', cost: '', available_person: 0 }],
        )

        setProducts(
          postProducts.length
            ? postProducts.map((item) => ({
                id: item.id,
                product_name: item.product_name || '',
                description: item.description || '',
                unit: item.unit || '',
                cost_per_unit: item.cost_per_unit ?? '',
                available_units: item.available_units ?? 0,
              }))
            : [{ product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 }],
        )
      } catch (error) {
        setMessage(error?.response?.data?.detail || 'Failed to load post for editing.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [postId, user?.id])

  const hasSelectedCategories = selectedCategories.length > 0
  const showExpertiseSection = hasSelectedCategories && selectedCategories.includes('Expertise')
  const showServicesSection = hasSelectedCategories && selectedCategories.includes('Services')
  const showProductsSection = hasSelectedCategories && selectedCategories.includes('Product')
  const showServiceDescriptionField = showServicesSection && (showExpertiseSection || showProductsSection)
  const showProductDescriptionField = showProductsSection && (showExpertiseSection || showServicesSection)

  const profileLikeInputClass =
    'mt-1.5 w-full rounded-xl border border-violet-200 bg-gradient-to-br from-white/85 to-violet-50/70 px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200'
  const profileLikeSelectClass =
    `${profileLikeInputClass} cursor-pointer focus:bg-gradient-to-r focus:from-violet-100 focus:to-fuchsia-100`
  const primaryButtonClass =
    'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'
  const addRowButtonClass =
    'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'
  const removeButtonClass =
    'inline-flex h-[42px] w-[110px] items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'

  const toggleCategory = (category) => {
    if (isLocked) return
    setSelectedCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
      setPost((current) => ({ ...current, post_name: next.join(', ') }))
      return next
    })
  }

  const handleLocationInputChange = (event) => {
    const value = event.target.value
    setPost((prev) => ({ ...prev, location: value, latitude: '', longitude: '' }))
    setShowPostTypeMenu(false)
    setShowCategoryMenu(false)
  }

  const handleLocationInputBlur = async () => {
    if (isLocked) return
    const query = post.location?.trim()
    const hasCoordinates =
      toCoordinateOrNull(post.latitude) !== null &&
      toCoordinateOrNull(post.longitude) !== null

    if (!query || hasCoordinates) return
    await geocodeLocationQuery(query, { replaceInputText: true })
  }

  const handleLocationInputKeyDown = async (event) => {
    if (isLocked) return
    if (event.key !== 'Enter') return
    event.preventDefault()
    const query = post.location?.trim()
    if (!query) return
    await geocodeLocationQuery(query, { replaceInputText: true })
  }

  const handleMapLocationPick = async (lat, lng) => {
    if (isLocked) return
    setPost((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
      location: `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`,
    }))

    setLocationLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!response.ok) return
      const data = await response.json()
      const resolvedLocation =
        data?.display_name ||
        [
          data?.address?.suburb,
          data?.address?.city || data?.address?.town || data?.address?.village,
          data?.address?.state,
          data?.address?.country,
        ]
          .filter(Boolean)
          .join(', ')

      if (resolvedLocation) {
        setPost((prev) => ({ ...prev, location: resolvedLocation }))
      }
    } finally {
      setLocationLoading(false)
    }
  }

  const handlePostTypeSelect = (value) => {
    if (isLocked) return
    setPost((prev) => ({ ...prev, post_type: value }))
    setShowPostTypeMenu(false)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const payload = new FormData()
      payload.append('description', String(post.description || ''))
      if (imageFile) payload.append('image', imageFile)

      if (!isLocked) {
        payload.append('post_type', String(post.post_type || 'Supply'))
        payload.append('post_name', String(post.post_name || ''))
        payload.append('post_title', String(post.post_title || ''))
        payload.append('brand_company_name', String(post.brand_company_name || ''))
        payload.append('location', String(post.location || ''))
        payload.append('website_link', String(post.website_link || ''))
      }

      await api.patch(`/posts/${postId}/`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (!isLocked) {
        const [skillsRes, expertisesRes, productsRes] = await Promise.all([
          api.get('/skills/'),
          api.get('/expertises/'),
          api.get('/products/'),
        ])

        const existingSkills = (Array.isArray(skillsRes.data) ? skillsRes.data : []).filter((item) => Number(item.post) === postId)
        const existingExpertises = (Array.isArray(expertisesRes.data) ? expertisesRes.data : []).filter((item) => Number(item.post) === postId)
        const existingProducts = (Array.isArray(productsRes.data) ? productsRes.data : []).filter((item) => Number(item.post) === postId)

        await Promise.all([
          ...existingSkills.map((item) => api.delete(`/skills/${item.id}/`)),
          ...existingExpertises.map((item) => api.delete(`/expertises/${item.id}/`)),
          ...existingProducts.map((item) => api.delete(`/products/${item.id}/`)),
        ])

        const validExpertises = expertises.filter((item) => item.name && item.experience && item.unit && item.cost)
        const validServices = services.filter((item) => item.service_name && item.cost_per_unit)
        const validProducts = products.filter((item) => item.product_name && item.cost_per_unit && (isDemand || item.unit))

        await Promise.all([
          ...validExpertises.map((item) =>
            api.post('/expertises/', {
              name: item.name,
              experience: item.experience,
              unit: item.unit,
              needed_budget_unit: Number(item.needed_budget_unit) || 0,
              cost: Number(item.cost),
              available_person: Number(item.available_person) || 0,
              post: postId,
            }),
          ),
          ...validServices.map((item) =>
            api.post('/skills/', {
              skill_name: `__service__::${item.service_name}`,
              description: item.description,
              cost_per_unit: item.cost_per_unit,
              post: postId,
            }),
          ),
          ...validProducts.map((item) =>
            api.post('/products/', {
              ...item,
              unit: item.unit || (isDemand ? 'quantity' : item.unit),
              post: postId,
            }),
          ),
        ])
      }

      setMessage('Post updated successfully.')
      window.dispatchEvent(new Event('post-created'))
      navigate('/')
    } catch (error) {
      const responseData = error?.response?.data
      const detail = responseData?.detail || responseData?.message
      if (detail) {
        setMessage(String(detail))
      } else if (responseData && typeof responseData === 'object') {
        const fieldErrors = Object.entries(responseData)
          .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
          .join(' | ')
        setMessage(fieldErrors || 'Failed to update post.')
      } else {
        setMessage(error?.message || 'Failed to update post.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="card">Loading post editor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <div>
            <h2
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              Edit Post
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">
              {isLocked
                ? 'Main functionality started: only description and image are editable.'
                : 'No booking/application yet: all post fields are editable.'}
            </p>
          </div>
          <img
            src={headerImageSrc}
            alt="Edit post header illustration"
            onError={() => {
              setHeaderImageSrc((prev) => {
                if (prev === '/images/edit_post.jpeg') return '/images/edit_post.png'
                if (prev === '/images/edit_post.png') return '/images/create_post.png'
                return '/images/create_post.png'
              })
            }}
            className="pointer-events-none absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="card space-y-6 rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(236, 225, 255, 0.56)',
          backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
        }}
      >
        {!isLocked && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-black">Post Type</label>
                <div className="relative mt-1" ref={postTypeMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostTypeMenu((prev) => !prev)
                      setShowCategoryMenu(false)
                    }}
                    className={`${profileLikeInputClass} flex items-center justify-between text-left`}
                  >
                    <span className="text-slate-900">
                      {POST_TYPE_OPTIONS.find((option) => option.value === post.post_type)?.label || 'Select post type'}
                    </span>
                    <span className="text-slate-500">▾</span>
                  </button>

                  {showPostTypeMenu && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {POST_TYPE_OPTIONS.map((option) => {
                        const checked = post.post_type === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handlePostTypeSelect(option.value)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-violet-50/60 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span>{option.label}</span>
                            <span className={`text-base font-bold ${checked ? 'text-blue-600' : 'text-slate-300'}`}>
                              {checked ? '✓' : '○'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-black">Post Categories</label>
                <div className="relative mt-1" ref={categoryMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowCategoryMenu((prev) => !prev)}
                    className={`${profileLikeInputClass} flex items-center justify-between text-left`}
                  >
                    <span className={selectedCategories.length ? 'text-slate-900' : 'text-slate-500'}>
                      {selectedCategories.length ? selectedCategories.join(', ') : 'Select one or multiple categories'}
                    </span>
                    <span className="text-slate-500">▾</span>
                  </button>

                  {showCategoryMenu && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {CATEGORY_OPTIONS.map((category) => {
                        const checked = selectedCategories.includes(category)
                        return (
                          <label
                            key={category}
                            className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-violet-50/60 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span>{category}</span>
                            <span className={`text-base font-bold ${checked ? 'text-blue-600' : 'text-slate-300'}`}>
                              {checked ? '✓' : '○'}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCategory(category)}
                              className="hidden"
                            />
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-black">Post Title</label>
                <input
                  value={post.post_title}
                  onChange={(event) => setPost((prev) => ({ ...prev, post_title: event.target.value }))}
                  onFocus={() => setShowCategoryMenu(false)}
                  className={profileLikeInputClass}
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-black">Description</label>
                <textarea
                  value={post.description}
                  onChange={(event) => setPost((prev) => ({ ...prev, description: event.target.value }))}
                  onFocus={() => setShowCategoryMenu(false)}
                  rows={3}
                  className={profileLikeInputClass}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-black">Brand / Company</label>
                  <input
                    value={post.brand_company_name}
                    onChange={(event) => setPost((prev) => ({ ...prev, brand_company_name: event.target.value }))}
                    onFocus={() => setShowCategoryMenu(false)}
                    className={profileLikeInputClass}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-black">Image</label>
                  <div className="mt-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className={primaryButtonClass}>
                        Choose File
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      {imageFile ? (
                        <span className="max-w-[230px] truncate text-sm text-slate-600" title={imageFile.name}>{imageFile.name}</span>
                      ) : currentImageName ? (
                        <span className="max-w-[230px] truncate text-sm text-slate-600" title={currentImageName}>{currentImageName}</span>
                      ) : null}
                    </div>

                    {previewUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm" style={{ width: '4in', height: '4in', maxWidth: '100%' }}>
                        <button
                          type="button"
                          aria-label="Remove selected image"
                          onClick={() => {
                            setImageFile(null)
                            if (imageInputRef.current) imageInputRef.current.value = ''
                          }}
                          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center bg-transparent p-0 text-2xl font-bold leading-none text-white [text-shadow:0_0_10px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-105 hover:text-pink-300 focus-visible:outline-none"
                        >
                          ×
                        </button>
                        <img src={previewUrl} alt="Preview" className="h-full w-full rounded-xl object-cover" />
                      </div>
                    ) : post.image ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm" style={{ width: '4in', height: '4in', maxWidth: '100%' }}>
                        <img src={toMediaUrl(post.image)} alt="Current" className="h-full w-full rounded-xl object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-black">Website</label>
                  <input
                    value={post.website_link}
                    onChange={(event) => setPost((prev) => ({ ...prev, website_link: event.target.value }))}
                    onFocus={() => setShowCategoryMenu(false)}
                    className={profileLikeInputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-black">Location</label>
                <input
                  value={post.location}
                  onChange={handleLocationInputChange}
                  onBlur={handleLocationInputBlur}
                  onKeyDown={handleLocationInputKeyDown}
                  onFocus={() => setShowCategoryMenu(false)}
                  placeholder="Type location or pick from map"
                  className={profileLikeInputClass}
                />
                {locationLoading && <p className="mt-1 text-[11px] text-slate-600">Resolving location...</p>}
                <div className="mt-2">
                  <LocationPickerMap
                    latitude={post.latitude}
                    longitude={post.longitude}
                    onPick={handleMapLocationPick}
                    mapSizeInches={5}
                    selectedZoom={14}
                    popupText="Confirm this location?"
                  />
                </div>
              </div>
            </div>

            {showExpertiseSection && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-700">Expertise</p>
                  <button
                    type="button"
                    onClick={() =>
                      setExpertises((prev) => [
                        ...prev,
                        { name: '', experience: '', unit: '', needed_budget_unit: '', cost: '', available_person: 0 },
                      ])
                    }
                    className={addRowButtonClass}
                  >
                    Add Row
                  </button>
                </div>
                {expertises.map((row, index) => (
                  <div key={`expertise-${index}`} className={`grid gap-4 ${isDemand ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Skill/Experties Name' : 'Skill/Experties Name'}</label>
                      <input
                        value={row.name}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                        }
                        placeholder="e.g., Electricians, Teachers"
                        className={profileLikeInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Preferred Experience' : 'Your Experience'}</label>
                      <input
                        value={row.experience}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, experience: event.target.value } : item)))
                        }
                        placeholder="(Optional) e.g., 6 years"
                        className={profileLikeInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Hire Unit' : 'Service Duration Unit'}</label>
                      <select
                        value={row.unit}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)))
                        }
                        className={profileLikeSelectClass}
                      >
                        <option value="">{isDemand ? 'Select hire unit' : 'Select service duration unit'}</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    {isDemand && row.unit ? (
                      <div>
                        <label className="text-xs font-semibold text-black">Needed Hire Unit</label>
                        <input
                          value={row.needed_budget_unit}
                          onChange={(event) =>
                            setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, needed_budget_unit: event.target.value } : item)))
                          }
                          placeholder="Needed Hire Unit"
                          className={profileLikeInputClass}
                        />
                      </div>
                    ) : null}
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Charge (BDT) Per Unit'}</label>
                      <input
                        value={row.cost}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, cost: event.target.value } : item)))
                        }
                        placeholder={isDemand ? 'Enter your budget (BDT)' : 'Enter charge amount per unit (BDT)'}
                        className={profileLikeInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Required Person' : 'Available Person'}</label>
                      <div className="flex gap-2">
                        <input
                          value={row.available_person}
                          onChange={(event) =>
                            setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, available_person: event.target.value } : item)))
                          }
                          placeholder={isDemand ? 'Enter required persons' : 'Enter available persons'}
                          className={profileLikeInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setExpertises((prev) => prev.filter((_, i) => i !== index))}
                          className={`${removeButtonClass} mt-1.5`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showServicesSection && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-700">Services</p>
                  <button
                    type="button"
                    onClick={() =>
                      setServices((prev) => [
                        ...prev,
                        { service_name: '', description: '', cost_per_unit: '' },
                      ])
                    }
                    className={addRowButtonClass}
                  >
                    Add Row
                  </button>
                </div>
                {services.map((row, index) => (
                  <div
                    key={`service-${index}`}
                    className={`grid gap-4 ${showServiceDescriptionField ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
                  >
                    <div>
                      <label className="text-xs font-semibold text-black">Service Name</label>
                      <input
                        placeholder="e.g., Plumbing, Tutoring"
                        value={row.service_name}
                        onChange={(event) =>
                          setServices((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, service_name: event.target.value } : item,
                            ),
                          )
                        }
                        className={profileLikeInputClass}
                      />
                    </div>
                    {showServiceDescriptionField && (
                      <div>
                        <label className="text-xs font-semibold text-black">Specific Service Description</label>
                        <textarea
                          placeholder={
                            isDemand
                              ? 'Enter specific service description (What do you want?)'
                              : 'Enter specific service description (What you offer?)'
                          }
                          value={row.description}
                          onChange={(event) =>
                            setServices((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, description: event.target.value } : item,
                              ),
                            )
                          }
                          rows={3}
                          className={profileLikeInputClass}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Service Charge (BDT)'}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={isDemand ? 'Enter your budget (BDT)' : 'Enter service cost (BDT)'}
                          value={row.cost_per_unit}
                          onChange={(event) =>
                            setServices((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, cost_per_unit: event.target.value } : item,
                              ),
                            )
                          }
                          className={profileLikeInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                          className={`${removeButtonClass} mt-1.5`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showProductsSection && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-700">Products</p>
                  <button
                    type="button"
                    onClick={() =>
                      setProducts((prev) => [
                        ...prev,
                        { product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 },
                      ])
                    }
                    className={addRowButtonClass}
                  >
                    Add Row
                  </button>
                </div>
                {products.map((row, index) => (
                  <div
                    key={`product-${index}`}
                    className={`grid gap-4 ${isDemand
                      ? showProductDescriptionField
                        ? 'lg:grid-cols-5'
                        : 'lg:grid-cols-4'
                      : showProductDescriptionField
                        ? 'lg:grid-cols-5'
                        : 'lg:grid-cols-4'}`}
                  >
                    <div>
                      <label className="text-xs font-semibold text-black">Product Name</label>
                      <input
                        placeholder="e.g., Laptop, Book"
                        value={row.product_name}
                        onChange={(event) =>
                          setProducts((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, product_name: event.target.value } : item,
                            ),
                          )
                        }
                        className={profileLikeInputClass}
                      />
                    </div>
                    {showProductDescriptionField && (
                      <div>
                        <label className="text-xs font-semibold text-black">Specific Product Description</label>
                        <textarea
                          placeholder={
                            isDemand
                              ? 'Enter specific product description (Actually what type of product?)'
                              : 'Enter specific product description (Actual value of your product)'
                          }
                          value={row.description}
                          onChange={(event) =>
                            setProducts((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, description: event.target.value } : item,
                              ),
                            )
                          }
                          rows={3}
                          className={profileLikeInputClass}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Demanded Product Unit' : 'Available Product Unit'}</label>
                      <select
                        value={row.unit}
                        onChange={(event) =>
                          setProducts((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                          )
                        }
                        className={profileLikeSelectClass}
                      >
                        <option value="">{isDemand ? 'Select demanded unit' : 'Select unit'}</option>
                        {COMMON_PRODUCT_UNITS.map((unitOption) => (
                          <option key={unitOption} value={unitOption}>
                            {unitOption}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Budget per Unit (BDT)' : 'Cost Per Unit (BDT)'}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={isDemand ? 'Enter budget per unit (BDT)' : 'Enter cost per quantity'}
                        value={row.cost_per_unit}
                        onChange={(event) =>
                          setProducts((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, cost_per_unit: event.target.value } : item,
                            ),
                          )
                        }
                        className={profileLikeInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-black">{isDemand ? 'Required Quantity' : 'Available Quantity'}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={isDemand ? 'Enter required quantity' : 'Enter available quantity'}
                          value={row.available_units}
                          onChange={(event) =>
                            setProducts((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, available_units: event.target.value } : item,
                              ),
                            )
                          }
                          className={profileLikeInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setProducts((prev) => prev.filter((_, i) => i !== index))}
                          className={`${removeButtonClass} mt-1.5`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {isLocked && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-black">Description</label>
            <textarea
              value={post.description}
              onChange={(event) => setPost((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className={profileLikeInputClass}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-black">Image</label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className={primaryButtonClass}>
                Choose File
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {imageFile ? (
                <span className="max-w-[230px] truncate text-sm text-slate-600" title={imageFile.name}>{imageFile.name}</span>
              ) : currentImageName ? (
                <span className="max-w-[230px] truncate text-sm text-slate-600" title={currentImageName}>{currentImageName}</span>
              ) : null}
            </div>

            {(previewUrl || post.image) && (
              previewUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm" style={{ width: '4in', height: '4in', maxWidth: '100%' }}>
                  <button
                    type="button"
                    aria-label="Remove selected image"
                    onClick={() => {
                      setImageFile(null)
                      if (imageInputRef.current) imageInputRef.current.value = ''
                    }}
                    className="absolute right-3 top-3 z-10 inline-flex items-center justify-center bg-transparent p-0 text-2xl font-bold leading-none text-white [text-shadow:0_0_10px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-105 hover:text-pink-300 focus-visible:outline-none"
                  >
                    ×
                  </button>
                  <img src={previewUrl} alt="Preview" className="h-full w-full rounded-xl object-cover" />
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm" style={{ width: '4in', height: '4in', maxWidth: '100%' }}>
                  <img src={toMediaUrl(post.image)} alt="Current" className="h-full w-full rounded-xl object-cover" />
                </div>
              )
            )}
          </div>
        </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Post Changes'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="text-xs font-semibold text-violet-700 hover:text-violet-900">Back to Feed</button>
          {message && <p className="text-center text-sm text-slate-600">{message}</p>}
        </div>
      </form>
    </div>
  )
}
