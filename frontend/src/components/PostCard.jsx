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
    <div className="card space-y-6 transition-shadow hover:shadow-lg bg-white text-black">
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
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
            {post.service_type}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-black">
          {post.post_name}
        </h3>
        {post.description && (
          <p className="text-sm" style={{ color: 'rgba(0,0,0,0.7)' }}>{post.description}</p>
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
        <img
          src={postImageSrc}
          alt={post.post_name}
          className="h-44 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
          No image provided
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onAction?.(post, post.post_type === 'Demand' ? 'apply' : 'book')}
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600"
        >
          {post.post_type === 'Demand' ? 'Apply' : 'Book'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
        {post.website_link && (
          <a
            href={post.website_link}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            Visit website
          </a>
        )}
      </div>

      {expanded && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Skills
            </p>
            <SkillTable skills={skills} />
          </div>
          <div>
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
