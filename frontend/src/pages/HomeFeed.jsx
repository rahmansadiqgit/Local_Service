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

  useEffect(() => {
    const load = async () => {
      try {
        const [postRes, skillRes, productRes, ratingRes, noteRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/skills/'),
          api.get('/products/'),
          api.get('/ratings/'),
          api.get('/notifications/'),
        ])
        setPosts(postRes.data)
        setSkills(skillRes.data)
        setProducts(productRes.data)
        setRatings(ratingRes.data)
        setNotifications(noteRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
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

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Home Feed</h2>
            <p className="text-sm text-slate-500">Browse the latest supply & demand posts.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Supply
            </button>
            <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Demand
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card">Loading feed...</div>
        ) : posts.length === 0 ? (
          <div className="card">No posts yet.</div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              skills={skillsByPost[post.id] || []}
              products={productsByPost[post.id] || []}
              rating={ratingByPost[post.id]}
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
              <span className="font-semibold text-slate-700 dark:text-slate-200">Any</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Service Type</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">All</span>
            </div>
          </div>
        </div>
        <NotificationPanel notifications={notifications} />
      </aside>
    </div>
  )
}
