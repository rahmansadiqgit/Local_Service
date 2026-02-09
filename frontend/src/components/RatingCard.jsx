export default function RatingCard({ rating }) {
  if (!rating) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Rating: {rating.rating_value}/5</p>
        <span className="text-xs text-slate-500">{rating.customer_name || 'Customer'}</span>
      </div>
      {rating.review_text ? (
        <p className="mt-2 text-slate-600 dark:text-slate-300">{rating.review_text}</p>
      ) : (
        <p className="mt-2 text-slate-400">No review text.</p>
      )}
    </div>
  )
}
