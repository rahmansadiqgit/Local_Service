import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuth from '../context/useAuth'
import useCart from '../context/useCart'

export default function YourCart() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { items, removeFromCart } = useCart()
  const [actionMessage, setActionMessage] = useState('')
  const [processingPostId, setProcessingPostId] = useState(null)
  const [unavailablePostIds, setUnavailablePostIds] = useState({})

  const currentUserId = user?.id

  const backendOrigin = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    return apiBase.replace(/\/api\/?$/, '')
  }, [])

  const toMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    if (value.startsWith('/')) {
      return `${backendOrigin}${value}`
    }
    return `${backendOrigin}/${value}`
  }

  const formatPostDate = (value) => {
    if (!value) return 'Just now'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'Just now'
    return parsed.toLocaleDateString()
  }

  const toSnippet = (value, max = 80) => {
    const text = String(value || '').trim()
    if (!text) return 'No description added yet.'
    return text.length > max ? `${text.slice(0, max)}...` : text
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = new Date(a.addedAt || 0).getTime()
      const right = new Date(b.addedAt || 0).getTime()
      return right - left
    })
  }, [items])

  useEffect(() => {
    let isActive = true

    const checkAvailability = async () => {
      if (!items.length) {
        if (isActive) setUnavailablePostIds({})
        return
      }

      const checks = await Promise.all(
        items.map(async (item) => {
          const postId = item?.post?.id
          if (!postId) return null

          try {
            await api.get(`/posts/${postId}/`)
            return { postId, unavailable: false }
          } catch (error) {
            const statusCode = error?.response?.status
            return { postId, unavailable: statusCode === 404 }
          }
        }),
      )

      if (!isActive) return

      const nextUnavailable = {}
      checks.forEach((result) => {
        if (result?.unavailable) {
          nextUnavailable[result.postId] = true
        }
      })
      setUnavailablePostIds(nextUnavailable)
    }

    checkAvailability()

    return () => {
      isActive = false
    }
  }, [items])

  const handleBookFromCart = async (item) => {
    const post = item?.post
    if (!post?.id) return

    if (unavailablePostIds[post.id]) {
      setActionMessage('This post is no longer available. Please remove it from your cart.')
      return
    }

    setActionMessage('')
    const postOwnerId = post.owner_id || post.owner

    if (currentUserId && String(postOwnerId) === String(currentUserId)) {
      setActionMessage("You can't apply or book your own post.")
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setProcessingPostId(post.id)
    try {
      setActionMessage('Continue in manage post to complete this action.')
      setTimeout(() => {
        navigate(`/manage-post/${post.id}`, {
          state: { actionType: post.post_type === 'Demand' ? 'apply' : 'book' },
        })
      }, 300)
    } finally {
      setProcessingPostId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <div>
            <h1
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              Your Cart
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">
              Review saved posts, remove items, or book directly from here.
            </p>
            <p className="mt-2 text-xs font-semibold text-violet-900 sm:text-sm">
              {sortedItems.length} item{sortedItems.length === 1 ? '' : 's'} in your cart
            </p>
          </div>
          <img
            src="/images/cart.png"
            alt="Cart header illustration"
            className="pointer-events-none absolute right-10 top-1/2 h-36 w-36 -translate-y-1/2 object-contain sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          />
        </div>
      </section>

      {actionMessage && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {actionMessage}
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center text-slate-500">
          No posts in your cart yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((item) => {
            const post = item.post
            const isUnavailable = Boolean(unavailablePostIds[post?.id])
            const isOwnPost = Boolean(currentUserId) &&
              String(post?.owner_id || post?.owner) === String(currentUserId)
            const postImageSrc = toMediaUrl(post?.image)
            const isDemand = post?.post_type === 'Demand'

            return (
              <article
                key={post.id}
                className={`rounded-2xl border p-3 shadow-sm backdrop-blur-sm ${
                  isDemand ? 'border-blue-200/70 bg-white/80' : 'border-emerald-200/70 bg-white/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {postImageSrc ? (
                    <img
                      src={postImageSrc}
                      alt={post.post_name || 'Post image'}
                      className={`h-16 w-16 rounded-xl border object-cover ${
                        isDemand ? 'border-blue-100' : 'border-emerald-100'
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-[10px] font-semibold ${
                        isDemand
                          ? 'border-blue-200 bg-blue-50 text-blue-400'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-400'
                      }`}
                    >
                      No image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        {post.post_title || post.post_name || 'Untitled Post'}
                      </h2>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          isDemand
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {post.post_type || 'Post'}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">{formatPostDate(post.created_at)}</p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {post.brand_company_name || 'Independent'} • {post.location || 'Remote'}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">{toSnippet(post.description)}</p>

                    {isUnavailable && (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        This post is no longer available. You can remove it from your cart.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBookFromCart(item)}
                    disabled={isUnavailable || isOwnPost || processingPostId === post.id}
                    className="rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-sky-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUnavailable
                      ? 'No Longer Available'
                      : isOwnPost
                      ? 'Your Post'
                      : processingPostId === post.id
                        ? 'Processing...'
                        : post.post_type === 'Demand'
                          ? 'Apply'
                          : 'Book'}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromCart(post.id)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
