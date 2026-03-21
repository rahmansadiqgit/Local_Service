import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PostCard from '../components/PostCard'
import useAuth from '../context/useAuth'
import useCart from '../context/useCart'

export default function HomeFeed() {

  const navigate = useNavigate()

  // ✅ FIXED: include user
  const { isAuthenticated, user } = useAuth()

  // ✅ FIXED: missing cart functions
  const { addToCart, isInCart } = useCart()

  const [posts, setPosts] = useState([])
  const [skills, setSkills] = useState([])
  const [expertises, setExpertises] = useState([])
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
  const currentUserId = user?.id

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const postRes = await api.get('/posts/')
        if (!active) return
        setPosts(postRes.data)

        const [skillRes, expertiseRes, productRes, ratingRes] = await Promise.all([
          api.get('/skills/'),
          api.get('/expertises/'),
          api.get('/products/'),
          api.get('/ratings/'),
        ])

        if (!active) return
        setSkills(skillRes.data)
        setExpertises(expertiseRes.data)
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
    const handlePostDeleted = () => load()

    window.addEventListener('post-created', handlePostCreated)
    window.addEventListener('post-deleted', handlePostDeleted)

    return () => {
      active = false
      window.removeEventListener('post-created', handlePostCreated)
      window.removeEventListener('post-deleted', handlePostDeleted)
    }

  }, [isAuthenticated])

  const skillsByPost = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[skill.post] = acc[skill.post] || []
      acc[skill.post].push(skill)
      return acc
    }, {})
  }, [skills])

  const expertisesByPost = useMemo(() => {
    return expertises.reduce((acc, expertise) => {
      acc[expertise.post] = acc[expertise.post] || []
      acc[expertise.post].push(expertise)
      return acc
    }, {})
  }, [expertises])

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

      if (filters.location &&
          !post.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false
      }

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

  const handleAddToCart = (post) => {
    const added = addToCart(post, {
      minCost: costSummaryByPost[post.id]?.min || 0,
    })

    setActionMessage(
      added
        ? 'Post added to your cart.'
        : 'This post is already in your cart.'
    )
  }

  return (
    <div className="space-y-6">

      <section className="space-y-6">
        {loading ? (
          <div className="card">Loading feed...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="card">No posts match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                skills={skillsByPost[post.id] || []}
                expertises={expertisesByPost[post.id] || []}
                products={productsByPost[post.id] || []}
                rating={ratingByPost[post.id]}
                isOwnPost={
                  Boolean(currentUserId) &&
                  String(post.owner_id || post.owner) === String(currentUserId)
                }
                onAddToCart={handleAddToCart}
                inCart={isInCart(post.id)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}