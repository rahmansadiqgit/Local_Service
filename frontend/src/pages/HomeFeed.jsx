import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PostCard from '../components/PostCard'
import useAuth from '../context/useAuth'

export default function HomeFeed() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState([])
  const [skills, setSkills] = useState([])
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    postType: '',
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
        const postRes = await api.get('/posts/')
        if (!active) return
        setPosts(postRes.data)
        const [skillRes, productRes, ratingRes] = await Promise.all([
          api.get('/skills/'),
          api.get('/products/'),
          api.get('/ratings/'),
        ])
        if (!active) return
        setSkills(skillRes.data)
        setProducts(productRes.data)
        setRatings(ratingRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const handlePostCreated = () => load()
    window.addEventListener('post-created', handlePostCreated)

    return () => {
      active = false
      window.removeEventListener('post-created', handlePostCreated)
    }
  }, [isAuthenticated])

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
        Number(item.cost_per_unit || 0)
      )
      const productCosts = (productsByPost[post.id] || []).map((item) =>
        Number(item.cost_per_unit || 0)
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
      if (filters.location && !post.location?.toLowerCase().includes(filters.location.toLowerCase())) return false
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const haystack = `${post.post_name} ${post.brand_company_name || ''} ${post.description || ''}`.toLowerCase()
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
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      const cost = costSummaryByPost[post.id] || { min: 0 }
      const erpPayload = {
        category: post.post_type === 'Supply' ? 'Provided' : 'Received',
        post: post.id,
        total_cost: cost.min,
      }
      await api.post('/erp/', erpPayload)
      const title = actionType === 'apply' ? 'New Application' : 'New Booking'
      await api.post('/notifications/', {
        title,
        message: `${title} for ${post.post_name} (${post.post_type}).`,
      })
      setActionMessage('Action sent. ERP task created and notification triggered.')
    } catch (error) {
      console.error(error)
      setActionMessage('Action failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">

      {/* HERO BANNER SECTION */}
      <section
        className="relative rounded-3xl overflow-hidden shadow-lg"
        style={{
          backgroundImage: `url(/images/hero.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dim overlay to reduce image opacity */}
        <div className="absolute inset-0 bg-black/25"></div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/25 via-brand-700/25 to-brand-800/25"></div>

        {/* Content */}
        <div className="relative z-10 px-6 py-16 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
              Find Trusted Local Services Near You
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-white font-bold drop-shadow-xl">
              Connect with plumbers, electricians, cleaners, and other professionals in your area.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, postType: '' }))}
                className="px-8 py-3 rounded-full font-bold text-lg bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition shadow-lg"
              >
                Browse Services
              </button>
              <Link
                to={isAuthenticated ? '/create-post' : '/register'}
                className="px-8 py-3 rounded-full font-bold text-lg border-2 border-white text-white hover:bg-white/10 transition shadow-lg text-center"
              >
                Make Supply or Demand
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* HOME FEED SECTION */}
      <section className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Filter Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search posts..."
              value={filters.search}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              name="postType"
              value={filters.postType}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              <option value="Supply">Supply</option>
              <option value="Demand">Demand</option>
            </select>
            <input
              type="text"
              name="location"
              placeholder="Location"
              value={filters.location}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="number"
              name="minCost"
              placeholder="Min Cost"
              value={filters.minCost}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="number"
              name="maxCost"
              placeholder="Max Cost"
              value={filters.maxCost}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="number"
              name="rating"
              placeholder="Min Rating"
              value={filters.rating}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {actionMessage}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading services...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No services found matching your filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                skills={skillsByPost[post.id] || []}
                products={productsByPost[post.id] || []}
                rating={ratingByPost[post.id]}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}