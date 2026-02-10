import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const initialPost = {
  post_type: 'Supply',
  post_name: '',
  description: '',
  brand_company_name: '',
  location: '',
  service_type: 'Skill',
  website_link: '',
}

export default function CreatePost() {
  const navigate = useNavigate()
  const [post, setPost] = useState(initialPost)
  const [imageFile, setImageFile] = useState(null)
  const [skills, setSkills] = useState([
    { skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 },
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

      if (post.service_type === 'Skill') {
        const validSkills = skills.filter((item) => item.skill_name)
        await Promise.all(
          validSkills.map((item) => api.post('/skills/', { ...item, post: createdPost.id })),
        )
      } else {
        const validProducts = products.filter((item) => item.product_name)
        await Promise.all(
          validProducts.map((item) => api.post('/products/', { ...item, post: createdPost.id })),
        )
      }
      setMessage('Post created successfully.')
      setPost(initialPost)
      setImageFile(null)
      setSkills([{ skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 }])
      setProducts([{ product_name: '', unit: '', cost_per_unit: '', available_units: 0 }])
      window.dispatchEvent(new Event('post-created'))
      navigate('/')
    } catch (error) {
      console.error(error)
      setMessage('Failed to create post. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Create Post</h2>
        <p className="text-sm text-slate-500">Publish a new supply or demand listing.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Type</label>
            <select
              name="post_type"
              value={post.post_type}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option>Supply</option>
              <option>Demand</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Service Type</label>
            <select
              name="service_type"
              value={post.service_type}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option>Skill</option>
              <option>Product</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Post Name</label>
            <input
              name="post_name"
              value={post.post_name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              name="description"
              value={post.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Brand / Company</label>
            <input
              name="brand_company_name"
              value={post.brand_company_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Location</label>
            <input
              name="location"
              value={post.location}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Website</label>
            <input
              name="website_link"
              value={post.website_link}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        {post.service_type === 'Skill' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Skills</p>
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
                <input
                  placeholder="Skill Name"
                  value={row.skill_name}
                  onChange={(event) =>
                    setSkills((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, skill_name: event.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(event) =>
                    setSkills((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
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
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
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
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((_, i) => i !== index))}
                    className="mt-1 rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Products</p>
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
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(event) =>
                    setProducts((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: event.target.value } : item)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
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
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
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
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setProducts((prev) => prev.filter((_, i) => i !== index))}
                    className="mt-1 rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-70"
          >
            {saving ? 'Publishing...' : 'Publish Post'}
          </button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </div>
      </form>
    </div>
  )
}
