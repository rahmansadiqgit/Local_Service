import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js'
import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import api from '../api/client'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [erpItems, setErpItems] = useState([])
  const [posts, setPosts] = useState([])
  const [ratings, setRatings] = useState([])
  const [skills, setSkills] = useState([])
  const [products, setProducts] = useState([])
  const [expandedPostId, setExpandedPostId] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [erpRes, postRes, ratingRes, skillRes, productRes, profileRes] =
          await Promise.all([
            api.get('/erp/'),
            api.get('/posts/'),
            api.get('/ratings/'),
            api.get('/skills/'),
            api.get('/products/'),
            api.get('/users/profile/'),
          ])
        if (!active) return
        setErpItems(erpRes.data)
        setPosts(postRes.data)
        setRatings(ratingRes.data)
        setSkills(skillRes.data)
        setProducts(productRes.data)
        setProfile(profileRes.data)
      } catch (error) {
        console.error(error)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const stageCounts = { Pending: 0, 'On Process': 0, Completed: 0 }
    let totalCost = 0
    erpItems.forEach((item) => {
      stageCounts[item.stage] = (stageCounts[item.stage] || 0) + 1
      totalCost += Number(item.total_cost || 0)
    })
    return { stageCounts, totalCost }
  }, [erpItems])

  const ratingsByPost = useMemo(() => {
    return ratings.reduce((acc, rating) => {
      acc[rating.post] = acc[rating.post] || []
      acc[rating.post].push(rating)
      return acc
    }, {})
  }, [ratings])

  const averageRatingByPost = useMemo(() => {
    const map = {}
    Object.entries(ratingsByPost).forEach(([postId, items]) => {
      const total = items.reduce((sum, item) => sum + Number(item.rating_value || 0), 0)
      map[postId] = items.length ? total / items.length : 0
    })
    return map
  }, [ratingsByPost])

  const ratingsSummary = useMemo(() => {
    const map = {}
    ratings.forEach((rating) => {
      const key = rating.provider
      if (!key) return
      map[key] = map[key] || []
      map[key].push(Number(rating.rating_value || 0))
    })
    return Object.entries(map).map(([providerId, values]) => {
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length
      return { providerId, average: avg.toFixed(2), count: values.length }
    })
  }, [ratings])

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

  const demandPosts = useMemo(
    () => posts.filter((post) => post.post_type === 'Demand'),
    [posts],
  )

  const supplyPosts = useMemo(
    () => posts.filter((post) => post.post_type === 'Supply'),
    [posts],
  )

  const barData = {
    labels: Object.keys(stats.stageCounts),
    datasets: [
      {
        label: 'ERP Tasks',
        data: Object.values(stats.stageCounts),
        backgroundColor: ['#3d7dff', '#68a5ff', '#233f93'],
        borderRadius: 8,
      },
    ],
  }

  const donutData = {
    labels: ['Pending', 'On Process', 'Completed'],
    datasets: [
      {
        data: [
          stats.stageCounts.Pending,
          stats.stageCounts['On Process'],
          stats.stageCounts.Completed,
        ],
        backgroundColor: ['#fbbf24', '#60a5fa', '#34d399'],
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">Overview of your Localix activity.</p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">User Info</h3>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-500">Name</p>
            <p className="font-semibold">{profile?.name || profile?.username || 'User'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="font-semibold">{profile?.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Phone</p>
            <p className="font-semibold">{profile?.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Role</p>
            <p className="font-semibold">{profile?.role || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Location</p>
            <p className="font-semibold">{profile?.location || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="font-semibold">{profile?.status || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total ERP Tasks</p>
          <p className="mt-2 text-3xl font-semibold">{erpItems.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="mt-2 text-3xl font-semibold">${stats.totalCost.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active Providers</p>
          <p className="mt-2 text-3xl font-semibold">{new Set(erpItems.map((i) => i.provider)).size}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">ERP Stage Breakdown</h3>
          <Doughnut data={donutData} />
        </div>
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">Task Status Count</h3>
          <Bar data={barData} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">Demand Posts</h3>
          <div className="space-y-3">
            {demandPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No demand posts.</p>
            ) : (
              demandPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{post.post_name}</p>
                      <p className="text-xs text-slate-500">
                        Avg rating: {Number(averageRatingByPost[post.id] || 0).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className="text-xs font-semibold text-brand-500"
                    >
                      {expandedPostId === post.id ? 'Hide' : 'View'}
                    </button>
                  </div>
                  {expandedPostId === post.id && (
                    <div className="mt-3 grid gap-3 text-sm text-slate-500">
                      <p>Location: {post.location || '-'}</p>
                      <p>Service: {post.service_type}</p>
                      <div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Skills</p>
                        <ul className="mt-2 space-y-1">
                          {(skillsByPost[post.id] || []).map((skill) => (
                            <li key={skill.id}>
                              {skill.skill_name} • {skill.unit} • ${skill.cost_per_unit} • {skill.available_workers}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Products</p>
                        <ul className="mt-2 space-y-1">
                          {(productsByPost[post.id] || []).map((product) => (
                            <li key={product.id}>
                              {product.product_name} • {product.unit} • ${product.cost_per_unit} • {product.available_units}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">Supply Posts</h3>
          <div className="space-y-3">
            {supplyPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No supply posts.</p>
            ) : (
              supplyPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{post.post_name}</p>
                      <p className="text-xs text-slate-500">
                        Avg rating: {Number(averageRatingByPost[post.id] || 0).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className="text-xs font-semibold text-brand-500"
                    >
                      {expandedPostId === post.id ? 'Hide' : 'View'}
                    </button>
                  </div>
                  {expandedPostId === post.id && (
                    <div className="mt-3 grid gap-3 text-sm text-slate-500">
                      <p>Location: {post.location || '-'}</p>
                      <p>Service: {post.service_type}</p>
                      <div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Skills</p>
                        <ul className="mt-2 space-y-1">
                          {(skillsByPost[post.id] || []).map((skill) => (
                            <li key={skill.id}>
                              {skill.skill_name} • {skill.unit} • ${skill.cost_per_unit} • {skill.available_workers}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Products</p>
                        <ul className="mt-2 space-y-1">
                          {(productsByPost[post.id] || []).map((product) => (
                            <li key={product.id}>
                              {product.product_name} • {product.unit} • ${product.cost_per_unit} • {product.available_units}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold">Ratings Summary</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2">Provider ID</th>
                <th className="px-4 py-2">Average Rating</th>
                <th className="px-4 py-2">Total Reviews</th>
              </tr>
            </thead>
            <tbody>
              {ratingsSummary.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={3}>
                    No ratings yet.
                  </td>
                </tr>
              ) : (
                ratingsSummary.map((row) => (
                  <tr key={row.providerId} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-2 font-medium">{row.providerId}</td>
                    <td className="px-4 py-2">{row.average}</td>
                    <td className="px-4 py-2">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
