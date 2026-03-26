import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const BANGLADESH_CENTER = [23.81, 90.41]
const DEFAULT_ZOOM = 8
const BANGLADESH_BOUNDS = [
  [20.55, 88.0],
  [26.75, 92.7],
]

const toCoordinateOrNull = (value) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

if (typeof window !== 'undefined' && !L.Icon.Default.prototype._localixPatched) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
  L.Icon.Default.prototype._localixPatched = true
}

const GOOGLE_STYLE_MARKER_ICON = L.icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="%23000000" flood-opacity="0.35"/></filter></defs><g filter="url(%23s)"><path d="M18 2C11.37 2 6 7.37 6 14c0 8.86 9.94 18.8 11.1 19.94.5.49 1.31.49 1.8 0C20.06 32.8 30 22.86 30 14 30 7.37 24.63 2 18 2z" fill="%23EA4335"/><circle cx="18" cy="14" r="5.6" fill="%23ffffff"/></g></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 35],
  popupAnchor: [0, -30],
})

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng
      onPick(lat, lng)
    },
  })

  return null
}

function MapRecenter({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!position) return
    map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.4 })
  }, [map, position])

  return null
}

function MapInvalidateSize() {
  const map = useMap()

  useEffect(() => {
    const invalidate = () => map.invalidateSize()

    // Recalculate once immediately and once after layout settles.
    const timeoutId = window.setTimeout(invalidate, 120)
    invalidate()

    const container = map.getContainer()
    const resizeObserver = new ResizeObserver(() => {
      invalidate()
    })
    resizeObserver.observe(container)

    return () => {
      window.clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [map])

  return null
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onPick,
  radiusKm,
  hintText = '',
  showUseMyLocation = true,
  popupText = 'Confirm this location?',
  className = '',
}) {
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const selectedPosition = useMemo(() => {
    const lat = toCoordinateOrNull(latitude)
    const lng = toCoordinateOrNull(longitude)

    if (lat !== null && lng !== null) {
      return [lat, lng]
    }

    return null
  }, [latitude, longitude])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }

    setGeoError('')
    setGeoLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false)
        onPick(position.coords.latitude, position.coords.longitude)
      },
      () => {
        setGeoLoading(false)
        setGeoError('Could not detect your current location.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  return (
    <div className={`rounded-xl border border-violet-200/70 bg-white/80 p-2 shadow-[0_6px_22px_rgba(0,0,0,0.16)] ${className}`}>
      {showUseMyLocation && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {geoLoading ? 'Detecting location...' : 'Use My Current Location'}
          </button>
          {geoError && <p className="text-[11px] text-rose-600">{geoError}</p>}
        </div>
      )}

      <div className="relative z-0 overflow-hidden rounded-xl border border-violet-200/70">
        {hintText ? (
          <div className="pointer-events-none absolute left-2 top-2 z-[500] rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white">
            {hintText}
          </div>
        ) : null}

        <MapContainer
          center={selectedPosition || BANGLADESH_CENTER}
          zoom={selectedPosition ? 11 : DEFAULT_ZOOM}
          minZoom={7}
          maxZoom={18}
          scrollWheelZoom
          style={{ height: 230, width: '100%', zIndex: 0 }}
          maxBounds={BANGLADESH_BOUNDS}
          maxBoundsViscosity={0.7}
        >
          <MapInvalidateSize />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <MapClickHandler onPick={onPick} />
          <MapRecenter position={selectedPosition} />

          {selectedPosition && (
            <Marker position={selectedPosition} icon={GOOGLE_STYLE_MARKER_ICON}>
              <Popup>
                <div className="text-xs font-semibold text-slate-700">{popupText}</div>
              </Popup>
            </Marker>
          )}
          {selectedPosition && Number.isFinite(radiusKm) && radiusKm > 0 && (
            <Circle
              center={selectedPosition}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 0.18 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}
