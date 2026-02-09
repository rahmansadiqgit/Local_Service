import { useState } from 'react'
import api from '../api/client'

const initialPost = {
  post_type: 'Supply',
  post_name: '',
  brand_company_name: '',
  location: '',
  service_type: 'Skill',
  website_link: '',
}

export default function CreatePost() {
  const [post, setPost] = useState(initialPost)
  const [skill, setSkill] = useState({ skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 })
  const [product, setProduct] = useState({ product_name: '', unit: '', cost_per_unit: '', available_units: 0 })
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
      const { data: createdPost } = await api.post('/posts/', post)
      if (post.service_type === 'Skill') {
        await api.post('/skills/', { ...skill, post: createdPost.id })
      } else {
        await api.post('/products/', { ...product, post: createdPost.id })
      }
      setMessage('Post created successfully.')
      setPost(initialPost)
      setSkill({ skill_name: '', unit: '', cost_per_unit: '', available_workers: 0 })
      setProduct({ product_name: '', unit: '', cost_per_unit: '', available_units: 0 })
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
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Skill Name</label>
              <input
                value={skill.skill_name}
                onChange={(event) => setSkill((prev) => ({ ...prev, skill_name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Unit</label>
              <input
                value={skill.unit}
                onChange={(event) => setSkill((prev) => ({ ...prev, unit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Cost per Unit</label>
              <input
                type="number"
                value={skill.cost_per_unit}
                onChange={(event) => setSkill((prev) => ({ ...prev, cost_per_unit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Available Workers</label>
              <input
                type="number"
                value={skill.available_workers}
                onChange={(event) => setSkill((prev) => ({ ...prev, available_workers: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Product Name</label>
              <input
                value={product.product_name}
                onChange={(event) => setProduct((prev) => ({ ...prev, product_name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Unit</label>
              <input
                value={product.unit}
                onChange={(event) => setProduct((prev) => ({ ...prev, unit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Cost per Unit</label>
              <input
                type="number"
                value={product.cost_per_unit}
                onChange={(event) => setProduct((prev) => ({ ...prev, cost_per_unit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Available Units</label>
              <input
                type="number"
                value={product.available_units}
                onChange={(event) => setProduct((prev) => ({ ...prev, available_units: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
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
