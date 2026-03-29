import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import ExpertiseTable from '../components/ExpertiseTable';
import ProductTable from '../components/ProductTable';
import ServiceTable from '../components/ServiceTable';
import useAuth from '../context/useAuth';

export default function Dashboard() {
  const { id } = useParams();
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [ratings, setRatings] = useState([])
  const [users, setUsers] = useState([])
  const [skills, setSkills] = useState([])
  const [expertises, setExpertises] = useState([])
  const [products, setProducts] = useState([])
  const [erpItems, setErpItems] = useState([])
  const [expandedPostId, setExpandedPostId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [connectionRequestMessage, setConnectionRequestMessage] = useState('')
  const [connectionRequestRole, setConnectionRequestRole] = useState('skill_provider')
  const [connectionNote, setConnectionNote] = useState('')
  const [isSendingConnectionRequest, setIsSendingConnectionRequest] = useState(false)
  const [connectionsOverview, setConnectionsOverview] = useState(null)

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        let profileData;
        if (id) {
          // Fetch specific user's profile
          try {
            const profileRes = await api.get(`/users/${id}/`);
            profileData = profileRes.data;
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
            setError('Unable to load user profile');
            return;
          }
        } else {
          // Fetch current user's profile
          const profileRes = await api.get('/users/profile/');
          profileData = profileRes.data;
        }
        
        const [postRes, ratingRes, skillRes, expertiseRes, productRes, overviewRes, userRes, erpRes] = await Promise.all([
          api.get('/posts/'),
          api.get('/ratings/'),
          api.get('/skills/'),
          api.get('/expertises/'),
          api.get('/products/'),
          api.get('/connections/overview/'),
          api.get('/users/'),
          api.get('/erp/'),
        ]);
        
        if (!active) return;
        setPosts(postRes.data);
        setRatings(ratingRes.data);
        setUsers(userRes.data || []);
        setSkills(skillRes.data);
        setExpertises(expertiseRes.data);
        setProducts(productRes.data);
        setErpItems(erpRes.data || []);
        setConnectionsOverview(overviewRes.data || null)
        setProfile(profileData);
      } catch (error) {
        console.error('Dashboard load error:', error);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const ratingsByPost = useMemo(() => {
    return ratings.reduce((acc, rating) => {
      acc[rating.post] = acc[rating.post] || []
      acc[rating.post].push(rating)
      return acc
    }, {})
  }, [ratings])

  const averageRatingByPost = useMemo(() => {
    const map = {}
    Object.entries(ratingsByPost).forEach(([postId, items]) => {
      const total = items.reduce((sum, item) => sum + Number(item.rating_value || 0), 0)
      map[postId] = items.length ? total / items.length : 0
    })
    return map
  }, [ratingsByPost])

  const ratingsSummary = useMemo(() => {
    const targetId = profile?.id
    if (targetId == null) return []

    const ownedPosts = posts.filter((post) => {
      const ownerId = post.owner_id ?? post.owner
      return String(ownerId) === String(targetId)
    })

    return ownedPosts
      .map((post) => {
        const ownerId = Number(post.owner_id ?? post.owner)
        const items = (ratingsByPost[post.id] || []).filter(
          (entry) => Number(entry?.provider) === ownerId,
        )
        const total = items.reduce((sum, item) => sum + Number(item.rating_value || 0), 0)
        const average = items.length ? total / items.length : 0
        return {
          postId: post.id,
          postName: post.post_title || post.post_name || `Post #${post.id}`,
          average: average.toFixed(2),
          count: items.length,
        }
      })
      .sort((left, right) => Number(right.average) - Number(left.average))
  }, [profile?.id, posts, ratingsByPost])

  const skillsByPost = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[skill.post] = acc[skill.post] || []
      acc[skill.post].push(skill)
      return acc
    }, {})
  }, [skills])

  const productsByPost = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.post] = acc[product.post] || []
      acc[product.post].push(product)
      return acc
    }, {})
  }, [products])

  const expertisesByPost = useMemo(() => {
    return expertises.reduce((acc, expertise) => {
      acc[expertise.post] = acc[expertise.post] || []
      acc[expertise.post].push(expertise)
      return acc
    }, {})
  }, [expertises])

  const usersById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(users) ? users : []).forEach((entry) => {
      const idValue = Number(entry?.id)
      if (Number.isFinite(idValue) && idValue > 0) {
        map.set(idValue, entry)
      }
    })
    return map
  }, [users])

  const roleLabelsByPostAndUser = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(erpItems) ? erpItems : []).forEach((item) => {
      if (String(item?.stage || '') !== 'Completed') return
      const postId = Number(item?.post)
      if (!Number.isFinite(postId) || postId <= 0) return

      if (!map.has(postId)) {
        map.set(postId, new Map())
      }
      const perPost = map.get(postId)

      const addRole = (userId, roleLabel) => {
        const parsedUserId = Number(userId)
        if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) return
        if (!perPost.has(parsedUserId)) {
          perPost.set(parsedUserId, new Set())
        }
        perPost.get(parsedUserId).add(roleLabel)
      }

      addRole(item?.provider, 'Provider')
      addRole(item?.receiver, 'Receiver')

      const members = item?.configuration_snapshot?.members || {}
      const roleGroups = [
        { keys: ['expertise'], label: 'Expertise' },
        { keys: ['skill_provider', 'service_provider'], label: 'Skill provider' },
        { keys: ['supplier', 'delivery_man', 'delivary_man', 'delivery'], label: 'Delivary Man' },
      ]

      roleGroups.forEach((group) => {
        group.keys.forEach((key) => {
          const assigneeIds = Array.isArray(members?.[key]?.assignee_ids) ? members[key].assignee_ids : []
          assigneeIds.forEach((idValue) => addRole(idValue, group.label))
        })
      })
    })
    return map
  }, [erpItems])

  const providerGivenRatingsForProfile = useMemo(() => {
    const targetId = Number(profile?.id)
    if (!Number.isFinite(targetId) || targetId <= 0) return []

    const roleAliases = {
      expertise: 'Expertise',
      skill_provider: 'Skill provider',
      service_provider: 'Skill provider',
      supplier: 'Delivary Man',
      delivery_man: 'Delivary Man',
      delivary_man: 'Delivary Man',
      delivery: 'Delivary Man',
    }

    const collectRolesForUser = (erp, userId) => {
      const roles = new Set()
      if (Number(erp?.provider) === Number(userId)) {
        roles.add('Providing')
      }
      if (Number(erp?.receiver) === Number(userId)) {
        roles.add('Receiving')
      }

      const snapshotMembers = erp?.configuration_snapshot?.members || {}
      Object.entries(snapshotMembers).forEach(([key, bucket]) => {
        const assigneeIds = Array.isArray(bucket?.assignee_ids) ? bucket.assignee_ids : []
        if (assigneeIds.some((value) => Number(value) === Number(userId))) {
          roles.add(roleAliases[key] || key)
        }
      })

      const assignedWorkers = Array.isArray(erp?.assigned_workers) ? erp.assigned_workers : []
      if (assignedWorkers.some((value) => Number(value) === Number(userId))) {
        roles.add('Delivary Man')
      }

      return Array.from(roles)
    }

    return (Array.isArray(ratings) ? ratings : [])
      .filter((entry) => Number(entry?.provider) === targetId)
      .map((entry) => {
        const reviewerId = Number(entry?.customer)
        const postId = Number(entry?.post)
        const matchingErps = (Array.isArray(erpItems) ? erpItems : []).filter(
          (erp) =>
            String(erp?.stage || '') === 'Completed'
            && Number(erp?.post) === postId
            && Number(erp?.provider) === reviewerId
            && collectRolesForUser(erp, targetId).length > 0,
        )

        if (!matchingErps.length) {
          return null
        }

        const responsibilitySet = new Set()
        matchingErps.forEach((erp) => {
          collectRolesForUser(erp, targetId).forEach((roleLabel) => responsibilitySet.add(roleLabel))
        })

        const post = posts.find((item) => Number(item.id) === postId)
        const reviewer = usersById.get(reviewerId)

        return {
          id: Number(entry?.id || 0),
          postId,
          postName: post?.post_title || post?.post_name || `Post #${postId}`,
          providerName: reviewer?.name || reviewer?.username || `User #${reviewerId}`,
          responsibilities: Array.from(responsibilitySet),
          rating: Number(entry?.rating_value || 0),
          comment: String(entry?.review_text || '').trim(),
        }
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.id) - Number(left.id))
  }, [profile?.id, ratings, erpItems, posts, usersById])

  // Filter posts for the selected profile; support owner_id/owner and string/number IDs.
  const userPosts = useMemo(() => {
    const targetId = profile?.id
    if (targetId == null) return []
    return posts.filter((post) => {
      const ownerId = post.owner_id ?? post.owner
      return String(ownerId) === String(targetId)
    })
  }, [posts, profile?.id])

  const supplyPosts = useMemo(
    () =>
      userPosts
        .filter((post) => post.post_type === 'Supply')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [userPosts],
  )

  const demandPosts = useMemo(
    () =>
      userPosts
        .filter((post) => post.post_type === 'Demand')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [userPosts],
  )

  const backendOrigin = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    return apiBase.replace(/\/api\/?$/, '')
  }, [])

  const toMediaUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    if (value.startsWith('/')) return `${backendOrigin}${value}`
    return `${backendOrigin}/${value}`
  }

  const formatPostDate = (value) => {
    if (!value) return 'Just now'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'Just now'
    return parsed.toLocaleString()
  }

  const toSnippet = (value, max = 95) => {
    const text = String(value || '').trim()
    if (!text) return 'No description added yet.'
    return text.length > max ? `${text.slice(0, max)}...` : text
  }

  const availableStatus = String(profile?.supply_status || '').trim() || 'None'
  const demandStatus = String(profile?.demand_status || '').trim() || 'None'

  const normalizeCategoryLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'expertise') return 'Expertise'
    if (normalized === 'services' || normalized === 'service') return 'Services'
    if (normalized === 'product' || normalized === 'products') return 'Product'
    return ''
  }

  const parsePostCategories = (value) =>
    String(value || '')
      .split(',')
      .map((item) => normalizeCategoryLabel(item))
      .filter(Boolean)

  const stripCategoryPrefix = (value) =>
    String(value || '')
      .replace(/^__expertise__::/i, '')
      .replace(/^__service__::/i, '')
      .trim()

  const buildCategoryRows = (post) => {
    const categories = parsePostCategories(post?.post_name)
    const hasExpertise = categories.includes('Expertise')
    const hasServices = categories.includes('Services')
    const hasProduct = categories.includes('Product')
    const showServiceDescription = !(categories.length === 1 && hasServices)
    const showProductDescription = !(categories.length === 1 && hasProduct)
    const rawSkills = skillsByPost[post.id] || []
    const rawExpertises = expertisesByPost[post.id] || []
    const rawProducts = productsByPost[post.id] || []

    const expertiseTagged = rawSkills
      .filter((item) => /^__expertise__::/i.test(String(item.skill_name || '')))
      .map((item) => ({ ...item, skill_name: stripCategoryPrefix(item.skill_name) }))

    const serviceTagged = rawSkills
      .filter((item) => /^__service__::/i.test(String(item.skill_name || '')))
      .map((item) => ({
        ...item,
        service_name: stripCategoryPrefix(item.skill_name),
      }))

    const expertiseRows =
      rawExpertises.length > 0
        ? rawExpertises
        : expertiseTagged.length > 0
        ? expertiseTagged
        : hasExpertise && !hasServices
          ? rawSkills
              .filter((item) => !/^__service__::/i.test(String(item.skill_name || '')))
              .map((item) => ({ ...item, skill_name: stripCategoryPrefix(item.skill_name) }))
          : []

    const serviceRows =
      serviceTagged.length > 0
        ? serviceTagged
        : hasServices && !hasExpertise
          ? rawSkills.map((item) => ({ ...item, service_name: stripCategoryPrefix(item.skill_name) }))
          : []

    const productRows = hasProduct ? rawProducts : []

    return {
      hasExpertise,
      hasServices,
      hasProduct,
      expertiseRows,
      serviceRows,
      productRows,
      showServiceDescription,
      showProductDescription,
    }
  }

  const canDeletePosts = useMemo(() => {
    if (!user?.id || !profile?.id) return false
    return String(user.id) === String(profile.id)
  }, [user?.id, profile?.id])

  const canSendConnectionRequest = useMemo(() => {
    if (!id || !user?.id || !profile?.id) return false
    return String(user.id) !== String(profile.id)
  }, [id, user?.id, profile?.id])

  const connectionRelationship = useMemo(() => {
    const targetId = Number(profile?.id)
    if (!Number.isFinite(targetId) || targetId <= 0 || !connectionsOverview) {
      return 'none'
    }

    const includesTarget = (items) =>
      (Array.isArray(items) ? items : []).some((item) => Number(item?.id) === targetId)

    const memberConnections = connectionsOverview.member_connections || {}
    const allMemberItems = [
      ...(Array.isArray(memberConnections.expertise) ? memberConnections.expertise : []),
      ...(Array.isArray(memberConnections.skill_provider) ? memberConnections.skill_provider : []),
      ...(Array.isArray(memberConnections.supplier) ? memberConnections.supplier : []),
    ]

    const isConnected =
      includesTarget(connectionsOverview.hired_connections) ||
      includesTarget(connectionsOverview.live_connections) ||
      includesTarget(connectionsOverview.new_connections) ||
      includesTarget(connectionsOverview.recent_connections) ||
      includesTarget(allMemberItems)

    if (isConnected) return 'connected'

    const hasOutgoingPending = (Array.isArray(connectionsOverview.outgoing_requests)
      ? connectionsOverview.outgoing_requests
      : []).some((item) => Number(item?.addressee) === targetId)
    if (hasOutgoingPending) return 'pending_outgoing'

    const hasIncomingPending = (Array.isArray(connectionsOverview.incoming_requests)
      ? connectionsOverview.incoming_requests
      : []).some((item) => Number(item?.requester) === targetId)
    if (hasIncomingPending) return 'pending_incoming'

    return 'none'
  }, [connectionsOverview, profile?.id])

  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm('Are you sure you want to delete this post?')
    if (!confirmed) return

    setDeleteMessage('')
    try {
      await api.delete(`/posts/${postId}/`)
      setPosts((prev) => prev.filter((post) => post.id !== postId))
      setSkills((prev) => prev.filter((item) => item.post !== postId))
      setExpertises((prev) => prev.filter((item) => item.post !== postId))
      setProducts((prev) => prev.filter((item) => item.post !== postId))
      setRatings((prev) => prev.filter((item) => item.post !== postId))
      setExpandedPostId((prev) => (prev === postId ? null : prev))
      setDeleteMessage('Post deleted successfully.')
      window.dispatchEvent(new Event('post-deleted'))
    } catch (deleteError) {
      console.error(deleteError)
      setDeleteMessage('Failed to delete post.')
    }
  }

  const handleSendConnectionRequest = async () => {
    if (!canSendConnectionRequest || !profile?.id) return
    setConnectionNote('')
    setIsSendingConnectionRequest(true)
    try {
      await api.post('/connections/request/', {
        addressee_id: profile.id,
        requested_role: connectionRequestRole,
        request_message: connectionRequestMessage.trim(),
      })
      setConnectionRequestMessage('')
      setConnectionNote('Connection request sent.')
      const { data } = await api.get('/connections/overview/')
      setConnectionsOverview(data || null)
    } catch (requestError) {
      console.error(requestError)
      setConnectionNote(requestError?.response?.data?.detail || 'Failed to send connection request.')
    } finally {
      setIsSendingConnectionRequest(false)
    }
  }

  const renderMiniPostCard = (post, sectionType) => {
    const postImageSrc = toMediaUrl(post.image)
    const isDemand = sectionType === 'Demand'
    const rating = Number(averageRatingByPost[post.id] || 0).toFixed(2)
    const { hasExpertise, hasServices, hasProduct, expertiseRows, serviceRows, productRows, showServiceDescription, showProductDescription } =
      buildCategoryRows(post)
    const isExpanded = expandedPostId === post.id
    const postOwnerId = Number(post.owner_id ?? post.owner)
    const postRatings = (ratingsByPost[post.id] || [])
      .filter((entry) => Number(entry?.provider) === postOwnerId)
      .slice()
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    const perPostRoleMap = roleLabelsByPostAndUser.get(Number(post.id)) || new Map()

    return (
      <article
        key={post.id}
        className={`rounded-2xl border p-3 shadow-sm backdrop-blur-sm ${
          isDemand ? 'border-blue-200/70 bg-white/75' : 'border-emerald-200/70 bg-white/75'
        }`}
      >
        <div className="flex items-start gap-3">
          {postImageSrc ? (
            <img
              src={postImageSrc}
              alt={post.post_name}
              className={`h-16 w-16 rounded-xl border object-cover ${
                isDemand ? 'border-blue-100' : 'border-emerald-100'
              }`}
            />
          ) : (
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-[10px] font-semibold ${
                isDemand
                  ? 'border-blue-200 bg-blue-50 text-blue-400'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-400'
              }`}
            >
              No image
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900 break-words [overflow-wrap:anywhere]">
                {post.post_title || post.post_name || 'Untitled Post'}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  isDemand
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {sectionType}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-400">{formatPostDate(post.created_at)}</p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>{post.location || 'Remote'}</span>
              <span>Rating: {rating}</span>
            </div>

            <p className="mt-1 text-xs text-slate-600 break-words [overflow-wrap:anywhere]">{toSnippet(post.description)}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div>
                {canDeletePosts && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="rounded-full border border-red-300 bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                {isExpanded ? 'Hide Details' : 'View Details'}
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3 rounded-xl border border-violet-200/70 bg-white/70 p-3">
            {hasExpertise && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Expertise</p>
                {expertiseRows.length ? (
                  <ExpertiseTable expertises={expertiseRows} postType={post.post_type} />
                ) : (
                  <p className="text-sm text-slate-400">No expertise detail listed.</p>
                )}
              </div>
            )}

            {hasServices && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Services</p>
                {serviceRows.length ? (
                  <ServiceTable services={serviceRows} postType={post.post_type} showDescription={showServiceDescription} />
                ) : (
                  <p className="text-sm text-slate-400">No services detail listed.</p>
                )}
              </div>
            )}

            {hasProduct && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Product</p>
                {productRows.length ? (
                  <ProductTable products={productRows} postType={post.post_type} showDescription={showProductDescription} />
                ) : (
                  <p className="text-sm text-slate-400">No product detail listed.</p>
                )}
              </div>
            )}

            {!hasExpertise && !hasServices && !hasProduct && (
              <p className="text-sm text-slate-400">No detail listed.</p>
            )}

            <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
              <p className="text-sm font-semibold text-violet-800">Ratings and Comments</p>
              {postRatings.length ? (
                <div className="space-y-2">
                  {postRatings.map((entry) => {
                    const reviewerId = Number(entry?.customer)
                    const targetId = Number(entry?.provider)
                    const reviewer = usersById.get(reviewerId)
                    const target = usersById.get(targetId)
                    const reviewerRoles = Array.from(perPostRoleMap.get(reviewerId) || [])

                    return (
                      <div key={`post-rating-${post.id}-${entry.id}`} className="rounded-lg border border-violet-200 bg-white p-2">
                        <p className="font-semibold text-slate-800">
                          {reviewer?.name || reviewer?.username || `User #${reviewerId}`} -> {target?.name || target?.username || `User #${targetId}`}
                        </p>
                        {reviewerRoles.length ? (
                          <p className="mt-0.5 text-[11px] text-slate-500">Role: {reviewerRoles.join(', ')}</p>
                        ) : null}
                        <p className="mt-1 text-sm text-slate-700">
                          <span className="font-semibold">Rating:</span> {Number(entry?.rating_value || 0).toFixed(1)} / 5
                        </p>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                          <span className="font-semibold">Comment:</span> {entry?.review_text || '-'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No ratings/comments yet for this post.</p>
              )}
            </div>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="absolute -right-8 -top-8 h-10 w-16 rounded-full bg-white/30 blur-xl" />
        <div className="relative px-6 py-3.5 pr-40 sm:px-8 sm:py-4 sm:pr-44 lg:pr-48">
          <div>
            <h2
              className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              {id ? `${profile?.name || 'User'}'s Dashboard` : 'Dashboard'}
            </h2>
            <p className="mt-0.5 text-xs text-violet-800/80">
              {id ? `Overview of ${profile?.name || 'their'} Localix activity.` : 'Overview of your Localix activity.'}
            </p>
          </div>
          <img
            src="/images/dashboard.png"
            alt="Dashboard header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-36 w-36 -translate-y-1/2 object-contain sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          />
        </div>
      </div>

      {loading && (
        <div className="card bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-600">Loading dashboard...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {deleteMessage && (
        <div className="card border border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">{deleteMessage}</p>
        </div>
      )}

      {canSendConnectionRequest && (
        <div className="card border border-sky-200 bg-sky-50/80">
          <p className="text-sm font-semibold text-sky-900">Connection Request</p>
          {connectionRelationship === 'connected' ? (
            <p className="mt-2 inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              Connected
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-sky-800">Choose a connection role and send a request message.</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={connectionRequestRole}
                  onChange={(event) => setConnectionRequestRole(event.target.value)}
                  disabled={connectionRelationship !== 'none'}
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[210px]"
                >
                  <option value="expertise">Expertise</option>
                  <option value="skill_provider">Skill provider</option>
                  <option value="supplier">Delivery Man</option>
                </select>
                <input
                  type="text"
                  value={connectionRequestMessage}
                  onChange={(event) => setConnectionRequestMessage(event.target.value)}
                  placeholder="Write a short request message"
                  disabled={connectionRelationship !== 'none'}
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSendConnectionRequest}
                  disabled={isSendingConnectionRequest || connectionRelationship !== 'none'}
                  className="rounded-full border border-sky-300 bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {connectionRelationship === 'pending_outgoing'
                    ? 'Request Pending'
                    : connectionRelationship === 'pending_incoming'
                      ? 'Respond in Connections'
                      : isSendingConnectionRequest
                        ? 'Sending...'
                        : 'Connection Request'}
                </button>
              </div>
            </>
          )}
          {connectionNote ? <p className="mt-2 text-xs text-sky-800">{connectionNote}</p> : null}
        </div>
      )}

      <div className="card relative overflow-hidden border border-violet-300/80 bg-gradient-to-br from-[#e4cfff] via-[#d7c0ff] to-[#f1ccff] shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255, 255, 255, 0.35),transparent_80%)]" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-300/45 blur-3xl" />
        <div className="relative">
          <div className="mb-4 border-b border-violet-200/70 pb-3">
            <h3 className="text-xl font-bold text-violet-900">User Info</h3>
          </div>
          <div className="rounded-2xl border border-violet-300/70 bg-gradient-to-br from-[#f7edff]/80 to-[#ecd8ff]/70 px-4 py-3 backdrop-blur-sm">
            <div className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div className="border-b border-violet-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Name</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.name || profile?.username || 'User'}</p>
              </div>
              <div className="border-b border-violet-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Email</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.email || '-'}</p>
              </div>
              <div className="border-b border-violet-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Phone</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.phone || '-'}</p>
              </div>
              <div className="border-b border-violet-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Location</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{profile?.location || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Available Status</p>
                <p className="mt-1 inline-flex rounded-full border border-violet-500 bg-violet-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                  {availableStatus}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Demand Status</p>
                <p className="mt-1 inline-flex rounded-full border border-fuchsia-500 bg-fuchsia-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                  {demandStatus}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card border border-blue-200/70 bg-gradient-to-br from-[#e8f3ff] via-[#dcecff] to-[#eef5ff] shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-blue-900">Demand Posts</h3>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {demandPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No demand posts.</p>
            ) : (
              demandPosts.map((post) => renderMiniPostCard(post, 'Demand'))
            )}
          </div>
        </div>

        <div className="card border border-emerald-200/70 bg-gradient-to-br from-[#eafff5] via-[#ddf7ec] to-[#f0fff8] shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-emerald-900">Available Posts</h3>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {supplyPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No available posts.</p>
            ) : (
              supplyPosts.map((post) => renderMiniPostCard(post, 'Available'))
            )}
          </div>
        </div>
      </div>

      <div className="card border border-violet-300/80 bg-gradient-to-br from-[#f4e9ff] via-[#ecd9ff] to-[#f7ecff] shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-violet-900">Ratings Summary</h3>
        <div className="overflow-hidden rounded-2xl border-2 border-violet-300 bg-white/75 backdrop-blur-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-violet-200/70 text-violet-900">
              <tr>
                <th className="border border-violet-300 px-4 py-2">Post Name</th>
                <th className="border border-violet-300 px-4 py-2">Average Rating</th>
                <th className="border border-violet-300 px-4 py-2">Total Reviews</th>
              </tr>
            </thead>
            <tbody>
              {ratingsSummary.length === 0 ? (
                <tr>
                  <td className="border border-violet-300 px-4 py-3 text-slate-600" colSpan={3}>
                    No ratings yet.
                  </td>
                </tr>
              ) : (
                ratingsSummary.map((row) => (
                  <tr key={row.postId} className="odd:bg-white/70 even:bg-violet-50/70">
                    <td className="border border-violet-300 px-4 py-2 font-medium">{row.postName}</td>
                    <td className="border border-violet-300 px-4 py-2">{row.average}</td>
                    <td className="border border-violet-300 px-4 py-2">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border border-sky-300/80 bg-gradient-to-br from-[#eaf6ff] via-[#dff0ff] to-[#eff8ff] shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-sky-900">Provider Ratings For You</h3>
        <div className="overflow-hidden rounded-2xl border-2 border-sky-300 bg-white/80 backdrop-blur-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-sky-200/70 text-sky-900">
              <tr>
                <th className="border border-sky-300 px-4 py-2">Post Name</th>
                <th className="border border-sky-300 px-4 py-2">Provider</th>
                <th className="border border-sky-300 px-4 py-2">Responsibility</th>
                <th className="border border-sky-300 px-4 py-2">Rating</th>
                <th className="border border-sky-300 px-4 py-2">Comment</th>
              </tr>
            </thead>
            <tbody>
              {providerGivenRatingsForProfile.length === 0 ? (
                <tr>
                  <td className="border border-sky-300 px-4 py-3 text-slate-600" colSpan={5}>
                    No provider feedback found for your responsibilities.
                  </td>
                </tr>
              ) : (
                providerGivenRatingsForProfile.map((row) => (
                  <tr key={`provider-feedback-${row.id}`} className="odd:bg-white/80 even:bg-sky-50/70">
                    <td className="border border-sky-300 px-4 py-2 font-medium">{row.postName}</td>
                    <td className="border border-sky-300 px-4 py-2">{row.providerName}</td>
                    <td className="border border-sky-300 px-4 py-2">{row.responsibilities.join(', ') || '-'}</td>
                    <td className="border border-sky-300 px-4 py-2">{row.rating.toFixed(1)} / 5</td>
                    <td className="border border-sky-300 px-4 py-2 whitespace-pre-wrap">{row.comment || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
