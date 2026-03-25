import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const CATEGORY_OPTIONS = ['Expertise', 'Services', 'Product']

const initialPost = {
  post_type: 'Supply',
  post_name: '',
  post_title: '',
  description: '',
  brand_company_name: '',
  location: '',
  website_link: '',
}

export default function CreatePost() {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const categoryMenuRef = useRef(null)
  const [post, setPost] = useState(initialPost)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [skills, setSkills] = useState([
    { skill_name: '', unit: '', cost_per_unit: '' },
  ])
  const [expertises, setExpertises] = useState([
    { name: '', experience: '', unit: '', cost: '', available_person: 0 },
  ])
  const [services, setServices] = useState([
    { service_name: '', description: '', unit: '', cost_per_unit: '' },
  ])
  const [products, setProducts] = useState([
    { product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setShowCategoryMenu(false)
      }
    }

    if (showCategoryMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryMenu])

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

  const handleChange = (event) => {
    const { name, value } = event.target
    setPost((prev) => ({ ...prev, [name]: value }))
    // Close dropdown when interacting with other form fields
    setShowCategoryMenu(false)
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
      const validExpertises = expertises.filter((item) => item.name && item.experience && item.cost)
      const validServices = services.filter((item) => item.service_name && item.cost_per_unit)
      const validProducts = products.filter((item) => item.product_name && item.cost_per_unit)

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
            cost: Number(item.cost),
            available_person: Number(item.available_person) || 0,
            post: createdPost.id,
          }),
        ),
        ...validServices.map((item) =>
          api.post('/skills/', {
            skill_name: `__service__::${item.service_name}`,
            description: item.description,
            unit: item.unit,
            cost_per_unit: item.cost_per_unit,
            post: createdPost.id,
          }),
        ),
        ...validProducts.map((item) => api.post('/products/', { ...item, post: createdPost.id })),
      ])
      setMessage('Post created successfully.')
      setPost(initialPost)
      setSelectedCategories([])
      setShowCategoryMenu(false)
      setImageFile(null)
      setSkills([{ skill_name: '', unit: '', cost_per_unit: '' }])
      setExpertises([{ name: '', experience: '', unit: '', cost: '', available_person: 0 }])
      setServices([{ service_name: '', description: '', unit: '', cost_per_unit: '' }])
      setProducts([{ product_name: '', description: '', unit: '', cost_per_unit: '', available_units: 0 }])
      window.dispatchEvent(new Event('post-created'))
      navigate('/')
    } catch (error) {
      console.error(error)
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error'
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
            <select
              name="post_type"
              value={post.post_type}
              onChange={handleChange}
              onFocus={() => setShowCategoryMenu(false)}
              className={profileLikeInputClass}
            >
              <option value="Supply">Sell / Offer Something (Available)</option>
              <option value="Demand">Ask / Request Something (Demand)</option>
            </select>
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
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                  {CATEGORY_OPTIONS.map((category) => {
                    const checked = selectedCategories.includes(category)
                    return (
                      <label
                        key={category}
                        className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-slate-50"
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
            <label className="text-xs font-semibold text-black">Location</label>
            <input
              name="location"
              value={post.location}
              onChange={handleChange}
              onFocus={() => setShowCategoryMenu(false)}
              required
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
                  { name: '', experience: '', unit: '', cost: '', available_person: 0 },
                ])
              }
              className={addRowButtonClass}
            >
              Add Row
            </button>
          </div>
          {expertises.map((row, index) => (
            <div key={`expertise-${index}`} className="grid gap-4 lg:grid-cols-5">
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
                <label className="text-xs font-semibold text-black">{isDemand ? 'Work Duration Needed' : 'Work Type'}</label>
                <select
                  value={row.unit}
                  onChange={(event) =>
                    setExpertises((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, unit: event.target.value } : item,
                      ),
                    )
                  }
                  className={profileLikeInputClass}
                >
                  <option value="">Select duration</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Charge (BDT)'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={isDemand ? 'Enter your budget (BDT)' : 'Enter charge amount (BDT)'}
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
                  { service_name: '', description: '', unit: '', cost_per_unit: '' },
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
              className={`grid gap-4 ${showServiceDescriptionField ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
            >
              <div>
                <label className="text-xs font-semibold text-black">Service Name</label>
                <input
                  placeholder="Enter service Name(e.g., Plumbing, Tutoring)"
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
                  <label className="text-xs font-semibold text-black">Service Description</label>
                  <textarea
                    placeholder="Enter service description"
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
                <label className="text-xs font-semibold text-black">{isDemand ? 'Service Duration Needed' : 'Service Duration'}</label>
                <select
                  value={row.unit}
                  onChange={(event) =>
                    setServices((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className={profileLikeInputClass}
                >
                  <option value="">Select duration</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
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
                  placeholder="Enter product Name (e.g., Laptop, Book)"
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
                  <label className="text-xs font-semibold text-black">Product Description</label>
                  <textarea
                    placeholder="Enter product description"
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
                  <label className="text-xs font-semibold text-black">Quantity</label>
                  <input
                    placeholder="e.g., Kg, Liters, Pieces"
                    value={row.unit}
                    onChange={(event) =>
                      setProducts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                      )
                    }
                    className={profileLikeInputClass}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-black">{isDemand ? 'Your Budget (BDT)' : 'Cost per Quantity'}</label>
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
