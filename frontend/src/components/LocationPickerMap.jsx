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
const BANGLADESH_FIT_ZOOM = 7.3
const BANGLADESH_BOUNDS = [
  [20.67, 88.03],
  [26.64, 92.68],
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

function MapViewportController({ position, selectedZoom }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.flyTo(position, selectedZoom, { duration: 0.4 })
      return
    }

    map.setView(BANGLADESH_CENTER, BANGLADESH_FIT_ZOOM, { animate: false })
  }, [map, position, selectedZoom])

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
  mapSizeInches = 5,
  mapWidthInches,
  mapHeightInches,
  selectedZoom = 14,
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

  const frameWidth = `${mapWidthInches || mapSizeInches}in`
  const frameHeight = `${mapHeightInches || mapSizeInches}in`

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
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="relative z-0 flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1"
        style={{
          width: `min(100%, ${frameWidth})`,
          height: frameHeight,
        }}
      >
        {showUseMyLocation && (
          <div className="z-[650] self-start">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {geoLoading ? 'Detecting location...' : 'Use My Current Location'}
            </button>
          </div>
        )}

        <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg">
          {hintText ? (
            <div className="pointer-events-none absolute left-2 top-2 z-[500] rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white">
              {hintText}
            </div>
          ) : null}

          <MapContainer
            center={selectedPosition || BANGLADESH_CENTER}
            zoom={BANGLADESH_FIT_ZOOM}
            minZoom={6}
            maxZoom={18}
            zoomSnap={0.1}
            zoomDelta={0.2}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            className="bg-amber-50"
            maxBounds={BANGLADESH_BOUNDS}
            maxBoundsViscosity={0.7}
            attributionControl={false}
          >
            <MapInvalidateSize />
            <MapViewportController position={selectedPosition} selectedZoom={selectedZoom} />
            <TileLayer
              attribution=''
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <MapClickHandler onPick={onPick} />

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

      {geoError && <p className="mt-2 text-center text-[11px] text-rose-600">{geoError}</p>}
    </div>
  )
}
