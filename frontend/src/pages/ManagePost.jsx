import { useEffect, useState } from 'react'
import api from '../api/client'

export default function ManagePost() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPosts = async () => {
    try {
      const { data } = await api.get('/posts/')
      setPosts(data)
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

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Manage Posts</h2>
        <p className="text-sm text-slate-500">Update or remove existing listings.</p>
      </div>

      <div className="card space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-500">No posts created yet.</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs uppercase text-slate-500">{post.post_type}</p>
                <p className="font-semibold">{post.post_name}</p>
                <p className="text-sm text-slate-500">{post.location || 'No location'}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
