import defaultAvatar from '../assets/default-avatar.svg'

export default function RatingCard({
  rating,
  reviewerId = null,
  reviewerName = '',
  reviewerPhoto = '',
  onOpenReviewer,
}) {
  if (!rating) return null

  const displayName = reviewerName || rating.customer_name || 'Customer'
  const canOpenReviewer = Number.isFinite(Number(reviewerId)) && Number(reviewerId) > 0

  const handleOpenReviewer = () => {
    if (!canOpenReviewer || typeof onOpenReviewer !== 'function') return
    onOpenReviewer(Number(reviewerId))
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleOpenReviewer}
          disabled={!canOpenReviewer}
          className={`flex items-center gap-2 rounded-md px-1 py-1 text-left transition ${
            canOpenReviewer
              ? 'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-300'
              : 'cursor-default'
          }`}
        >
          <img
            src={reviewerPhoto || defaultAvatar}
            alt={displayName}
            className="h-7 w-7 rounded-full border border-slate-200 object-cover"
          />
          <div>
            <p className="font-semibold leading-none text-white">{displayName}</p>
            <span className="text-xs text-slate-300">Rating: {rating.rating_value}/5</span>
          </div>
        </button>
      </div>
      {rating.review_text ? (
        <p className="mt-2 text-slate-100">{rating.review_text}</p>
      ) : (
        <p className="mt-2 text-slate-400">No review text.</p>
      )}
    </div>
  )
}
