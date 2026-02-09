import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import NotificationPanel from '../components/NotificationPanel'
import PostCard from '../components/PostCard'

export default function HomeFeed() {
  const [posts, setPosts] = useState([])
  const [skills, setSkills] = useState([])
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    postType: 'Demand',
    location: '',
    minCost: '',
    maxCost: '',
    rating: '',
  })
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [postRes, skillRes, productRes, ratingRes, noteRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/skills/'),
          api.get('/products/'),
          api.get('/ratings/'),
          api.get('/notifications/'),
        ])
        if (!active) return
        setPosts(postRes.data)
        setSkills(skillRes.data)
        setProducts(productRes.data)
        setRatings(ratingRes.data)
        setNotifications(noteRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const skillsByPost = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[skill.post] = acc[skill.post] || []
      acc[skill.post].push(skill)
      return acc
    }, {})
  }, [skills])

  const productsByPost = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.post] = acc[product.post] || []
      acc[product.post].push(product)
      return acc
    }, {})
  }, [products])

  const ratingByPost = useMemo(() => {
    return ratings.reduce((acc, rating) => {
      acc[rating.post] = rating
      return acc
    }, {})
  }, [ratings])

  const costSummaryByPost = useMemo(() => {
    const map = {}
    posts.forEach((post) => {
      const skillCosts = (skillsByPost[post.id] || []).map((item) =>
        Number(item.cost_per_unit || 0),
      )
      const productCosts = (productsByPost[post.id] || []).map((item) =>
        Number(item.cost_per_unit || 0),
      )
      const allCosts = [...skillCosts, ...productCosts]
      const min = allCosts.length ? Math.min(...allCosts) : 0
      const max = allCosts.length ? Math.max(...allCosts) : 0
      map[post.id] = { min, max }
    })
    return map
  }, [posts, productsByPost, skillsByPost])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.postType && post.post_type !== filters.postType) return false
      if (filters.location && !post.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false
      }
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const haystack = `${post.post_name} ${post.brand_company_name || ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }

      const cost = costSummaryByPost[post.id] || { min: 0, max: 0 }
      if (filters.minCost && cost.min < Number(filters.minCost)) return false
      if (filters.maxCost && cost.max > Number(filters.maxCost)) return false

      const ratingValue = ratingByPost[post.id]?.rating_value || 0
      if (filters.rating && ratingValue < Number(filters.rating)) return false
      return true
    })
  }, [posts, filters, costSummaryByPost, ratingByPost])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleAction = async (post, actionType) => {
    setActionMessage('')
    try {
      const title = actionType === 'apply' ? 'New Application' : 'New Booking'
      const message = `${title} for ${post.post_name} (${post.post_type}).`
      const { data } = await api.post('/notifications/', {
        title,
        message,
      })
      setNotifications((prev) => [data, ...prev])
      setActionMessage('Action sent and notification created.')
    } catch (error) {
      console.error(error)
      setActionMessage('Action failed. Please try again.')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Home Feed</h2>
            <p className="text-sm text-slate-500">Browse the latest supply & demand posts.</p>
          </div>
          <div className="flex gap-2">
            {['Demand', 'Supply'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, postType: type }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filters.postType === type
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="card grid gap-4 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Search</label>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Post name or brand"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Location</label>
            <input
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="City"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Min Cost</label>
            <input
              name="minCost"
              type="number"
              value={filters.minCost}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Max Cost</label>
            <input
              name="maxCost"
              type="number"
              value={filters.maxCost}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Rating</label>
            <select
              name="rating"
              value={filters.rating}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Any</option>
              <option value="5">5+</option>
              <option value="4">4+</option>
              <option value="3">3+</option>
              <option value="2">2+</option>
              <option value="1">1+</option>
            </select>
          </div>
        </div>

        {actionMessage && <div className="card text-sm text-slate-500">{actionMessage}</div>}

        {loading ? (
          <div className="card">Loading feed...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="card">No posts match your filters.</div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              skills={skillsByPost[post.id] || []}
              products={productsByPost[post.id] || []}
              rating={ratingByPost[post.id]}
              profile={{
                name: post.brand_company_name || 'Localix Member',
                status: post.location ? `Serving ${post.location}` : 'Available',
              }}
              onAction={handleAction}
            />
          ))
        )}
      </section>

      <aside className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold">Quick filters</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <div className="flex items-center justify-between">
              <span>Location</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {filters.location || 'Any'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Type</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {filters.postType}
              </span>
            </div>
          </div>
        </div>
        <NotificationPanel notifications={notifications} />
      </aside>
    </div>
  )
}
