import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import defaultAvatar from '../assets/default-avatar.svg'
import ExpertiseTable from './ExpertiseTable'
import ProductTable from './ProductTable'
import RatingCard from './RatingCard'
import ServiceTable from './ServiceTable'

export default function PostCard({
  post,
  skills = [],
  expertises = [],
  products = [],
  rating,
  profile,
  isOwnPost = false,
  onAction,
  onAddToCart,
  inCart = false,
}) {
  const navigate = useNavigate()
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

  const selectedCategories = useMemo(
    () =>
      (post?.post_name || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    [post?.post_name],
  )

  const displayCategories = useMemo(
    () =>
      selectedCategories.map((category) =>
        category.charAt(0).toUpperCase() + category.slice(1),
      ),
    [selectedCategories],
  )

  const hasExpertiseCategory = selectedCategories.includes('expertise')
  const hasServicesCategory = selectedCategories.includes('services')
  const hasProductCategory = selectedCategories.includes('product')

  const stripCategoryPrefix = (value) =>
    String(value || '')
      .replace(/^__expertise__::/i, '')
      .replace(/^__service__::/i, '')
      .trim()

  const expertiseRows = useMemo(() => {
    if (expertises.length > 0) return expertises

    // Backward-compatible fallback for legacy expertise rows stored in skills.
    const tagged = skills
      .filter((item) => /^__expertise__::/i.test(String(item.skill_name || '')))
      .map((item) => ({
        id: item.id,
        name: stripCategoryPrefix(item.skill_name),
        experience: item.description || '-',
        unit: item.unit,
        cost: item.cost_per_unit,
        available_person: item.available_workers,
      }))

    if (tagged.length > 0) return tagged

    if (hasExpertiseCategory && !hasServicesCategory) {
      return skills
        .filter((item) => !/^__service__::/i.test(String(item.skill_name || '')))
        .map((item) => ({
          id: item.id,
          name: stripCategoryPrefix(item.skill_name),
          experience: item.description || '-',
          unit: item.unit,
          cost: item.cost_per_unit,
          available_person: item.available_workers,
        }))
    }

    return []
  }, [expertises, hasExpertiseCategory, hasServicesCategory, skills])

  const serviceRows = useMemo(() => {
    const tagged = skills
      .filter((item) => /^__service__::/i.test(String(item.skill_name || '')))
      .map((item) => ({
        ...item,
        service_name: stripCategoryPrefix(item.skill_name),
      }))

    if (tagged.length > 0) return tagged

    if (hasServicesCategory && !hasExpertiseCategory) {
      return skills.map((item) => ({
        ...item,
        service_name: stripCategoryPrefix(item.skill_name),
      }))
    }

    return []
  }, [hasExpertiseCategory, hasServicesCategory, skills])

  const productRows = products

  const profileId = profile?.id ?? post?.owner_id ?? post?.owner

  const handleProfileNavigate = () => {
    if (!profileId) return
    navigate(`/dashboard/${profileId}`)
  }

  if (!post) return null

  return (
    <div
      className="card flex h-full flex-col space-y-3 p-4 sm:p-5 border border-slate-200 text-black shadow-sm transition-shadow hover:shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3d5e5 45%, #8763ac 100%)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={handleProfileNavigate}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-violet-300"
            aria-label={`Open ${profile?.name || 'Localix Member'} profile`}
          >
            <img
              src={profilePhotoSrc}
              alt={profile?.name || 'Profile'}
              className="h-full w-full object-cover"
            />
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={handleProfileNavigate}
              className="post-owner-name-btn m-0 appearance-none border-0 bg-transparent p-0 text-left text-sm font-semibold leading-tight text-black transition-colors hover:text-violet-800 hover:[text-shadow:0_0_10px_rgba(109,40,217,0.55)] focus:outline-none focus:ring-2 focus:ring-violet-300 sm:text-base"
            >
              {profile?.name || 'Localix Member'}
            </button>
            <p className="text-xs leading-5 text-slate-500 break-words [overflow-wrap:anywhere] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
              {post.brand_company_name || 'Independent'} • {post.location || 'Remote'}
            </p>
            <p className="text-xs text-slate-400">{formattedTime}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {post.post_type === 'Supply' ? 'Available' : post.post_type}
          </span>
          {statusLabels.map((status) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
              <span>{status}</span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {post.post_title || 'Untitled Post'}
      </h3>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        {post.description ? (
          <div className="max-h-28 overflow-y-auto pr-1">
            <p className="text-sm leading-6 text-slate-700 break-words [overflow-wrap:anywhere]">
              {post.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No description provided.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {displayCategories.length ? (
          displayCategories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center rounded-full border border-violet-200 bg-white/85 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700 shadow-sm"
            >
              {category}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            Uncategorized
          </span>
        )}
      </div>

      {postImageSrc && (
        <div className="mx-auto w-fit max-w-full rounded-2xl border border-slate-200/70 bg-transparent p-2">
          <img
            src={postImageSrc}
            alt={post.post_name}
            className="block max-h-[320px] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-start gap-2.5">
        <button
          type="button"
          onClick={() => onAction?.(post, post.post_type === 'Demand' ? 'apply' : 'book')}
          disabled={isOwnPost}

          className="rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-sky-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"

        >
          {isOwnPost ? 'Your Post' : post.post_type === 'Demand' ? 'Apply' : 'Book'}
        </button>
        {!isOwnPost && (
          <button
            type="button"
            onClick={() => onAddToCart?.(post)}
            disabled={inCart}
            className="rounded-full border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inCart ? 'Added' : 'Add to Cart'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}

          className="rounded-full border border-slate-700 bg-transparent px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-800 hover:bg-slate-100/40 focus:outline-none focus:ring-2 focus:ring-slate-200"

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
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="space-y-3">
              {hasExpertiseCategory && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Expertise</p>
                  {expertiseRows.length ? (
                    <ExpertiseTable expertises={expertiseRows} postType={post.post_type} />
                  ) : (
                    <p className="text-sm text-slate-400">No expertise detail listed.</p>
                  )}
                </div>
              )}

              {hasServicesCategory && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Services</p>
                  {serviceRows.length ? (
                    <ServiceTable services={serviceRows} postType={post.post_type} />
                  ) : (
                    <p className="text-sm text-slate-400">No services detail listed.</p>
                  )}
                </div>
              )}

              {hasProductCategory && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Products</p>
                  {productRows.length ? (
                    <ProductTable products={productRows} postType={post.post_type} />
                  ) : (
                    <p className="text-sm text-slate-400">No product detail listed.</p>
                  )}
                </div>
              )}

              {!hasExpertiseCategory && !hasServicesCategory && !hasProductCategory && (
                <p className="text-sm text-slate-400">No detail listed.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <RatingCard rating={rating} />
    </div>
  )
}
