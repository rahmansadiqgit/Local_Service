/*
Hook	Analogy	Purpose
useState	Notebook	Store and update local data
useEffect	Personal assistant	Perform side-effects after render
createContext/useContext	Bulletin board	Share data globally across components
useCallback	Shortcut	Keep function from being recreated
useMemo	Smart calculator	Keep calculation result from recalculating
*/
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

        const haystack =
          `${post.post_name} ${post.brand_company_name || ''} ${post.description || ''}`
          .toLowerCase()

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

    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
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

      // Try to create ERP task
      try {
        await api.post('/erp/', erpPayload)
      } catch (erpError) {
        console.warn('ERP creation issue:', erpError)
        // Continue even if ERP fails (might already exist)
      }

      // Send notification
      try {
        const title = actionType === 'apply' ? 'New Application' : 'New Booking'
        await api.post('/notifications/', {
          title,
          message: `${title} for ${post.post_name} (${post.post_type}).`,
        })
      } catch (notifError) {
        console.warn('Notification issue:', notifError)
      }

      setActionMessage('Action sent. Navigating to manage post...')
      // Navigate to ManagePost page
      setTimeout(() => {
        navigate(`/manage-post/${post.id}`)
      }, 800)
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
        {/* Dimmed overlay for lower image opacity */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 via-brand-700/20 to-brand-800/20"></div>

        {/* Background pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1200" height="400" fill="url(#grid)" opacity="0.1" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 py-16 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                Find Trusted Local Services Near You
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-white font-bold drop-shadow-xl" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
                Connect with plumbers, electricians, cleaners, and other professionals in your area.
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="text"
                placeholder="Search services..."
                value={filters.search}
                onChange={handleFilterChange}
                name="search"
                className="w-80 px-4 py-2 rounded-full text-base bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-lg"
              />
              <button
                type="button"
                className="px-6 py-2 rounded-full font-bold text-base bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition shadow-lg whitespace-nowrap"
              >
                Search
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, postType: '' }))}
                className="px-6 py-2 rounded-full font-bold text-base bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition shadow-lg"
              >
                Browse Services
              </button>
              <Link
                to={isAuthenticated ? '/create-post' : '/register'}
                className="px-6 py-2 rounded-full font-bold text-base bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition shadow-lg text-center"
              >
                Make Supply or Demand
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* HOME FEED SECTION */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Browse the latest available & demand service posts</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['All', 'Demand', 'Supply'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, postType: type === 'All' ? '' : type }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  (filters.postType === '' && type === 'All') || filters.postType === type
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-200 text-slate-600'
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
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Location</label>
            <input
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="City"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Min Cost</label>
            <input
              name="minCost"
              type="number"
              value={filters.minCost}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Max Cost</label>
            <input
              name="maxCost"
              type="number"
              value={filters.maxCost}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Rating</label>
            <select
              name="rating"
              value={filters.rating}
              onChange={handleFilterChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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

        {actionMessage && (
          <div className="card text-sm text-slate-500">
            {actionMessage}
          </div>
        )}

          {loading ? (

            <div className="card">Loading feed...</div>

          ) : filteredPosts.length === 0 ? (

            <div className="card">No posts match your filters.</div>

          ) : (

            filteredPosts.map(post => (

              <PostCard
                key={post.id}
                post={post}
                skills={skillsByPost[post.id] || []}
                products={productsByPost[post.id] || []}
                rating={ratingByPost[post.id]}
                profile={{
                  name: post.owner_name ||
                        post.brand_company_name ||
                        'Localix Member',
                  supplyStatus: post.owner_supply_status || '',
                  demandStatus: post.owner_demand_status || '',
                  photo: post.owner_profile_photo || '',
                }}
                onAction={handleAction}
              />

            ))

          )}

        </section>

    </div>

  )
}