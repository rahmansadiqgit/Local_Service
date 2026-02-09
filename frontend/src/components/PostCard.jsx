import { useMemo, useState } from 'react'
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

  const costSummary = useMemo(() => {
    const skillCosts = skills.map((item) => Number(item.cost_per_unit || 0))
    const productCosts = products.map((item) => Number(item.cost_per_unit || 0))
    const allCosts = [...skillCosts, ...productCosts]
    const min = allCosts.length ? Math.min(...allCosts) : 0
    const max = allCosts.length ? Math.max(...allCosts) : 0
    return { min, max, count: allCosts.length }
  }, [skills, products])

  if (!post) return null

  return (
    <div className="card space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">{post.post_type}</p>
          <h3 className="text-xl font-semibold">{post.post_name}</h3>
          <p className="text-sm text-slate-500">
            {post.brand_company_name || 'Independent'} • {post.location || 'Remote'}
          </p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
          {post.service_type}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div>
          <p className="text-xs uppercase text-slate-500">Profile</p>
          <p className="font-semibold">{profile?.name || 'Localix Member'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Status</p>
          <p className="font-semibold">{profile?.status || 'Active'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Cost Range</p>
          <p className="font-semibold">
            ${costSummary.min.toFixed(2)} - ${costSummary.max.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Items</p>
          <p className="font-semibold">{costSummary.count}</p>
        </div>
      </div>

      {post.image ? (
        <img
          src={post.image}
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
