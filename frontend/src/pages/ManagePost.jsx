import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

export default function ManagePost() {
  const { id } = useParams()
  const [posts, setPosts] = useState([])
  const [skills, setSkills] = useState([])
  const [products, setProducts] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [skillWorkers, setSkillWorkers] = useState({})
  const [productUnits, setProductUnits] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      const [postRes, skillRes, productRes, erpRes] = await Promise.all([
        api.get('/posts/?mine=1'),
        api.get('/skills/'),
        api.get('/products/'),
        api.get('/erp/'),
      ])
      setPosts(postRes.data)
      setSkills(skillRes.data)
      setProducts(productRes.data)
      setErpItems(erpRes.data)
    } catch (error) {
      console.error(error)
      showMessage('Error loading posts', 'error')
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${postId}/`)
        setPosts((prev) => prev.filter((post) => post.id !== postId))
        showMessage('Post deleted successfully', 'success')
      } catch (error) {
        console.error(error)
        showMessage('Failed to delete post', 'error')
      }
    }
  }

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

  const erpByPost = useMemo(() => {
    return erpItems.reduce((acc, item) => {
      acc[item.post] = item
      return acc
    }, {})
  }, [erpItems])

  const getTotalForPost = (postId) => {
    const skillRows = skillsByPost[postId] || []
    const productRows = productsByPost[postId] || []
    const skillTotal = skillRows.reduce((sum, row) => {
      const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
      return sum + workers * Number(row.cost_per_unit || 0)
    }, 0)
    const productTotal = productRows.reduce((sum, row) => {
      const units = Number(productUnits[`product-${row.id}`] || 0)
      return sum + units * Number(row.cost_per_unit || 0)
    }, 0)
    return skillTotal + productTotal
  }

  const handleCreateOrUpdateErp = async (post) => {
    const total = getTotalForPost(post.id)
    const existing = erpByPost[post.id]
    try {
      if (existing) {
        const { data } = await api.patch(`/erp/${existing.id}/`, { total_cost: total })
        setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        showMessage('ERP task updated with new total cost', 'success')
      } else {
        const payload = {
          category: post.post_type === 'Supply' ? 'Provided' : 'Received',
          post: post.id,
          total_cost: total,
        }
        const { data } = await api.post('/erp/', payload)
        setErpItems((prev) => [...prev, data])
        showMessage('ERP task created successfully', 'success')
      }
    } catch (error) {
      console.error(error)
      showMessage('Failed to manage ERP task', 'error')
    }
  }

  const CounterControl = ({ value, onChange, max, label, unit }) => {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
            className="w-16 text-center text-lg font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg border-2 border-slate-300 dark:border-slate-600"
          />
          <button
            onClick={() => onChange(Math.min(max, value + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold transition"
          >
            +
          </button>
        </div>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
    )
  }

  const visiblePosts = useMemo(() => {
    if (!id) return posts
    return posts.filter((post) => String(post.id) === String(id))
  }, [posts, id])

  return (
    <>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
            <div className="relative px-6 py-3.5 sm:px-8 sm:py-4">
              <h1
                className="text-2xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
                style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
              >
                Manage Your Posts
              </h1>
              <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Easily adjust workers for skills and units for products. Real-time cost calculation!</p>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`card rounded-2xl p-4 animate-slide-in ${
              messageType === 'success' ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300' : 
              messageType === 'error' ? 'bg-red-50 border-2 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300' : 
              'bg-blue-50 border-2 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
            }`}>
              <p className="font-semibold text-center">{message}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="card rounded-3xl p-16 text-center bg-white dark:bg-slate-900 shadow-lg">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-300 border-t-brand-500"></div>
              </div>
              <p className="mt-6 text-slate-600 dark:text-slate-400 text-lg font-semibold">Loading your posts...</p>
            </div>
          )}

          {/* No Posts State */}
          {!loading && visiblePosts.length === 0 && (
            <div className="card rounded-3xl p-16 text-center bg-white dark:bg-slate-900 shadow-lg">
              <div className="text-6xl mb-6">📭</div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No Posts to Manage</p>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Book or apply from a post to start managing it here</p>
            </div>
          )}

          {/* Posts List */}
          {!loading && visiblePosts.length > 0 && (
            <div className="space-y-8">
              {visiblePosts.map((post) => (
                <div key={post.id} className="card rounded-3xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                  {/* Post Header */}
                  <div className="p-8 bg-gradient-to-r from-blue-50 to-brand-50 dark:from-blue-900/20 dark:to-brand-900/20 border-b-2 border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <span className="inline-block px-4 py-2 bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 text-sm font-bold rounded-full mb-3">
                          {post.post_type === 'Supply' ? '📦 SUPPLY' : '🔍 DEMAND'}
                        </span>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{post.post_name}</h2>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 flex items-center gap-2">
                          <span>📍</span> {post.location || 'Location not specified'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white font-bold rounded-2xl transition transform hover:scale-105 shadow-lg"
                      >
                        🗑️ Delete Post
                      </button>
                    </div>
                    {post.description && (
                      <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">{post.description}</p>
                    )}
                  </div>

                  {/* Skills Management Section */}
                  {(skillsByPost[post.id] || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">🛠️</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Skills Management</h3>
                        <span className="ml-auto px-3 py-1 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full font-semibold">
                          {(skillsByPost[post.id] || []).length} skills
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(skillsByPost[post.id] || []).map((skill) => {
                          const workers = Number(skillWorkers[`skill-${skill.id}`] || 0)
                          const totalCost = workers * Number(skill.cost_per_unit || 0)
                          return (
                            <div key={skill.id} className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-500 transition">
                              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Skill</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{skill.skill_name}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Unit: <span className="font-semibold">{skill.unit}</span> | Cost: <span className="font-semibold">${skill.cost_per_unit}</span>
                              </p>
                              
                              <div className="mb-4">
                                <CounterControl
                                  value={workers}
                                  onChange={(val) => setSkillWorkers((prev) => ({ ...prev, [`skill-${skill.id}`]: val }))}
                                  max={100}
                                  label="Workers Needed"
                                  unit={workers === 1 ? 'worker' : 'workers'}
                                />
                              </div>
                              
                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Products Management Section */}
                  {(productsByPost[post.id] || []).length > 0 && (
                    <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-3xl">📦</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Products Management</h3>
                        <span className="ml-auto px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full font-semibold">
                          {(productsByPost[post.id] || []).length} products
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(productsByPost[post.id] || []).map((product) => {
                          const units = Number(productUnits[`product-${product.id}`] || 0)
                          const totalCost = units * Number(product.cost_per_unit || 0)
                          return (
                            <div key={product.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 transition">
                              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Product</p>
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{product.product_name}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Unit: <span className="font-semibold">{product.unit}</span> | Cost: <span className="font-semibold">${product.cost_per_unit}</span>
                              </p>
                              
                              <div className="mb-4">
                                <CounterControl
                                  value={units}
                                  onChange={(val) => setProductUnits((prev) => ({ ...prev, [`product-${product.id}`]: val }))}
                                  max={1000}
                                  label="Units Required"
                                  unit={units === 1 ? 'unit' : 'units'}
                                />
                              </div>
                              
                              <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">TOTAL COST</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">${totalCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  <div className="p-8 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 border-t-2 border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">Skills Total</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${((skillsByPost[post.id] || []).reduce((sum, row) => {
                            const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
                            return sum + workers * Number(row.cost_per_unit || 0)
                          }, 0)).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">Products Total</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          ${((productsByPost[post.id] || []).reduce((sum, row) => {
                            const units = Number(productUnits[`product-${row.id}`] || 0)
                            return sum + units * Number(row.cost_per_unit || 0)
                          }, 0)).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-2xl p-6 shadow-lg text-white">
                        <p className="text-sm font-semibold mb-2 opacity-90">Project Total Cost</p>
                        <p className="text-3xl font-bold">${getTotalForPost(post.id).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCreateOrUpdateErp(post)}
                      className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 dark:from-blue-700 dark:to-brand-700 dark:hover:from-blue-800 dark:hover:to-brand-800 text-white font-bold text-lg rounded-2xl transition transform hover:scale-105 shadow-lg"
                    >
                      {erpByPost[post.id] ? '✏️ Update ERP Task' : '➕ Create ERP Task'}
                    </button>
                    {erpByPost[post.id] && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-3 font-semibold text-center">✓ ERP task created and ready for processing</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
