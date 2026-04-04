import defaultAvatar from '../assets/default-avatar.svg'

const clampRating = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.min(5, Math.max(0, numeric))
}

const ringSpeedForRating = (rating) => {
  if (rating == null || rating <= 0) {
    return {
      speed: '8.5s',
    }
  }

  if (rating >= 4.5) {
    return {
      speed: '4.2s',
    }
  }

  if (rating >= 3.0) {
    return {
      speed: '4.9s',
    }
  }

  return {
    speed: '5.6s',
  }
}

export default function RatingRingAvatar({
  src,
  alt,
  rating,
  size = 32,
  ringWidth = 4,
  className = '',
  imageClassName = '',
}) {
  const normalizedRating = clampRating(rating)
  const progressDegrees = normalizedRating == null ? 0 : (normalizedRating / 5) * 360
  const hasVisibleRing = normalizedRating != null && normalizedRating > 0
  const ringSpeed = ringSpeedForRating(normalizedRating)
  const requestedRingWidth = Number(ringWidth)
  const safeRequestedWidth = Number.isFinite(requestedRingWidth) ? requestedRingWidth : 2
  const effectiveRingWidth = Math.max(2, Math.min(Math.round(size * 0.2), Math.round(safeRequestedWidth)))

  return (
    <span
      className={`rating-ring-avatar ${hasVisibleRing ? '' : 'rating-ring-avatar--no-ring'} ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        '--ring-progress': `${progressDegrees}deg`,
        '--ring-width': `${effectiveRingWidth}px`,
        '--ring-speed': ringSpeed.speed,
      }}
      title={!hasVisibleRing ? 'No rating yet' : `${normalizedRating.toFixed(1)} / 5`}
    >
      {hasVisibleRing ? <span className="rating-ring-avatar__ring" aria-hidden="true" /> : null}
      <span className="rating-ring-avatar__inner">
        <img
          src={src || defaultAvatar}
          alt={alt}
          className={`h-full w-full rounded-full object-cover ${imageClassName}`.trim()}
        />
      </span>
    </span>
  )
}
