import { useMemo, useState } from 'react'
import defaultAvatar from '../assets/default-avatar.svg'
import ProductTable from './ProductTable'
import RatingCard from './RatingCard'
import SkillTable from './SkillTable'

export default function PostCard({
  post,
  skills = [],
  products = [],
  rating,
  profile,
  onAction,
}) {
  const [expanded, setExpanded] = useState(false)

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

  const profilePhotoSrc = toMediaUrl(profile?.photo) || defaultAvatar
  const postImageSrc = toMediaUrl(post?.image)

  const statusLabels = useMemo(() => {
    const raw = post?.post_type === 'Supply' ? profile?.supplyStatus : profile?.demandStatus
    const tokens = raw
      ? raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []
    return tokens.length ? tokens : ['None']
  }, [post?.post_type, profile])

  const statusDotClass = (status) => {
    const normalized = status.toLowerCase()
    const isSupply = post?.post_type === 'Supply'

    if (isSupply) {
      if (normalized === 'active') return 'bg-emerald-500'
      if (normalized === 'available') return 'bg-sky-500'
      return 'bg-slate-400 dark:bg-slate-500'
    }

    if (normalized === 'busy') return 'bg-rose-500'
    if (normalized === 'active') return 'bg-amber-500'
    return 'bg-slate-400 dark:bg-slate-500'
  }

  const formattedTime = useMemo(() => {
    if (!post?.created_at) return 'Just now'
    const parsed = new Date(post.created_at)
    if (Number.isNaN(parsed.getTime())) return 'Just now'
    return parsed.toLocaleString()
  }, [post])

  if (!post) return null

  return (
    <div
      className="card space-y-6 border border-slate-200 text-black shadow-sm transition-shadow hover:shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3d5e5 45%, #8763ac 100%)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white">
            <img
              src={profilePhotoSrc}
              alt={profile?.name || 'Profile'}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-semibold text-black">
              {profile?.name || 'Localix Member'}
            </p>
            <p className="text-xs text-slate-500">
              {post.brand_company_name || 'Independent'} • {post.location || 'Remote'}
            </p>
            <p className="text-xs text-slate-400">{formattedTime}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {post.post_type}
          </span>
          {skills && skills.length > 0 && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
              Skills
            </span>
          )}
          {products && products.length > 0 && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
              Products
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-lg font-semibold text-black">
          {post.post_name}
        </h3>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        {post.description ? (
          <p className="text-sm leading-6 text-slate-700">{post.description}</p>
        ) : (
          <p className="text-sm text-slate-400">No description provided.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusLabels.map((status) => (
          <div
            key={status}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
            <span>{status}</span>
          </div>
        ))}
      </div>

      {postImageSrc ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
          <img
            src={postImageSrc}
            alt={post.post_name}
            className="max-h-[320px] w-auto max-w-[92%] rounded-2xl object-contain"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
          No image provided
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => onAction?.(post, post.post_type === 'Demand' ? 'apply' : 'book')}

          className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300"

        >
          {post.post_type === 'Demand' ? 'Apply' : 'Book'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}

          className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"

        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
        {post.website_link && (
          <a
            href={post.website_link}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Visit website
          </a>
        )}
      </div>

      {expanded && (
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Skills
            </p>
            <SkillTable skills={skills} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Products
            </p>
            <ProductTable products={products} />
          </div>
        </div>
      )}

      <RatingCard rating={rating} />
    </div>
  )
}
