import ProductTable from './ProductTable'
import RatingCard from './RatingCard'
import SkillTable from './SkillTable'

export default function PostCard({ post, skills = [], products = [], rating }) {
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

      <RatingCard rating={rating} />

      {post.website_link && (
        <a
          href={post.website_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-500"
        >
          Visit website
        </a>
      )}
    </div>
  )
}
