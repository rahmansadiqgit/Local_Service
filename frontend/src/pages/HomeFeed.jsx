import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import LocationPickerMap from '../components/LocationPickerMap'
import PostCard from '../components/PostCard'
import useAuth from '../context/useAuth'
import useCart from '../context/useCart'

const RADIUS_OPTIONS_KM = [5, 10, 15, 25, 50]

const toCoordinateOrNull = (value) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const distanceInKm = (lat1, lng1, lat2, lng2) => {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

const locationTextMatches = (postLocation, filterLocation) => {
  const postText = String(postLocation || '').trim().toLowerCase()
  const filterText = String(filterLocation || '').trim().toLowerCase()

  if (!filterText) return true
  if (!postText) return false

  return postText.includes(filterText) || filterText.includes(postText)
}

export default function HomeFeed() {

  const navigate = useNavigate()

  // ✅ FIXED: include user
  const { isAuthenticated, user } = useAuth()

  // ✅ FIXED: missing cart functions
  const { addToCart, isInCart } = useCart()

  const [posts, setPosts] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [skills, setSkills] = useState([])
  const [expertises, setExpertises] = useState([])
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [peopleSearch, setPeopleSearch] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    postType: '',
    location: '',
    latitude: '',
    longitude: '',
    radiusKm: '',
    minCost: '',
    maxCost: '',
    rating: '',
  })
  const [filterLocationLoading, setFilterLocationLoading] = useState(false)

  const [actionMessage, setActionMessage] = useState('')
  const [openDetailsPostId, setOpenDetailsPostId] = useState(null)
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null)
  const currentUserId = user?.id

  useEffect(() => {
    const query = filters.location?.trim()
    const hasCoordinates =
      toCoordinateOrNull(filters.latitude) !== null &&
      toCoordinateOrNull(filters.longitude) !== null

    if (!query || hasCoordinates) {
      return
    }

    const timeoutId = setTimeout(async () => {
      setFilterLocationLoading(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            `${query}, Bangladesh`,
          )}&format=jsonv2&limit=1&countrycodes=bd`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) return

        const data = await response.json()
        const first = Array.isArray(data) ? data[0] : null
        if (!first?.lat || !first?.lon) return

        setFilters((prev) => {
          if (prev.location?.trim() !== query) return prev
          return {
            ...prev,
            latitude: String(first.lat),
            longitude: String(first.lon),
          }
        })
      } catch (error) {
        console.warn('Filter forward geocoding failed:', error)
      } finally {
        setFilterLocationLoading(false)
      }
    }, 700)

    return () => clearTimeout(timeoutId)
  }, [filters.location, filters.latitude, filters.longitude])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const publicRequestConfig = { skipAuth: true, skipAuthRedirect: true }

        const postRes = await api.get('/posts/', publicRequestConfig)
        if (!active) return
        setPosts(postRes.data)

        const detailResponses = await Promise.allSettled([
          api.get('/skills/', publicRequestConfig),
          api.get('/expertises/', publicRequestConfig),
          api.get('/products/', publicRequestConfig),
          api.get('/ratings/', publicRequestConfig),
          api.get('/erp/', publicRequestConfig),
        ])

        if (!active) return
        setSkills(detailResponses[0].status === 'fulfilled' ? detailResponses[0].value.data : [])
        setExpertises(detailResponses[1].status === 'fulfilled' ? detailResponses[1].value.data : [])
        setProducts(detailResponses[2].status === 'fulfilled' ? detailResponses[2].value.data : [])
        setRatings(detailResponses[3].status === 'fulfilled' ? detailResponses[3].value.data : [])
        setErpItems(detailResponses[4].status === 'fulfilled' ? detailResponses[4].value.data : [])

        if (isAuthenticated) {
          const usersRes = await api.get('/users/')
          if (active) {
            setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
          }
        } else {
          setAllUsers([])
        }

      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    const handlePostCreated = () => load()
    const handlePostDeleted = () => load()

    window.addEventListener('post-created', handlePostCreated)
    window.addEventListener('post-deleted', handlePostDeleted)

    return () => {
      active = false
      window.removeEventListener('post-created', handlePostCreated)
      window.removeEventListener('post-deleted', handlePostDeleted)
    }

  }, [isAuthenticated])

  const searchedUsers = useMemo(() => {
    const query = String(peopleSearch || '').trim().toLowerCase()
    if (!query) return []

    return (allUsers || [])
      .filter((item) => {
        const name = `${item?.name || ''} ${item?.username || ''}`.toLowerCase()
        const educationSkills = String(item?.education_skills || '').toLowerCase()
        return name.includes(query) || educationSkills.includes(query)
      })
      .sort((a, b) => {
        const aName = String(a?.name || a?.username || '').toLowerCase()
        const bName = String(b?.name || b?.username || '').toLowerCase()
        return aName.localeCompare(bName)
      })
      .slice(0, 8)
  }, [allUsers, peopleSearch])

  const usersById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(allUsers) ? allUsers : []).forEach((entry) => {
      const parsedId = Number(entry?.id)
      if (!Number.isFinite(parsedId) || parsedId <= 0) return
      map.set(parsedId, entry)
    })
    return map
  }, [allUsers])

  const receiverByPostId = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(erpItems) ? erpItems : []).forEach((erp) => {
      if (String(erp?.stage || '') !== 'Completed') return
      const postId = Number(erp?.post)
      const receiverId = Number(erp?.receiver)
      const entryId = Number(erp?.id || 0)
      if (!Number.isFinite(postId) || postId <= 0 || !Number.isFinite(receiverId) || receiverId <= 0) return

      const prev = map.get(postId)
      if (!prev || entryId > prev.erpId) {
        map.set(postId, { receiverId, erpId: entryId })
      }
    })
    return map
  }, [erpItems])

  const skillsByPost = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[skill.post] = acc[skill.post] || []
      acc[skill.post].push(skill)
      return acc
    }, {})
  }, [skills])

  const expertisesByPost = useMemo(() => {
    return expertises.reduce((acc, expertise) => {
      acc[expertise.post] = acc[expertise.post] || []
      acc[expertise.post].push(expertise)
      return acc
    }, {})
  }, [expertises])

  const productsByPost = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.post] = acc[product.post] || []
      acc[product.post].push(product)
      return acc
    }, {})
  }, [products])

  const ratingByPost = useMemo(() => {
    const ownerByPostId = new Map(
      (Array.isArray(posts) ? posts : []).map((post) => [
        Number(post?.id),
        Number(post?.owner_id ?? post?.owner),
      ]),
    )

    return (Array.isArray(ratings) ? ratings : []).reduce((acc, entry) => {
      const postId = Number(entry?.post)
      const ownerId = ownerByPostId.get(postId)
      const providerId = Number(entry?.provider)
      const customerId = Number(entry?.customer)
      const receiverEntry = receiverByPostId.get(postId)
      const receiverId = Number(receiverEntry?.receiverId)

      if (!Number.isFinite(postId) || !Number.isFinite(ownerId) || ownerId <= 0) return acc

      // HomeFeed should show receiver's review about the post owner, not owner-authored ratings.
      const isReceiverReview =
        Number.isFinite(customerId)
        && customerId > 0
        && customerId !== ownerId
        && providerId === ownerId

      if (!isReceiverReview) return acc

      // Prefer explicit receiver feedback when ERP receiver is known for this post.
      if (Number.isFinite(receiverId) && receiverId > 0 && customerId !== receiverId) return acc

      const prev = acc[postId]
      if (!prev || Number(entry?.id || 0) > Number(prev?.id || 0)) {
        acc[postId] = entry
      }

      return acc
    }, {})
  }, [ratings, posts, receiverByPostId])

  const commentsByPost = useMemo(() => {
    const ownerByPostId = new Map(
      (Array.isArray(posts) ? posts : []).map((post) => [
        Number(post?.id),
        Number(post?.owner_id ?? post?.owner),
      ]),
    )

    const result = {}
    ;(Array.isArray(ratings) ? ratings : []).forEach((entry) => {
      const postId = Number(entry?.post)
      const ownerId = ownerByPostId.get(postId)
      const providerId = Number(entry?.provider)
      const customerId = Number(entry?.customer)
      if (!Number.isFinite(postId) || !Number.isFinite(ownerId) || ownerId <= 0) return
      if (providerId !== ownerId) return
      if (!Number.isFinite(customerId) || customerId <= 0 || customerId === ownerId) return

      const reviewer = usersById.get(customerId)
      if (!result[postId]) result[postId] = []

      result[postId].push({
        id: Number(entry?.id || 0),
        rating: entry,
        reviewer: {
          id: customerId,
          name: reviewer?.name || reviewer?.username || entry?.customer_name || `User #${customerId}`,
          photo: reviewer?.profile_photo || entry?.customer_profile_photo || '',
        },
      })
    })

    Object.keys(result).forEach((postId) => {
      result[postId].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    })

    return result
  }, [ratings, posts, usersById])

  const averageRatingByUser = useMemo(() => {
    const totals = {}
    const counts = {}

    ;(Array.isArray(ratings) ? ratings : []).forEach((entry) => {
      const providerId = Number(entry?.provider)
      const value = Number(entry?.rating_value)
      if (!Number.isFinite(providerId) || providerId <= 0 || !Number.isFinite(value)) return
      totals[providerId] = (totals[providerId] || 0) + value
      counts[providerId] = (counts[providerId] || 0) + 1
    })

    const averages = {}
    Object.keys(totals).forEach((providerId) => {
      const count = counts[providerId] || 1
      averages[providerId] = totals[providerId] / count
    })
    return averages
  }, [ratings])

  const costSummaryByPost = useMemo(() => {
    const map = {}

    posts.forEach((post) => {
      const skillCosts = (skillsByPost[post.id] || []).map((item) =>
        Number(item.cost_per_unit || 0)
      )

      const productCosts = (productsByPost[post.id] || []).map((item) =>
        Number(item.cost_per_unit || 0)
      )

      const allCosts = [...skillCosts, ...productCosts]

      const min = allCosts.length ? Math.min(...allCosts) : 0
      const max = allCosts.length ? Math.max(...allCosts) : 0

      map[post.id] = { min, max }
    })

    return map

  }, [posts, productsByPost, skillsByPost])

  const filteredPosts = useMemo(() => {
    const activeRadiusKm = toCoordinateOrNull(filters.radiusKm)

    return posts.filter((post) => {

      if (filters.postType && post.post_type !== filters.postType) return false

      const filterLat = toCoordinateOrNull(filters.latitude)
      const filterLng = toCoordinateOrNull(filters.longitude)
      const hasMapFilter = filterLat !== null && filterLng !== null

      if (hasMapFilter) {
        const postLat = toCoordinateOrNull(post.latitude)
        const postLng = toCoordinateOrNull(post.longitude)

        if (postLat === null || postLng === null) {
          return locationTextMatches(post.location, filters.location)
        }

        if (activeRadiusKm !== null) {
          const distance = distanceInKm(filterLat, filterLng, postLat, postLng)
          if (distance > activeRadiusKm) {
            return false
          }
        }
      } else if (
        filters.location &&
        !post.location?.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        return false
      }

      if (filters.search) {
        const query = filters.search.toLowerCase()

        const haystack =
          `${post.post_name || ''} ${post.post_title || ''} ${post.brand_company_name || ''} ${post.description || ''}`
            .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      const cost = costSummaryByPost[post.id] || { min: 0, max: 0 }

      if (filters.minCost && cost.min < Number(filters.minCost)) return false
      if (filters.maxCost && cost.max > Number(filters.maxCost)) return false

      const ratingValue = ratingByPost[post.id]?.rating_value || 0

      if (filters.rating && ratingValue < Number(filters.rating)) return false

      return true
    })
  }, [posts, filters, costSummaryByPost, ratingByPost])

  const handleFilterChange = (event) => {
    const { name, value } = event.target

    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLocationFilterInputChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({
      ...prev,
      location: value,
      latitude: '',
      longitude: '',
    }))
  }

  const handleFilterLocationPick = async (lat, lng) => {
    setFilters((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
      location: `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`,
    }))

    setFilterLocationLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) return

      const data = await response.json()
      const resolvedLocation =
        data?.display_name ||
        [
          data?.address?.suburb,
          data?.address?.city || data?.address?.town || data?.address?.village,
          data?.address?.state,
          data?.address?.country,
        ]
          .filter(Boolean)
          .join(', ')

      if (resolvedLocation) {
        setFilters((prev) => ({
          ...prev,
          location: resolvedLocation,
        }))
      }
    } catch (error) {
      console.warn('Filter reverse geocoding failed:', error)
    } finally {
      setFilterLocationLoading(false)
    }
  }

  const handleAction = async (post, actionType) => {
    setActionMessage('')

    const postOwnerId = post.owner_id || post.owner
    if (currentUserId && String(postOwnerId) === String(currentUserId)) {
      setActionMessage("You can't apply or book your own post.")
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setActionMessage('Continue in manage post to complete this action.')
    setTimeout(() => {
      navigate(`/manage-post/${post.id}`, { state: { actionType } })
    }, 300)
  }

  const handleAddToCart = (post) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const added = addToCart(post, {
      minCost: costSummaryByPost[post.id]?.min || 0,
    })

    setActionMessage(
      added
        ? 'Post added to your cart.'
        : 'This post is already in your cart.'
    )
  }

  const handleToggleDetails = (postId, shouldOpen) => {
    setOpenDetailsPostId((prev) => {
      if (!shouldOpen) {
        return prev === postId ? null : prev
      }
      return postId
    })
  }

  const handleToggleComments = (postId, shouldOpen) => {
    setOpenCommentsPostId((prev) => {
      if (!shouldOpen) return prev === postId ? null : prev
      return postId
    })
  }

  return (
    <div className="space-y-6">

      {/* HERO BANNER SECTION */}
      <section
        className="relative overflow-hidden rounded-3xl shadow-lg"
        style={{
          backgroundImage: `url(/images/hero.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 via-brand-700/20 to-brand-800/20" />

        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1200" height="400" fill="url(#grid)" opacity="0.1" />
          </svg>
        </div>

        <div className="relative z-10 px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-4xl space-y-8 text-center">
            <div className="space-y-4">
              <h1
                className="text-4xl font-bold text-yellow-200 sm:text-5xl lg:text-6xl"
                style={{ textShadow: '0 4px 12px rgba(0, 0, 0, 0.9)' }}
              >
                Find Trusted Local Services Near You
              </h1>
              <p
                className="text-lg font-bold text-amber-100 sm:text-xl lg:text-2xl"
                style={{ textShadow: '0 3px 10px rgba(0, 0, 0, 0.9)' }}
              >
                Connect with plumbers, electricians, cleaners, and other professionals in your area.
              </p>
            </div>

            <div className="space-y-2 text-center">
              <div className="flex justify-center">
                <Link
                  to={isAuthenticated ? '/create-post' : '/login?next=%2Fcreate-post'}
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-yellow-400 px-8 text-center text-base font-bold text-black shadow-md transition hover:bg-yellow-500 hover:shadow-lg"
                  style={{ color: '#000000' }}
                >
                  Create post
                </Link>
              </div>
              <p
                className="text-sm font-semibold text-amber-100"
                style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)' }}
              >
                Request your Demand or Offer a Service
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Browse the latest available & demand service posts</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['All', 'Demand', 'Supply'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, postType: type === 'All' ? '' : type }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  (filters.postType === '' && type === 'All') || filters.postType === type
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-200 text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/45 bg-gradient-to-r from-orange-200/45 via-amber-100/35 to-orange-300/35 p-4 shadow-[0_14px_30px_rgba(251,146,60,0.22)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_52%)]" />
          <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-orange-200/45 blur-2xl" />
          <div className="relative mb-4">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/45 pb-3">
              <p className="text-sm font-extrabold tracking-wide text-orange-900">Find Peoples & Skills</p>
              <p className="text-xs text-slate-600">Search members by Name or Education & Skills</p>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={peopleSearch}
                onChange={(event) => setPeopleSearch(event.target.value)}
                placeholder="Find someone or find skills"
                className="h-11 min-w-[240px] flex-1 rounded-xl border border-white/50 bg-white/45 px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              />
              <button
                type="button"
                onClick={() => setPeopleSearch((prev) => String(prev || '').trim())}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
              >
                Search
              </button>
            </div>

            <div className="mt-2">
              {!isAuthenticated ? (
                <p className="text-sm text-slate-600">
                  Login to search all users, including members who have not posted yet.
                </p>
              ) : String(peopleSearch || '').trim() ? (
                searchedUsers.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {searchedUsers.map((person) => (
                      <div
                        key={`user-search-${person.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {person.name || person.username || `User #${person.id}`}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {person.education_skills || 'No education/skills added yet'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/${person.id}`)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No matching user found.</p>
                )
              ) : (
                <p className="text-sm text-slate-600">Type a Name like "Partho Chandra" or a Skill like "Software Engineer"</p>
              )}
            </div>
          </div>

          <div className="h-4" />

          <div className="relative mb-4 flex items-center justify-between gap-3 border-b border-white/45 pb-3">
            <p className="text-sm font-extrabold tracking-wide text-orange-900">Search & Filters</p>
            <p className="text-xs text-slate-600">Use filters to quickly narrow service posts</p>
          </div>

          <div className="relative grid gap-4 lg:grid-cols-6">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Search</label>
              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Post name or brand"
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Location</label>
              <input
                name="location"
                value={filters.location}
                onChange={handleLocationFilterInputChange}
                placeholder="Type city or pick from map"
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              />
              {filterLocationLoading && (
                <p className="mt-1 text-[11px] text-slate-600">Resolving location...</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Radius (km)</label>
              <select
                name="radiusKm"
                value={filters.radiusKm}
                onChange={handleFilterChange}
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              >
                <option value="">No radius</option>
                {RADIUS_OPTIONS_KM.map((km) => (
                  <option key={km} value={String(km)}>
                    {km} km
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Min Cost</label>
              <input
                name="minCost"
                type="number"
                value={filters.minCost}
                onChange={handleFilterChange}
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Max Cost</label>
              <input
                name="maxCost"
                type="number"
                value={filters.maxCost}
                onChange={handleFilterChange}
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-900/90">Rating</label>
              <select
                name="rating"
                value={filters.rating}
                onChange={handleFilterChange}
                className="mt-1.5 w-full rounded-xl border border-white/50 bg-white/45 px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
              >
                <option value="">Any</option>
                <option value="5">5⭐</option>
                <option value="4">4⭐</option>
                <option value="3">3⭐</option>
                <option value="2">2⭐</option>
                <option value="1">1⭐</option>
              </select>
            </div>

            <div className="lg:col-span-6">
              <div className="mx-auto max-w-4xl">
                <LocationPickerMap
                  latitude={filters.latitude}
                  longitude={filters.longitude}
                  radiusKm={toCoordinateOrNull(filters.radiusKm)}
                  onPick={handleFilterLocationPick}
                  mapWidthInches={16}
                  mapHeightInches={4}
                  selectedZoom={10}
                  popupText="Confirm this search location?"
                />
              </div>
            </div>

          </div>
        </div>

        {actionMessage && (
          <div className="card text-sm text-slate-500">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <div className="card">Loading feed...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="card">No posts match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            {filteredPosts.map((post) => {
              const ownerId = Number(post.owner_id || post.owner)
              const profileRating =
                averageRatingByUser[ownerId]
                ?? Number(post.owner_profile_rating ?? post.owner_rating)
              const ratingEntry = ratingByPost[post.id]
              const reviewerId = Number(ratingEntry?.customer)
              const reviewerUser = usersById.get(reviewerId)
              const postComments = commentsByPost[post.id] || []

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  skills={skillsByPost[post.id] || []}
                  expertises={expertisesByPost[post.id] || []}
                  products={productsByPost[post.id] || []}
                  rating={ratingEntry}
                  ratingReviewer={{
                    id: reviewerId,
                    name:
                      reviewerUser?.name
                      || reviewerUser?.username
                      || ratingEntry?.customer_name
                      || (Number.isFinite(reviewerId) && reviewerId > 0 ? `User #${reviewerId}` : 'Customer'),
                    photo: reviewerUser?.profile_photo || ratingEntry?.customer_profile_photo || '',
                  }}
                  isOwnPost={
                    Boolean(currentUserId) &&
                    String(post.owner_id || post.owner) === String(currentUserId)
                  }
                  profile={{
                    id: post.owner_id || post.owner || null,
                    name:
                      post.owner_name ||
                      post.owner_username ||
                      post.brand_company_name ||
                      'Localix Member',
                    supplyStatus: post.owner_supply_status || '',
                    demandStatus: post.owner_demand_status || '',
                    photo: post.owner_profile_photo || '',
                    rating: Number.isFinite(profileRating) ? profileRating : null,
                  }}
                  onAction={handleAction}
                  onAddToCart={handleAddToCart}
                  inCart={isInCart(post.id)}
                  isDetailsOpen={openDetailsPostId === post.id}
                  onToggleDetails={(shouldOpen) => handleToggleDetails(post.id, shouldOpen)}
                  ratingComments={postComments}
                  isCommentsOpen={openCommentsPostId === post.id}
                  onToggleComments={(shouldOpen) => handleToggleComments(post.id, shouldOpen)}
                />
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}