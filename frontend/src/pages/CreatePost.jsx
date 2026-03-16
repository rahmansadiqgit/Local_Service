import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const initialPost = {
  post_type: 'Supply',
  post_name: '',
  description: '',
  brand_company_name: '',
  location: '',
  website_link: '',
}

export default function CreatePost() {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [post, setPost] = useState(initialPost)
  const [imageFile, setImageFile] = useState(null)
  const [skills, setSkills] = useState([
    { skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 },
  ])
  const [services, setServices] = useState([
    { service_name: '', unit: '', cost_per_unit: '', available_workers: 0 },
  ])
  const [products, setProducts] = useState([
    { product_name: '', unit: '', cost_per_unit: '', available_units: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setPost((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
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
      const validServices = services.filter((item) => item.service_name && item.cost_per_unit)
      const validProducts = products.filter((item) => item.product_name && item.cost_per_unit)

      await Promise.all([
        ...validSkills.map((item) => api.post('/skills/', { ...item, post: createdPost.id })),
        ...validServices.map((item) => api.post('/skills/', { skill_name: item.service_name, unit: item.unit, cost_per_unit: item.cost_per_unit, available_workers: item.available_workers, post: createdPost.id })),
        ...validProducts.map((item) => api.post('/products/', { ...item, post: createdPost.id })),
      ])
      setMessage('Post created successfully.')
      setPost(initialPost)
      setImageFile(null)
      setSkills([{ skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 }])
      setServices([{ service_name: '', unit: '', cost_per_unit: '', available_workers: 0 }])
      setProducts([{ product_name: '', unit: '', cost_per_unit: '', available_units: 0 }])
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

  const showAllSections = post.post_name === ''
  const showExpertiseSection = showAllSections || post.post_name === 'Expertise'
  const showServicesSection = showAllSections || post.post_name === 'Services'
  const showProductsSection = showAllSections || post.post_name === 'Product'

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold">Create Post</h2>
        <p className="text-sm text-slate-500">Publish a new supply or demand listing.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-black">Post Type</label>
            <select
              name="post_type"
              value={post.post_type}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="Supply">Available</option>
              <option value="Demand">Demand</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-black">Post Categories</label>
            <select
              name="post_name"
              value={post.post_name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select a category</option>
              <option value="Expertise">Expertise</option>
              <option value="Services">Services</option>
              <option value="Product">Product</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-black">Description</label>
            <textarea
              name="description"
              value={post.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-black">Brand / Company</label>
            <input
              name="brand_company_name"
              value={post.brand_company_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-black">Location</label>
            <input
              name="location"
              value={post.location}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-black">Image</label>
            <div className="mt-1">
              <label className="inline-block cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
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
                <span className="ml-3 inline-flex items-center gap-2 text-sm text-slate-600">
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
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    x
                  </button>
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-black">Website</label>
            <input
              name="website_link"
              value={post.website_link}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
            />
          </div>
        </div>

        {showExpertiseSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Expertise</p>
            <button
              type="button"
              onClick={() =>
                setSkills((prev) => [
                  ...prev,
                  { skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 },
                ])
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Add Row
            </button>
          </div>
          {skills.map((row, index) => (
            <div key={`skill-${index}`} className="grid gap-4 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-black">Expertise Name</label>
                <input
                  placeholder="Expertise Name"
                  value={row.skill_name}
                  onChange={(event) =>
                    setSkills((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, skill_name: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm  "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Unit</label>
                <input
                  placeholder="e.g., Hours, Days"
                  value={row.unit}
                  onChange={(event) =>
                    setSkills((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Cost per Unit</label>
                <input
                  type="number"
                  placeholder="Cost per Unit"
                  value={row.cost_per_unit}
                  onChange={(event) =>
                    setSkills((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, cost_per_unit: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Available Workers</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Workers"
                    value={row.available_workers}
                    onChange={(event) =>
                      setSkills((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, available_workers: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                  />
                  <button
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((_, i) => i !== index))}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  { service_name: '', unit: '', cost_per_unit: '', available_workers: 0 },
                ])
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Add Row
            </button>
          </div>
          {services.map((row, index) => (
            <div key={`service-${index}`} className="grid gap-4 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-black">Service Name</label>
                <input
                  placeholder="Service Name"
                  value={row.service_name}
                  onChange={(event) =>
                    setServices((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, service_name: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Unit</label>
                <input
                  placeholder="e.g., Hours, Days"
                  value={row.unit}
                  onChange={(event) =>
                    setServices((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Cost per Unit</label>
                <input
                  type="number"
                  placeholder="Cost per Unit"
                  value={row.cost_per_unit}
                  onChange={(event) =>
                    setServices((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, cost_per_unit: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Available Workers</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Workers"
                    value={row.available_workers}
                    onChange={(event) =>
                      setServices((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, available_workers: event.target.value } : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  { product_name: '', unit: '', cost_per_unit: '', available_units: 0 },
                ])
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Add Row
            </button>
          </div>
          {products.map((row, index) => (
            <div key={`product-${index}`} className="grid gap-4 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-black">Product Name</label>
                <input
                  placeholder="Product Name"
                  value={row.product_name}
                  onChange={(event) =>
                    setProducts((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, product_name: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Unit</label>
                <input
                  placeholder="e.g., Kg, Liters"
                  value={row.unit}
                  onChange={(event) =>
                    setProducts((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Cost per Unit</label>
                <input
                  type="number"
                  placeholder="Cost per Unit"
                  value={row.cost_per_unit}
                  onChange={(event) =>
                    setProducts((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, cost_per_unit: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black">Available Units</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Units"
                    value={row.available_units}
                    onChange={(event) =>
                      setProducts((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, available_units: event.target.value } : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm "
                  />
                  <button
                    type="button"
                    onClick={() => setProducts((prev) => prev.filter((_, i) => i !== index))}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publishing...' : 'Publish Post'}
          </button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </div>
      </form>
    </div>
  )
}
