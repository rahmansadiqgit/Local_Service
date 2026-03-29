import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import LocationPickerMap from '../components/LocationPickerMap'

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

const initialPost = {
  post_type: 'Supply',
  post_name: '',
  post_title: '',
  description: '',
  brand_company_name: '',
  location: '',
  latitude: '',
  longitude: '',
  website_link: '',
}

const toCoordinateOrNull = (value) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export default function CreatePost() {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const geocodeRequestRef = useRef(0)
  const postTypeMenuRef = useRef(null)
  const categoryMenuRef = useRef(null)
  const [post, setPost] = useState(initialPost)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showPostTypeMenu, setShowPostTypeMenu] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [skills, setSkills] = useState([
    { skill_name: '', cost_per_unit: '' },
  ])
  const [expertises, setExpertises] = useState([
    { name: '', experience: '', unit: '', needed_budget_unit: '', cost: '', available_person: 0 },
  ])
  const [services, setServices] = useState([
    { service_name: '', description: '', cost_per_unit: '' },
  ])
  const [products, setProducts] = useState([
    { product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 },
  ])
  const [locationLoading, setLocationLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Handle click outside dropdown to close it
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

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(imageFile)
    } else {
      setPreviewUrl(null)
    }
  }, [imageFile])

  const geocodeLocationQuery = async (rawQuery, { replaceInputText = false } = {}) => {
    const query = String(rawQuery || '').trim()
    if (query.length < 2) return false

    const requestId = ++geocodeRequestRef.current
    setLocationLoading(true)

    try {
      const urls = [
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          `${query}, Bangladesh`,
        )}&format=jsonv2&limit=1&countrycodes=bd`,
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=jsonv2&limit=1&countrycodes=bd`,
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=jsonv2&limit=1`,
      ]

      let first = null

      for (const url of urls) {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
        })

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
    } catch (error) {
      console.warn('Forward geocoding failed:', error)
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

    if (!query || hasCoordinates) {
      return
    }

    const timeoutId = setTimeout(async () => {
      await geocodeLocationQuery(query, { replaceInputText: false })
    }, 700)

    return () => clearTimeout(timeoutId)
  }, [post.location, post.latitude, post.longitude])
  const handleChange = (event) => {
    const { name, value } = event.target
    setPost((prev) => ({ ...prev, [name]: value }))
    // Close dropdown when interacting with other form fields
    setShowPostTypeMenu(false)
    setShowCategoryMenu(false)
  }

  const handlePostTypeSelect = (value) => {
    setPost((prev) => ({ ...prev, post_type: value }))
    setShowPostTypeMenu(false)
  }

  const handleLocationInputChange = (event) => {
    const value = event.target.value
    setPost((prev) => ({
      ...prev,
      location: value,
      latitude: '',
      longitude: '',
    }))
    setShowPostTypeMenu(false)
    setShowCategoryMenu(false)
  }

  const handleLocationInputBlur = async () => {
    const query = post.location?.trim()
    const hasCoordinates =
      toCoordinateOrNull(post.latitude) !== null &&
      toCoordinateOrNull(post.longitude) !== null

    if (!query || hasCoordinates) return
    await geocodeLocationQuery(query, { replaceInputText: true })
  }

  const handleLocationInputKeyDown = async (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()

    const query = post.location?.trim()
    if (!query) return
    await geocodeLocationQuery(query, { replaceInputText: true })
  }

  const handleMapLocationPick = async (lat, lng) => {
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
        {
          headers: {
            Accept: 'application/json',
          },
        },
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
        setPost((prev) => ({
          ...prev,
          location: resolvedLocation,
        }))
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error)
    } finally {
      setLocationLoading(false)
    }
  }
  const toggleCategory = (category) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]

      setPost((current) => ({
        ...current,
        post_name: next.join(', '),
      }))

      return next
    })
    // Don't close dropdown on category selection
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    if (selectedCategories.length === 0) {
      setMessage('Please select at least one post category.')
      setSaving(false)
      return
    }

    const expertiseDurationMissing = expertises.some((item) => {
      const hasAnyValue = item.name || item.experience || item.cost || String(item.available_person || '').trim()
      return hasAnyValue && !item.unit
    })

    const expertiseBudgetUnitAmountMissing = isDemand && expertises.some((item) => {
      const hasAnyValue = item.name || item.experience || item.cost || String(item.available_person || '').trim()
      return hasAnyValue && item.unit && Number(item.needed_budget_unit || 0) <= 0
    })

    if (showExpertiseSection && expertiseDurationMissing) {
      setMessage(isDemand ? 'Please select Hire Unit for all expertise rows.' : 'Please select Work Type for all expertise rows.')
      setSaving(false)
      return
    }

    if (showExpertiseSection && expertiseBudgetUnitAmountMissing) {
      setMessage('Needed Hire Unit must be greater than 0 for all expertise rows.')
      setSaving(false)
      return
    }

    const productQuantityMissing = products.some((item) => {
      const hasAnyValue = item.product_name || item.description || item.cost_per_unit || String(item.unit || '').trim()
      return hasAnyValue && Number(item.available_units || 0) <= 0
    })

    if (showProductsSection && productQuantityMissing) {
      setMessage('Required Quantity must be greater than 0 for all product rows.')
      setSaving(false)
      return
    }

    try {
      const payload = new FormData()
      Object.entries(post).forEach(([key, value]) => {
        payload.append(key, value ?? '')
      })
      if (imageFile) {
        payload.append('image', imageFile)
      }

      const { data: createdPost } = await api.post('/posts/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const validSkills = skills.filter((item) => item.skill_name && item.cost_per_unit)
      const validExpertises = expertises.filter((item) => item.name && item.experience && item.unit && item.cost)
      const validServices = services.filter((item) => item.service_name && item.cost_per_unit)
      const validProducts = products.filter(
        (item) => item.product_name && item.cost_per_unit && (post.post_type === 'Demand' || item.unit),
      )

      await Promise.all([
        ...validSkills.map((item) =>
          api.post('/skills/', {
            ...item,
            skill_name: `__expertise__::${item.skill_name}`,
            post: createdPost.id,
          }),
        ),
        ...validExpertises.map((item) =>
          api.post('/expertises/', {
            name: item.name,
            experience: item.experience,
            unit: item.unit,
            needed_budget_unit: Number(item.needed_budget_unit) || 0,
            cost: Number(item.cost),
            available_person: Number(item.available_person) || 0,
            post: createdPost.id,
          }),
        ),
        ...validServices.map((item) =>
          api.post('/skills/', {
            skill_name: `__service__::${item.service_name}`,
            description: item.description,
            cost_per_unit: item.cost_per_unit,
            post: createdPost.id,
          }),
        ),
        ...validProducts.map((item) =>
          api.post('/products/', {
            ...item,
            unit: item.unit || (post.post_type === 'Demand' ? 'quantity' : item.unit),
            post: createdPost.id,
          }),
        ),
      ])
      setMessage('Post created successfully.')
      setPost(initialPost)
      setSelectedCategories([])
      setShowCategoryMenu(false)
      setImageFile(null)
      setSkills([{ skill_name: '', cost_per_unit: '' }])
      setExpertises([{ name: '', experience: '', unit: '', needed_budget_unit: '', cost: '', available_person: 0 }])
      setServices([{ service_name: '', description: '', cost_per_unit: '' }])
      setProducts([{ product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 }])
      window.dispatchEvent(new Event('post-created'))
      window.dispatchEvent(new Event('localix:notifications-refresh'))
      navigate('/')
    } catch (error) {
      console.error(error)
      const responseData = error.response?.data
      let errorMessage = responseData?.detail || responseData?.message

      if (!errorMessage && responseData && typeof responseData === 'object') {
        const fieldErrors = Object.entries(responseData)
          .map(([field, value]) => {
            if (Array.isArray(value)) {
              return `${field}: ${value.join(', ')}`
            }
            return `${field}: ${String(value)}`
          })
          .join(' | ')
        errorMessage = fieldErrors
      }

      if (!errorMessage) {
        errorMessage = error.message || 'Unknown error'
      }

      setMessage(`Failed to create post: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const hasSelectedCategories = selectedCategories.length > 0
  const showExpertiseSection = hasSelectedCategories && selectedCategories.includes('Expertise')
  const showServicesSection = hasSelectedCategories && selectedCategories.includes('Services')
  const showProductsSection = hasSelectedCategories && selectedCategories.includes('Product')
  const showServiceDescriptionField = showServicesSection && (showExpertiseSection || showProductsSection)
  const showProductDescriptionField = showProductsSection && (showExpertiseSection || showServicesSection)
  const isDemand = post.post_type === 'Demand'
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
              Create Post
            </h2>
            <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Publish a new available or demand listing.</p>
          </div>
          <img
            src="/images/create_post.png"
            alt="Create post header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card space-y-6 rounded-2xl border border-violet-200/80 p-4 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(236, 225, 255, 0.56)',
          backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.58), rgba(244, 230, 255, 0.54))',
        }}
      >
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
              type="text"
              name="post_title"
              value={post.post_title}
              onChange={handleChange}
              onFocus={() => setShowCategoryMenu(false)}
              placeholder="Give your post a descriptive title"
              className={profileLikeInputClass}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-black">Description</label>
            <textarea
              name="description"
              value={post.description}
              onChange={handleChange}
              onFocus={() => setShowCategoryMenu(false)}
              rows={3}
              className={profileLikeInputClass}
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-black">Brand / Company</label>
              <input
                name="brand_company_name"
                value={post.brand_company_name}
                onChange={handleChange}
                onFocus={() => setShowCategoryMenu(false)}
                className={profileLikeInputClass}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-black">Image</label>
              <div className="mt-1 flex items-start gap-4">
                <div className="flex flex-col items-start gap-2">
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
                  {imageFile && (
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      {imageFile.name}
                      <button
                        type="button"
                        aria-label="Remove selected image"
                        onClick={() => {
                          setImageFile(null)
                          if (imageInputRef.current) {
                            imageInputRef.current.value = ''
                          }
                        }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
                      >
                        x
                      </button>
                    </span>
                  )}
                </div>
                {previewUrl && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-black">Website</label>
              <input
                name="website_link"
                value={post.website_link}
                onChange={handleChange}
                onFocus={() => setShowCategoryMenu(false)}
                className={profileLikeInputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black">Location</label>
            <input
              name="location"
              value={post.location}
              onChange={handleLocationInputChange}
              onBlur={handleLocationInputBlur}
              onKeyDown={handleLocationInputKeyDown}
              onFocus={() => setShowCategoryMenu(false)}
              required
              placeholder="Type location or pick from map"
              className={profileLikeInputClass}
            />
            <div className="mt-2">
              <LocationPickerMap
                latitude={post.latitude}
                longitude={post.longitude}
                onPick={handleMapLocationPick}
                mapSizeInches={5}
                selectedZoom={7}
                popupText="Confirm this location?"
              />
            </div>
          </div>
        </div>

        {!hasSelectedCategories && (
          <p className="rounded-xl border border-violet-200/80 bg-white/70 px-3 py-2 text-sm text-violet-800">
            Select one or more post categories to start adding rows.
          </p>
        )}

        {showExpertiseSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Expertise</p>
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
                <label className="text-xs font-semibold text-black">{isDemand ? 'Expertise Name' : 'Skill / Expertise Name'}</label>
                <input
                  placeholder={isDemand ? 'e.g., Electricians, Teachers' : 'e.g., Electricians, Teachers'}
                  value={row.name}
                  onChange={(event) =>
                    setExpertises((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  className={profileLikeInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Preferred Experience' : 'Experience'}</label>
                <input
                  type="text"
                  placeholder={isDemand ? '(Optional) e.g., 6 years' : '(Optional) e.g., 6 years'}
                  value={row.experience}
                  onChange={(event) =>
                    setExpertises((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, experience: event.target.value } : item,
                      ),
                    )
                  }
                  className={profileLikeInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Hire Unit' : 'Work Type'}</label>
                <select
                  value={row.unit}
                  onChange={(event) =>
                    setExpertises((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, unit: event.target.value } : item,
                      ),
                    )
                  }
                  className={profileLikeSelectClass}
                >
                  <option
                    value=""
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                  >
                    {isDemand ? 'Select hire unit' : 'Select duration'}
                  </option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {isDemand && row.unit ? (
                <div>
                  <label className="text-xs font-semibold text-black">Needed Hire Unit</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={
                      row.unit === 'hourly'
                        ? 'e.g., 2 (hours)'
                        : row.unit === 'daily'
                          ? 'e.g., 3 (days)'
                          : 'e.g., 1 (months)'
                    }
                    value={row.needed_budget_unit}
                    onChange={(event) =>
                      setExpertises((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, needed_budget_unit: event.target.value } : item,
                        ),
                      )
                    }
                    className={profileLikeInputClass}
                  />
                </div>
              ) : null}
              <div>
                <label className="text-xs font-semibold text-black">
                  {isDemand
                    ? row.unit === 'hourly'
                      ? 'Your Hourly Budget (BDT)'
                      : row.unit === 'daily'
                        ? 'Your Daily Budget (BDT)'
                        : row.unit === 'monthly'
                          ? 'Your Monthly Budget (BDT)'
                          : 'Your Budget (BDT)'
                    : 'Charge (BDT)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    isDemand
                      ? row.unit === 'hourly'
                        ? 'Enter your hourly budget (BDT)'
                        : row.unit === 'daily'
                          ? 'Enter your daily budget (BDT)'
                          : row.unit === 'monthly'
                            ? 'Enter your monthly budget (BDT)'
                            : 'Enter your budget (BDT)'
                      : 'Enter charge amount (BDT)'
                  }
                  value={row.cost}
                  onChange={(event) =>
                    setExpertises((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, cost: event.target.value } : item,
                      ),
                    )
                  }
                  className={profileLikeInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Required Person' : 'Available Person'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={isDemand ? 'Enter required persons' : 'Enter available persons'}
                    value={row.available_person}
                    onChange={(event) =>
                      setExpertises((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, available_person: event.target.value }
                            : item,
                        ),
                      )
                    }
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
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Services</p>
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
                    placeholder="Enter specific service description"
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
                <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Service Cost (BDT)'}</label>
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
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Products</p>
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
                  ? 'lg:grid-cols-4'
                  : 'lg:grid-cols-3'
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
                    placeholder="Enter specific product description"
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
              {!isDemand && (
                <div>
                  <label className="text-xs font-semibold text-black">Unit</label>
                  <select
                    value={row.unit}
                    onChange={(event) =>
                      setProducts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                      )
                    }
                    className={profileLikeSelectClass}
                  >
                    <option
                      value=""
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                      style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                    >
                      Select unit
                    </option>
                    {COMMON_PRODUCT_UNITS.map((unitOption) => (
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Cost per Unit'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={isDemand ? 'Enter your budget (BDT)' : 'Enter cost per quantity'}
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

        <div className="flex flex-col items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Publish Post'}
          </button>
          {message && <p className="text-center text-sm text-slate-500">{message}</p>}
        </div>
      </form>
    </div>
  )
}
