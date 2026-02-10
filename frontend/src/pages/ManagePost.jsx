import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

export default function ManagePost() {
  const { id } = useParams()
  const [posts, setPosts] = useState([])
  const [skills, setSkills] = useState([])
  const [products, setProducts] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [workerPool, setWorkerPool] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadPosts = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}/`)
      setPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch (error) {
      console.error(error)
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
      const qty = Number(quantities[`skill-${row.id}`] || 0)
      return sum + qty * Number(row.cost_per_unit || 0)
    }, 0)
    const productTotal = productRows.reduce((sum, row) => {
      const qty = Number(quantities[`product-${row.id}`] || 0)
      return sum + qty * Number(row.cost_per_unit || 0)
    }, 0)
    return skillTotal + productTotal
  }

  const handleAssignWorkers = async (erpId, workerIds) => {
    try {
      const { data } = await api.post(`/erp/${erpId}/assign_workers/`, { worker_ids: workerIds })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setMessage('Workers assigned.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to assign workers.')
    }
  }

  const handleGeneratePdf = async (erpId) => {
    try {
      const { data } = await api.post(`/erp/${erpId}/generate_pdf/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      if (data.pdf_slip) {
        window.open(data.pdf_slip, '_blank')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleUpdateStage = async (erpId, stage) => {
    try {
      const { data } = await api.patch(`/erp/${erpId}/update_stage/`, { stage })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateOrUpdateErp = async (post) => {
    const total = getTotalForPost(post.id)
    const existing = erpByPost[post.id]
    try {
      if (existing) {
        const { data } = await api.patch(`/erp/${existing.id}/`, { total_cost: total })
        setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        setMessage('ERP updated with new total.')
      } else {
        const payload = {
          category: post.post_type === 'Supply' ? 'Provided' : 'Received',
          post: post.id,
          total_cost: total,
        }
        const { data } = await api.post('/erp/', payload)
        setErpItems((prev) => [...prev, data])
        setMessage('ERP task created.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Failed to update ERP.')
    }
  }

  const visiblePosts = useMemo(() => {
    if (!id) return posts
    return posts.filter((post) => String(post.id) === String(id))
  }, [posts, id])

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Manage Posts</h2>
        <p className="text-sm text-slate-500">Update or remove existing listings.</p>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">Worker ID Pool (comma separated)</label>
            <input
              value={workerPool}
              onChange={(event) => setWorkerPool(event.target.value)}
              placeholder="e.g. 12, 15, 18"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading posts...</p>
        ) : visiblePosts.length === 0 ? (
          <p className="text-sm text-slate-500">No posts created yet.</p>
        ) : (
          visiblePosts.map((post) => (
            <div
              key={post.id}
              className="space-y-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">{post.post_type}</p>
                  <p className="font-semibold">{post.post_name}</p>
                  <p className="text-sm text-slate-500">{post.location || 'No location'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateOrUpdateErp(post)}
                    className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {erpByPost[post.id] ? 'Update ERP' : 'Create ERP'}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Skills</p>
                  {(skillsByPost[post.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No skills.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-2">Skill</th>
                            <th className="px-3 py-2">Unit</th>
                            <th className="px-3 py-2">Cost</th>
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(skillsByPost[post.id] || []).map((skill, index) => {
                            const qty = Number(quantities[`skill-${skill.id}`] || 0)
                            const total = qty * Number(skill.cost_per_unit || 0)
                            return (
                              <tr
                                key={skill.id}
                                className={`border-t border-slate-200 dark:border-slate-800 ${
                                  index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''
                                }`}
                              >
                                <td className="px-3 py-2 font-medium">{skill.skill_name}</td>
                                <td className="px-3 py-2">{skill.unit}</td>
                                <td className="px-3 py-2">${skill.cost_per_unit}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantities[`skill-${skill.id}`] || ''}
                                    onChange={(event) =>
                                      setQuantities((prev) => ({
                                        ...prev,
                                        [`skill-${skill.id}`]: event.target.value,
                                      }))
                                    }
                                    className="w-20 rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                                  />
                                </td>
                                <td className="px-3 py-2">${total.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Products</p>
                  {(productsByPost[post.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No products.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Unit</th>
                            <th className="px-3 py-2">Cost</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(productsByPost[post.id] || []).map((product, index) => {
                            const qty = Number(quantities[`product-${product.id}`] || 0)
                            const total = qty * Number(product.cost_per_unit || 0)
                            return (
                              <tr
                                key={product.id}
                                className={`border-t border-slate-200 dark:border-slate-800 ${
                                  index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''
                                }`}
                              >
                                <td className="px-3 py-2 font-medium">{product.product_name}</td>
                                <td className="px-3 py-2">{product.unit}</td>
                                <td className="px-3 py-2">${product.cost_per_unit}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantities[`product-${product.id}`] || ''}
                                    onChange={(event) =>
                                      setQuantities((prev) => ({
                                        ...prev,
                                        [`product-${product.id}`]: event.target.value,
                                      }))
                                    }
                                    className="w-20 rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                                  />
                                </td>
                                <td className="px-3 py-2">${total.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Total cost: ${getTotalForPost(post.id).toFixed(2)}
                </div>
                {erpByPost[post.id] && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdateStage(erpByPost[post.id].id, 'Pending')}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleUpdateStage(erpByPost[post.id].id, 'On Process')}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      On Process
                    </button>
                    <button
                      onClick={() => handleUpdateStage(erpByPost[post.id].id, 'Completed')}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => {
                        const raw = window.prompt('Enter worker IDs separated by comma')
                        if (!raw) return
                        const ids = raw
                          .split(',')
                          .map((id) => Number(id.trim()))
                          .filter(Boolean)
                        handleAssignWorkers(erpByPost[post.id].id, ids)
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Assign (Manual)
                    </button>
                    <button
                      onClick={() => {
                        const ids = workerPool
                          .split(',')
                          .map((id) => Number(id.trim()))
                          .filter(Boolean)
                        if (ids.length === 0) {
                          setMessage('Worker pool is empty for auto-assign.')
                          return
                        }
                        handleAssignWorkers(erpByPost[post.id].id, ids)
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Assign (Auto)
                    </button>
                    <button
                      onClick={() => handleGeneratePdf(erpByPost[post.id].id)}
                      className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600"
                    >
                      Generate PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
