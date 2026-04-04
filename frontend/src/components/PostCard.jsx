import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ExpertiseTable from './ExpertiseTable'
import ProductTable from './ProductTable'
import RatingRingAvatar from './RatingRingAvatar'
import ServiceTable from './ServiceTable'

export default function PostCard({
  post,
  skills = [],
  expertises = [],
  products = [],
  rating,
  ratingComments = [],
  profile,
  isOwnPost = false,
  onAction,
  onAddToCart,
  inCart = false,
  isDetailsOpen = false,
  onToggleDetails,
}) {
  const navigate = useNavigate()

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

  const profilePhotoSrc = toMediaUrl(profile?.photo)
  const profileRatingValue = Number(profile?.rating ?? profile?.profile_rating ?? profile?.average_rating)
  const postRatingValue = useMemo(() => {
    const direct = Number(rating)
    if (Number.isFinite(direct)) return direct

    const objectValue = Number(rating?.rating_value ?? rating?.value)
    if (Number.isFinite(objectValue)) return objectValue

    const commentValues = (Array.isArray(ratingComments) ? ratingComments : [])
      .map((entry) => Number(entry?.rating?.rating_value ?? entry?.rating?.value ?? entry?.rating))
      .filter((value) => Number.isFinite(value))

    if (!commentValues.length) return null
    const sum = commentValues.reduce((total, value) => total + value, 0)
    return sum / commentValues.length
  }, [rating, ratingComments])
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
  const showServiceDescription = !(selectedCategories.length === 1 && hasServicesCategory)
  const showProductDescription = !(selectedCategories.length === 1 && hasProductCategory)

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

  const isFullyBooked = useMemo(() => {
    const checks = []

    if (hasExpertiseCategory) {
      const relevantExpertise = expertiseRows.filter((row) => Number(row?.id) > 0)
      checks.push(
        relevantExpertise.length > 0 &&
          relevantExpertise.every((row) => Number(row?.available_person || 0) <= 0),
      )
    }

    if (hasProductCategory) {
      const relevantProducts = productRows.filter((row) => Number(row?.id) > 0)
      checks.push(
        relevantProducts.length > 0 &&
          relevantProducts.every((row) => Number(row?.available_units || 0) <= 0),
      )
    }

    if (hasServicesCategory && !hasExpertiseCategory && !hasProductCategory) {
      const relevantServices = serviceRows.filter((row) => Number(row?.id) > 0)
      checks.push(
        relevantServices.length > 0 &&
          relevantServices.every((row) => Boolean(row?.is_booked)),
      )
    }

    if (!checks.length) return false
    return checks.every(Boolean)
  }, [
    hasExpertiseCategory,
    hasProductCategory,
    hasServicesCategory,
    expertiseRows,
    productRows,
    serviceRows,
  ])

  const profileId = profile?.id ?? post?.owner_id ?? post?.owner

  const handleProfileNavigate = () => {
    if (!profileId) return
    navigate(`/dashboard/${profileId}`)
  }

  if (!post) return null

  return (
    <div
      className="card relative flex h-full flex-col space-y-3 overflow-visible border border-slate-200 p-4 text-black shadow-sm transition-shadow hover:shadow-lg sm:p-5"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3d5e5 45%, #8763ac 100%)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={handleProfileNavigate}
            className="shrink-0 rounded-full bg-white transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-violet-300"
            aria-label={`Open ${profile?.name || 'Localix Member'} profile`}
          >
            <RatingRingAvatar
              src={profilePhotoSrc}
              alt={profile?.name || 'Profile'}
              rating={Number.isFinite(profileRatingValue) ? profileRatingValue : null}
              size={48}
              ringWidth={3}
            />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleProfileNavigate}
                className="post-owner-name-btn m-0 appearance-none border-0 bg-transparent p-0 text-left text-sm font-semibold leading-tight text-black transition-colors hover:text-violet-800 hover:[text-shadow:0_0_10px_rgba(109,40,217,0.55)] focus:outline-none focus:ring-2 focus:ring-violet-300 sm:text-base"
              >
                {profile?.name || 'Localix Member'}
              </button>
              {postRatingValue !== null ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/90 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                  aria-label={`Post rating ${postRatingValue.toFixed(1)} out of 5`}
                >
                  <span aria-hidden="true">★</span>
                  <span>{postRatingValue.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
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
          {isFullyBooked ? (
            <span className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              Already booked
            </span>
          ) : null}
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
          onClick={() => onAction?.(post, isOwnPost ? 'edit' : post.post_type === 'Demand' ? 'apply' : 'book')}

          className="rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-sky-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-sky-300"

        >
          {isOwnPost ? 'Edit' : post.post_type === 'Demand' ? 'Apply' : 'Book'}
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
          onClick={() => onToggleDetails?.(!isDetailsOpen)}
          aria-expanded={isDetailsOpen}

          className="rounded-full border border-slate-700 bg-transparent px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-800 hover:bg-slate-100/40 focus:outline-none focus:ring-2 focus:ring-slate-200"

        >
          {isDetailsOpen ? 'Hide Details' : 'View Details'}
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

      {isDetailsOpen && (
        <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-4 sm:bottom-4">
          <div
            className="flex flex-col overflow-hidden rounded-2xl border border-violet-200/80 shadow-xl backdrop-blur-md"
            style={{
              maxHeight: 'min(78vh, 46rem)',
              background: 'linear-gradient(135deg, #c9b6ff 0%, #e6d7ff 60%, #f2eaff 100%)',
              backgroundColor: 'rgba(236, 225, 255, 0.82)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
              border: '1.5px solid #e0d7fa',
            }}
          >
            <div className="flex items-center justify-between border-b border-violet-200/80 bg-gradient-to-r from-[#c9b6ff]/80 via-[#e6d7ff]/85 to-[#f2eaff]/80 px-4 py-3">
              <p className="text-sm font-semibold text-violet-900">Post details</p>
              <button
                type="button"
                onClick={() => onToggleDetails?.(false)}
                className="rounded-full border border-violet-300 bg-white/65 px-3 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                Close
              </button>
            </div>

            <div
              className="space-y-3 overflow-y-auto p-3"
              style={{
                backgroundColor: 'rgba(234, 226, 249, 0.56)',
                backgroundImage: 'linear-gradient(145deg, rgba(225, 205, 255, 0.28), rgba(244, 230, 255, 0.24))',
              }}
            >
              {hasExpertiseCategory && (
                <div className="space-y-2 rounded-2xl border border-violet-200/80 bg-white/55 p-2.5 shadow-sm backdrop-blur-md">
                  <p className="text-sm font-semibold text-violet-900">Expertise</p>
                  {expertiseRows.length ? (
                    <ExpertiseTable expertises={expertiseRows} postType={post.post_type} tone="profile" />
                  ) : (
                    <p className="text-sm text-violet-700/80">No expertise detail listed.</p>
                  )}
                </div>
              )}

              {hasServicesCategory && (
                <div className="space-y-2 rounded-2xl border border-violet-200/80 bg-white/55 p-2.5 shadow-sm backdrop-blur-md">
                  <p className="text-sm font-semibold text-violet-900">Services</p>
                  {serviceRows.length ? (
                    <ServiceTable services={serviceRows} postType={post.post_type} showDescription={showServiceDescription} tone="profile" />
                  ) : (
                    <p className="text-sm text-violet-700/80">No services detail listed.</p>
                  )}
                </div>
              )}

              {hasProductCategory && (
                <div className="space-y-2 rounded-2xl border border-violet-200/80 bg-white/55 p-2.5 shadow-sm backdrop-blur-md">
                  <p className="text-sm font-semibold text-violet-900">Products</p>
                  {productRows.length ? (
                    <ProductTable products={productRows} postType={post.post_type} showDescription={showProductDescription} tone="profile" />
                  ) : (
                    <p className="text-sm text-violet-700/80">No product detail listed.</p>
                  )}
                </div>
              )}

              {!hasExpertiseCategory && !hasServicesCategory && !hasProductCategory && (
                <p className="text-sm text-violet-700/80">No detail listed.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
