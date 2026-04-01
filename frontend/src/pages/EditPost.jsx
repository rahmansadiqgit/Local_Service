import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
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

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const imageInputRef = useRef(null)

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

  const postId = Number(id)
  const isDemand = post.post_type === 'Demand'

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
            src="/images/edit_post.jpeg"
            alt="Edit post header illustration"
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
                <select
                  value={post.post_type}
                  onChange={(event) => setPost((prev) => ({ ...prev, post_type: event.target.value }))}
                  className={profileLikeSelectClass}
                >
                  {POST_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-black">Post Categories</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => {
                    const selected = selectedCategories.includes(category)
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${selected ? 'bg-violet-600 text-white' : 'border border-violet-300 bg-white text-violet-700'}`}
                      >
                        {category}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-black">Post Title</label>
                <input
                  value={post.post_title}
                  onChange={(event) => setPost((prev) => ({ ...prev, post_title: event.target.value }))}
                  className={profileLikeInputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-black">Brand / Company</label>
                <input
                  value={post.brand_company_name}
                  onChange={(event) => setPost((prev) => ({ ...prev, brand_company_name: event.target.value }))}
                  className={profileLikeInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Location</label>
                <input
                  value={post.location}
                  onChange={(event) => setPost((prev) => ({ ...prev, location: event.target.value }))}
                  className={profileLikeInputClass}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-black">Website</label>
                <input
                  value={post.website_link}
                  onChange={(event) => setPost((prev) => ({ ...prev, website_link: event.target.value }))}
                  className={profileLikeInputClass}
                />
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
                    <input
                      value={row.name}
                      onChange={(event) =>
                        setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                      }
                      placeholder="Skill/Experties Name"
                      className={profileLikeInputClass}
                    />
                    <input
                      value={row.experience}
                      onChange={(event) =>
                        setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, experience: event.target.value } : item)))
                      }
                      placeholder={isDemand ? 'Preferred Experience' : 'Your Experience'}
                      className={profileLikeInputClass}
                    />
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
                    {isDemand && row.unit ? (
                      <input
                        value={row.needed_budget_unit}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, needed_budget_unit: event.target.value } : item)))
                        }
                        placeholder="Needed Hire Unit"
                        className={profileLikeInputClass}
                      />
                    ) : null}
                    <div className="flex gap-2">
                      <input
                        value={row.cost}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, cost: event.target.value } : item)))
                        }
                        placeholder={isDemand ? 'Your Budget (BDT)' : 'Charge (BDT) Per Unit'}
                        className={profileLikeInputClass}
                      />
                      <input
                        value={row.available_person}
                        onChange={(event) =>
                          setExpertises((prev) => prev.map((item, i) => (i === index ? { ...item, available_person: event.target.value } : item)))
                        }
                        placeholder={isDemand ? 'Required Person' : 'Available Person'}
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
                ))}
              </div>
            )}

            {showServicesSection && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-700">Services</p>
                  <button type="button" onClick={() => setServices((prev) => [...prev, { service_name: '', description: '', cost_per_unit: '' }])} className={addRowButtonClass}>Add Row</button>
                </div>
                {services.map((row, index) => (
                  <div key={`service-${index}`} className={`grid gap-4 ${showServiceDescriptionField ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                    <input value={row.service_name} onChange={(event) => setServices((prev) => prev.map((item, i) => i === index ? { ...item, service_name: event.target.value } : item))} placeholder="Service Name" className={profileLikeInputClass} />
                    {showServiceDescriptionField && (
                      <textarea value={row.description} onChange={(event) => setServices((prev) => prev.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} rows={3} placeholder={isDemand ? 'Enter specific service description (What do you want?)' : 'Enter specific service description (What you offer?)'} className={profileLikeInputClass} />
                    )}
                    <div className="flex gap-2">
                      <input value={row.cost_per_unit} onChange={(event) => setServices((prev) => prev.map((item, i) => i === index ? { ...item, cost_per_unit: event.target.value } : item))} placeholder={isDemand ? 'Your Budget (BDT)' : 'Service Charge (BDT)'} className={profileLikeInputClass} />
                      <button type="button" onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))} className={`${removeButtonClass} mt-1.5`}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showProductsSection && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-700">Products</p>
                  <button type="button" onClick={() => setProducts((prev) => [...prev, { product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 }])} className={addRowButtonClass}>Add Row</button>
                </div>
                {products.map((row, index) => (
                  <div key={`product-${index}`} className={`grid gap-4 ${showProductDescriptionField ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    <input value={row.product_name} onChange={(event) => setProducts((prev) => prev.map((item, i) => i === index ? { ...item, product_name: event.target.value } : item))} placeholder="Product Name" className={profileLikeInputClass} />
                    {showProductDescriptionField && (
                      <textarea value={row.description} onChange={(event) => setProducts((prev) => prev.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} rows={3} placeholder={isDemand ? 'Enter specific product description (Actually what type of product?)' : 'Enter specific product description (Actual value of your product)'} className={profileLikeInputClass} />
                    )}
                    <select value={row.unit} onChange={(event) => setProducts((prev) => prev.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} className={profileLikeSelectClass}>
                      <option value="">{isDemand ? 'Select demanded unit' : 'Select unit'}</option>
                      {COMMON_PRODUCT_UNITS.map((unitOption) => (
                        <option key={unitOption} value={unitOption}>{unitOption}</option>
                      ))}
                    </select>
                    <input value={row.cost_per_unit} onChange={(event) => setProducts((prev) => prev.map((item, i) => i === index ? { ...item, cost_per_unit: event.target.value } : item))} placeholder={isDemand ? 'Budget per Unit (BDT)' : 'Cost Per Unit (BDT)'} className={profileLikeInputClass} />
                    <input
                      value={row.available_units}
                      onChange={(event) =>
                        setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, available_units: event.target.value } : item)))
                      }
                      placeholder={isDemand ? 'Required Quantity' : 'Available Quantity'}
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
                ))}
              </div>
            )}
          </>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-black">Description</label>
            <textarea
              value={post.description}
              onChange={(event) => setPost((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
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
              {imageFile && <span className="max-w-[230px] truncate text-sm text-slate-600">{imageFile.name}</span>}
            </div>

            {(previewUrl || post.image) && (
              <div className="mt-3 w-fit max-w-full rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm" style={{ width: '4in', height: '4in', maxWidth: '100%' }}>
                <img src={previewUrl || toMediaUrl(post.image)} alt="Preview" className="h-full w-full rounded-xl object-cover" />
              </div>
            )}
          </div>
        </div>

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
