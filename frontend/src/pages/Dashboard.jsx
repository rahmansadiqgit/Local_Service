import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import ExpertiseTable from '../components/ExpertiseTable';
import ProductTable from '../components/ProductTable';
import RatingRingAvatar from '../components/RatingRingAvatar';
import ServiceTable from '../components/ServiceTable';
import useAuth from '../context/useAuth';

export default function Dashboard() {
  const navigate = useNavigate();
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
  const [detailModalPostId, setDetailModalPostId] = useState(null)
  const [detailModalSectionType, setDetailModalSectionType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [connectionRequestMessage, setConnectionRequestMessage] = useState('')
  const [connectionRequestRole, setConnectionRequestRole] = useState('skill_provider')
  const [connectionNote, setConnectionNote] = useState('')
  const [isSendingConnectionRequest, setIsSendingConnectionRequest] = useState(false)
  const [connectionsOverview, setConnectionsOverview] = useState(null)
  const [pendingApplications, setPendingApplications] = useState([])
  const [applicationActionMessage, setApplicationActionMessage] = useState('')
  const [showRequestsPanel, setShowRequestsPanel] = useState(false)

  const buildPendingApplicationsFromErp = (erpList, ownerId) => {
    const owner = Number(ownerId)
    if (!Number.isFinite(owner) || owner <= 0) return []

    return (Array.isArray(erpList) ? erpList : [])
      .filter((item) => {
        const postType = String(item?.configuration_snapshot?.post?.type || '').toLowerCase()
        const status = String(item?.configuration_snapshot?.application_submission?.status || '').toLowerCase()
        const receiverId = Number(item?.receiver)
        return postType === 'demand' && receiverId === owner && status === 'submitted'
      })
      .map((item) => ({
        erp_id: item.id,
        post: {
          id: Number(item?.post),
          title: String(item?.configuration_snapshot?.post?.title || item?.configuration_snapshot?.post?.name || ''),
          type: String(item?.configuration_snapshot?.post?.type || ''),
        },
        applicant: {
          id: Number(item?.provider),
          name: '',
          profile_photo: '',
        },
        totals: {
          expertise: Number(item?.configuration_snapshot?.totals?.expertise || 0),
          services: Number(item?.configuration_snapshot?.totals?.services || 0),
          products: Number(item?.configuration_snapshot?.totals?.products || 0),
          grand: Number(item?.configuration_snapshot?.totals?.grand || item?.total_cost || 0),
        },
        submitted_at: item?.configuration_snapshot?.application_submission?.submitted_at || null,
        submitted_by: item?.configuration_snapshot?.application_submission?.submitted_by || null,
        configuration_snapshot: item?.configuration_snapshot || {},
      }))
  }

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
        
  const results = await Promise.allSettled([
          api.get('/posts/'),
          api.get('/ratings/'),
          api.get('/skills/'),
          api.get('/expertises/'),
          api.get('/products/'),
          api.get('/connections/overview/'),
          api.get('/users/'),
          api.get('/erp/'),
      api.get('/erp/pending_applications/'),
        ]);

        if (!active) return;
  const [postRes, ratingRes, skillRes, expertiseRes, productRes, overviewRes, userRes, erpRes, pendingRes] = results

  if (postRes.status === 'rejected') {
    throw postRes.reason
  }

  setPosts(Array.isArray(postRes.value?.data) ? postRes.value.data : []);
  setRatings(ratingRes.status === 'fulfilled' && Array.isArray(ratingRes.value?.data) ? ratingRes.value.data : []);
  setUsers(userRes.status === 'fulfilled' && Array.isArray(userRes.value?.data) ? userRes.value.data : []);
  setSkills(skillRes.status === 'fulfilled' && Array.isArray(skillRes.value?.data) ? skillRes.value.data : []);
  setExpertises(expertiseRes.status === 'fulfilled' && Array.isArray(expertiseRes.value?.data) ? expertiseRes.value.data : []);
  setProducts(productRes.status === 'fulfilled' && Array.isArray(productRes.value?.data) ? productRes.value.data : []);
  const erpList = erpRes.status === 'fulfilled' && Array.isArray(erpRes.value?.data) ? erpRes.value.data : []
  setErpItems(erpList);
  if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value?.data)) {
    setPendingApplications(pendingRes.value.data)
  } else {
    setPendingApplications(buildPendingApplicationsFromErp(erpList, profileData?.id))
  }
  setConnectionsOverview(overviewRes.status === 'fulfilled' ? (overviewRes.value?.data || null) : null)
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

  const pendingApplicationsByPost = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(pendingApplications) ? pendingApplications : []).forEach((entry) => {
      const postId = Number(entry?.post?.id)
      if (!Number.isFinite(postId) || postId <= 0) return
      if (!map.has(postId)) {
        map.set(postId, [])
      }
      map.get(postId).push(entry)
    })
    return map
  }, [pendingApplications])

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

  const averageRatingByUser = useMemo(() => {
    const totals = new Map()
    const counts = new Map()
    ;(Array.isArray(ratings) ? ratings : []).forEach((entry) => {
      const providerId = Number(entry?.provider)
      const value = Number(entry?.rating_value)
      if (!Number.isFinite(providerId) || providerId <= 0 || !Number.isFinite(value)) return
      totals.set(providerId, (totals.get(providerId) || 0) + value)
      counts.set(providerId, (counts.get(providerId) || 0) + 1)
    })

    const averages = new Map()
    totals.forEach((sum, userId) => {
      const count = counts.get(userId) || 1
      averages.set(userId, sum / count)
    })
    return averages
  }, [ratings])

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

    const uniqueNames = (items, key) =>
      Array.from(
        new Set(
          (Array.isArray(items) ? items : [])
            .map((item) => String(item?.[key] || '').trim())
            .filter(Boolean),
        ),
      )

    const roleGroups = [
      { keys: ['expertise'], label: 'Expertise' },
      { keys: ['skill_provider', 'service_provider'], label: 'Skill provider' },
      { keys: ['supplier', 'delivery_man', 'delivary_man', 'delivery'], label: 'Delivary Man' },
    ]

    const collectRolesForUser = (erp, userId) => {
      const roles = new Set()
      const snapshot = erp?.configuration_snapshot || {}
      const expertiseNames = uniqueNames(snapshot?.expertise, 'name')
      const serviceNames = uniqueNames(snapshot?.services, 'name')
      const productNames = uniqueNames(snapshot?.products, 'name')

      if (Number(erp?.provider) === Number(userId)) {
        roles.add('Providing')
      }
      if (Number(erp?.receiver) === Number(userId)) {
        roles.add('Receiving')
      }

      const snapshotMembers = erp?.configuration_snapshot?.members || {}
      roleGroups.forEach((group) => {
        const isAssigned = group.keys.some((key) => {
          const assigneeIds = Array.isArray(snapshotMembers?.[key]?.assignee_ids)
            ? snapshotMembers[key].assignee_ids
            : []
          return assigneeIds.some((value) => Number(value) === Number(userId))
        })

        if (!isAssigned) return

        if (group.label === 'Expertise') {
          roles.add(
            expertiseNames.length
              ? `Expertise: Work as: ${expertiseNames.join(', ')}`
              : 'Expertise',
          )
          return
        }

        if (group.label === 'Skill provider') {
          roles.add(
            serviceNames.length
              ? `Skill provider: Provide service: ${serviceNames.join(', ')}`
              : 'Skill provider',
          )
          return
        }

        if (group.label === 'Delivary Man') {
          roles.add(
            productNames.length
              ? `Delivary Man: Deliver product: ${productNames.join(', ')}`
              : 'Delivary Man',
          )
        }
      })

      const assignedWorkers = Array.isArray(erp?.assigned_workers) ? erp.assigned_workers : []
      if (assignedWorkers.some((value) => Number(value) === Number(userId))) {
        roles.add(
          productNames.length
            ? `Delivary Man: Deliver product: ${productNames.join(', ')}`
            : 'Delivary Man',
        )
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
          providerId: reviewerId,
          providerName: reviewer?.name || reviewer?.username || `User #${reviewerId}`,
          providerPhoto: reviewer?.profile_photo || '',
          responsibilities: Array.from(responsibilitySet),
          rating: Number(entry?.rating_value || 0),
          comment: String(entry?.review_text || '').trim(),
        }
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.id) - Number(left.id))
  }, [profile?.id, ratings, erpItems, posts, usersById])

  const profileRatingStats = useMemo(() => {
    const targetId = Number(profile?.id)
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return { count: 0, average: 0 }
    }

    const ownedProviderRatings = (Array.isArray(posts) ? posts : []).flatMap((post) => {
      const ownerId = Number(post?.owner_id ?? post?.owner)
      if (ownerId !== targetId) return []
      return (ratingsByPost[post.id] || []).filter((entry) => Number(entry?.provider) === ownerId)
    })

    const providerFeedbackRatings = providerGivenRatingsForProfile.map((item) => Number(item?.rating || 0))
    const mergedValues = [
      ...ownedProviderRatings.map((entry) => Number(entry?.rating_value || 0)),
      ...providerFeedbackRatings,
    ].filter((value) => Number.isFinite(value) && value > 0)

    const total = mergedValues.reduce((sum, value) => sum + value, 0)
    const count = mergedValues.length
    return {
      count,
      average: count ? total / count : 0,
    }
  }, [profile?.id, posts, ratingsByPost, providerGivenRatingsForProfile])

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

  const selectedDetailPost = useMemo(() => {
    if (!detailModalPostId) return null
    return userPosts.find((post) => Number(post.id) === Number(detailModalPostId)) || null
  }, [detailModalPostId, userPosts])

  const openPostDetailsModal = (post, sectionType) => {
    if (!post?.id) return
    setDetailModalPostId(post.id)
    setDetailModalSectionType(sectionType)
  }

  const closePostDetailsModal = () => {
    setDetailModalPostId(null)
    setDetailModalSectionType('')
  }

  useEffect(() => {
    if (!detailModalPostId) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closePostDetailsModal()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [detailModalPostId])

  const formatCurrency = (value) => {
    const parsed = Number(value || 0)
    if (!Number.isFinite(parsed)) return '৳0'
    return `৳${parsed.toFixed(0)}`
  }

  const refreshApplicationData = async (ownerId) => {
    const [erpRes, pendingRes, usersRes] = await Promise.all([
      api.get('/erp/'),
      api.get('/erp/pending_applications/').catch(() => ({ data: null })),
      api.get('/users/').catch(() => ({ data: null })),
    ])

    const erpList = Array.isArray(erpRes?.data) ? erpRes.data : []
    setErpItems(erpList)

    if (usersRes?.data && Array.isArray(usersRes.data)) {
      setUsers(usersRes.data)
    }

    if (Array.isArray(pendingRes?.data)) {
      setPendingApplications(pendingRes.data)
    } else {
      setPendingApplications(buildPendingApplicationsFromErp(erpList, ownerId))
    }
  }

  const updateApplicationDecision = async (erpId, postId, decision) => {
    const isApprove = decision === 'approved'
    const startMsg = isApprove ? 'Confirming application...' : 'Rejecting application...'
    setApplicationActionMessage(startMsg)

    try {
      if (isApprove) {
        try {
          await api.post(`/erp/${erpId}/approve_application/`)
        } catch (approveError) {
          if (approveError?.response?.status !== 404) throw approveError

          const erpDetail = await api.get(`/erp/${erpId}/`)
          const current = erpDetail?.data || {}
          const snapshot = { ...(current.configuration_snapshot || {}) }
          const submission = { ...(snapshot.application_submission || {}) }
          submission.status = 'approved'
          submission.approved_at = new Date().toISOString()
          snapshot.application_submission = submission
          await api.patch(`/erp/${erpId}/`, {
            configuration_snapshot: snapshot,
            is_configured: true,
          })
        }
      } else {
        try {
          await api.post(`/erp/${erpId}/reject_application/`)
        } catch (rejectError) {
          if (rejectError?.response?.status !== 404) throw rejectError

          const erpDetail = await api.get(`/erp/${erpId}/`)
          const current = erpDetail?.data || {}
          const snapshot = { ...(current.configuration_snapshot || {}) }
          const submission = { ...(snapshot.application_submission || {}) }
          submission.status = 'rejected'
          submission.rejected_at = new Date().toISOString()
          snapshot.application_submission = submission
          await api.patch(`/erp/${erpId}/`, {
            configuration_snapshot: snapshot,
            is_configured: false,
          })
        }
      }

      await refreshApplicationData(profile?.id)
      setDetailModalPostId(postId)
      setDetailModalSectionType('Demand')
      setApplicationActionMessage(
        isApprove
          ? 'Application confirmed. ERP task card is now active.'
          : 'Application rejected successfully.',
      )
    } catch (decisionError) {
      console.error(decisionError)
      setApplicationActionMessage(
        decisionError?.response?.data?.detail || 'Failed to update application status. Please try again.',
      )
    }
  }

  const handleApproveApplication = async (erpId, postId) => {
    await updateApplicationDecision(erpId, postId, 'approved')
  }

  const handleRejectApplication = async (erpId, postId) => {
    await updateApplicationDecision(erpId, postId, 'rejected')
  }

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
      setDetailModalPostId((prev) => (prev === postId ? null : prev))
      if (Number(detailModalPostId) === Number(postId)) {
        setDetailModalSectionType('')
      }
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

  const renderPostDetailsContent = (post, sectionType) => {
    if (!post) return null

    const isDemand = sectionType === 'Demand'
    const { hasExpertise, hasServices, hasProduct, expertiseRows, serviceRows, productRows, showServiceDescription, showProductDescription } =
      buildCategoryRows(post)
    const postOwnerId = Number(post.owner_id ?? post.owner)
    const postRatings = (ratingsByPost[post.id] || [])
      .filter((entry) => Number(entry?.provider) === postOwnerId)
      .slice()
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    const perPostRoleMap = roleLabelsByPostAndUser.get(Number(post.id)) || new Map()
    const postPendingApplications = pendingApplicationsByPost.get(Number(post.id)) || []

    return (
      <div className="space-y-3">
        {hasExpertise && (
          <div className="space-y-2 rounded-xl border border-violet-200/70 bg-white/80 p-3">
            <p className="text-sm font-semibold text-slate-700">Expertise</p>
            {expertiseRows.length ? (
              <ExpertiseTable expertises={expertiseRows} postType={post.post_type} />
            ) : (
              <p className="text-sm text-slate-400">No expertise detail listed.</p>
            )}
          </div>
        )}

        {hasServices && (
          <div className="space-y-2 rounded-xl border border-violet-200/70 bg-white/80 p-3">
            <p className="text-sm font-semibold text-slate-700">Services</p>
            {serviceRows.length ? (
              <ServiceTable services={serviceRows} postType={post.post_type} showDescription={showServiceDescription} />
            ) : (
              <p className="text-sm text-slate-400">No services detail listed.</p>
            )}
          </div>
        )}

        {hasProduct && (
          <div className="space-y-2 rounded-xl border border-violet-200/70 bg-white/80 p-3">
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

        {isDemand && canDeletePosts && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-900">Submitted Applications</p>
              <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-800">
                {postPendingApplications.length} pending
              </span>
            </div>

            {postPendingApplications.length === 0 ? (
              <p className="text-sm text-slate-600">No pending applications for this demand post.</p>
            ) : (
              <div className="space-y-3">
                {postPendingApplications.map((entry) => {
                  const snapshot = entry?.configuration_snapshot || {}
                  const applicant = entry?.applicant || {}
                  const totals = entry?.totals || {}
                  const expertiseRows = Array.isArray(snapshot?.expertise) ? snapshot.expertise : []
                  const serviceRows = Array.isArray(snapshot?.services) ? snapshot.services : []
                  const productRows = Array.isArray(snapshot?.products) ? snapshot.products : []
                  const requesterNote = String(snapshot?.requester_note || snapshot?.notes?.requester_note || '').trim()

                  return (
                    <div key={`pending-app-${entry.erp_id}`} className="rounded-lg border border-amber-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Applicant: {applicant?.name || `User #${applicant?.id || '-'}`}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveApplication(entry.erp_id, post.id)}
                            className="rounded-full border border-emerald-300 bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectApplication(entry.erp_id, post.id)}
                            className="rounded-full border border-rose-300 bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">Submitted at: {formatPostDate(entry?.submitted_at)}</p>

                      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[520px] border-collapse text-xs">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="border border-slate-200 px-2 py-1 text-left">Type</th>
                              <th className="border border-slate-200 px-2 py-1 text-left">Name</th>
                              <th className="border border-slate-200 px-2 py-1 text-left">Configuration</th>
                              <th className="border border-slate-200 px-2 py-1 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expertiseRows.map((row) => (
                              <tr key={`exp-${entry.erp_id}-${row.id}`} className="odd:bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-2 py-1">Expertise</td>
                                <td className="border border-slate-200 px-2 py-1">{row?.name || '-'}</td>
                                <td className="border border-slate-200 px-2 py-1">
                                  {Number(row?.offered_people || 0)} person x {Number(row?.offered_hours || 0)} hr at {formatCurrency(row?.offered_rate || 0)}
                                </td>
                                <td className="border border-slate-200 px-2 py-1 text-right">{formatCurrency(row?.line_total || 0)}</td>
                              </tr>
                            ))}
                            {serviceRows.map((row) => (
                              <tr key={`svc-${entry.erp_id}-${row.id}`} className="odd:bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-2 py-1">Service</td>
                                <td className="border border-slate-200 px-2 py-1">{row?.name || '-'}</td>
                                <td className="border border-slate-200 px-2 py-1">
                                  Charge: {formatCurrency(row?.offered_rate ?? row?.requested_rate ?? 0)}
                                </td>
                                <td className="border border-slate-200 px-2 py-1 text-right">{formatCurrency(row?.line_total || 0)}</td>
                              </tr>
                            ))}
                            {productRows.map((row) => (
                              <tr key={`prd-${entry.erp_id}-${row.id}`} className="odd:bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-2 py-1">Product</td>
                                <td className="border border-slate-200 px-2 py-1">{row?.name || '-'}</td>
                                <td className="border border-slate-200 px-2 py-1">
                                  {Number(row?.offered_quantity || 0)} {String(row?.unit || 'unit')} at {formatCurrency(row?.offered_rate || 0)}
                                </td>
                                <td className="border border-slate-200 px-2 py-1 text-right">{formatCurrency(row?.line_total || 0)}</td>
                              </tr>
                            ))}
                            {expertiseRows.length === 0 && serviceRows.length === 0 && productRows.length === 0 ? (
                              <tr>
                                <td className="border border-slate-200 px-2 py-2 text-center text-slate-500" colSpan={4}>
                                  No application configuration rows found.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">Expertise: {formatCurrency(totals?.expertise || 0)}</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">Service: {formatCurrency(totals?.services || 0)}</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">Product: {formatCurrency(totals?.products || 0)}</div>
                        <div className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">Overall: {formatCurrency(totals?.grand || 0)}</div>
                      </div>

                      {requesterNote ? (
                        <p className="mt-2 text-xs text-slate-700">
                          <span className="font-semibold">Requester note:</span> {requesterNote}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
                      {reviewer?.name || reviewer?.username || `User #${reviewerId}`}
                      {' -> '}
                      {target?.name || target?.username || `User #${targetId}`}
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
    )
  }

  const renderMiniPostCard = (post, sectionType) => {
    const postImageSrc = toMediaUrl(post.image)
    const isDemand = sectionType === 'Demand'
    const rating = Number(averageRatingByPost[post.id] || 0).toFixed(2)

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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/edit-post/${post.id}`)}
                      className="rounded-full border border-sky-300 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-sky-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="rounded-full border border-red-300 bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => openPostDetailsModal(post, sectionType)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="relative">
      <div className={`space-y-6 transition ${selectedDetailPost ? 'pointer-events-none select-none blur-[3px]' : ''}`}>
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
            <p className="mt-0.5 text-xs font-semibold text-violet-800/80">
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

      {applicationActionMessage && (
        <div className="card border border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">{applicationActionMessage}</p>
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

      {canDeletePosts && (
        <div className="card border border-amber-300/80 bg-gradient-to-br from-[#fffbf0] via-[#fff8e6] to-[#fffcf5] shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-amber-900">
              Requests
              {pendingApplications.length > 0 && (
                <span className="ml-3 inline-flex rounded-full border border-amber-400 bg-amber-100 px-3 py-0.5 text-sm font-bold text-amber-800">
                  {pendingApplications.length}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setShowRequestsPanel(!showRequestsPanel)}
              className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
            >
              {showRequestsPanel ? 'Hide' : 'View'}
            </button>
          </div>

          {showRequestsPanel && (
            <div className="space-y-3">
              {pendingApplications.length === 0 ? (
                <p className="text-sm text-slate-600">No pending requests at this time.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-amber-200 bg-amber-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-amber-900">Post Title</th>
                        <th className="px-3 py-2 font-semibold text-amber-900">Applicant</th>
                        <th className="px-3 py-2 font-semibold text-amber-900">Submitted</th>
                        <th className="px-3 py-2 font-semibold text-amber-900">Total Cost</th>
                        <th className="px-3 py-2 font-semibold text-amber-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {pendingApplications.map((request) => {
                        const postId = Number(request?.post?.id)
                        const applicantId = Number(request?.applicant?.id)
                        const applicantName = request?.applicant?.name || `User #${applicantId}`
                        const applicantUser = usersById.get(applicantId)
                        const applicantAvatarUrl = toMediaUrl(applicantUser?.profile_photo || request?.applicant?.profile_photo || '')
                        const submittedDate = request?.submitted_at
                          ? new Date(request.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: request?.submitted_at?.includes(new Date().getFullYear().toString()) ? undefined : '2-digit' })
                          : 'N/A'
                        const totalCost = formatCurrency(request?.totals?.grand || 0)

                        return (
                          <tr key={`request-${request.erp_id}`} className="hover:bg-amber-50/50">
                            <td className="px-3 py-2 font-medium text-slate-800">{request?.post?.title || 'N/A'}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/${applicantId}`)}
                                className="inline-flex items-center gap-2 rounded px-1 py-0.5 text-slate-700 transition hover:bg-amber-100"
                              >
                                {applicantAvatarUrl && (
                                  <img
                                    src={applicantAvatarUrl}
                                    alt={applicantName}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                )}
                                <span className="font-medium hover:underline">{applicantName}</span>
                              </button>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{submittedDate}</td>
                            <td className="px-3 py-2 font-semibold text-amber-900">{totalCost}</td>
                            <td className="px-3 py-2 space-x-1 flex">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetPost = userPosts.find((entry) => Number(entry.id) === postId)
                                  if (targetPost) {
                                    openPostDetailsModal(targetPost, targetPost.post_type === 'Demand' ? 'Demand' : 'Available')
                                  }
                                  setShowRequestsPanel(false)
                                }}
                                className="rounded border border-emerald-400 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card border border-violet-300/80 bg-gradient-to-br from-[#f4e9ff] via-[#ecd9ff] to-[#f7ecff] shadow-lg">
        <p className="text-lg font-semibold text-violet-900">
          Profile Rating : {profileRatingStats.average.toFixed(2)} / 5
          <span className="ml-2 text-base font-normal text-violet-700">({profileRatingStats.count} reviews)</span>
        </p>
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
                    <td className="border border-sky-300 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/${row.providerId}`)}
                        className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-left text-slate-800 transition hover:bg-sky-100"
                      >
                        <RatingRingAvatar
                          src={toMediaUrl(row.providerPhoto) || '/images/default-avatar.svg'}
                          alt={row.providerName}
                          rating={averageRatingByUser.get(Number(row.providerId)) ?? null}
                          size={28}
                          ringWidth={2}
                        />
                        <span className="font-semibold hover:underline">{row.providerName}</span>
                      </button>
                    </td>
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

      {selectedDetailPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-3"
          onClick={closePostDetailsModal}
        >
          <div
            className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-violet-300 bg-gradient-to-br from-[#f4e9ff] via-[#ecd9ff] to-[#f7ecff] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-violet-200/80 bg-white/60 px-4 py-3 sm:px-6">
              <div>
                <p className="text-sm font-semibold text-violet-700">{detailModalSectionType || selectedDetailPost.post_type} Post</p>
                <p className="text-lg font-bold text-violet-900">
                  {selectedDetailPost.post_title || selectedDetailPost.post_name || 'Untitled Post'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canDeletePosts && (
                  <button
                    type="button"
                    onClick={() => navigate(`/edit-post/${selectedDetailPost.id}`)}
                    className="rounded-full border border-sky-300 bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                  >
                    Edit Post
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePostDetailsModal}
                  className="rounded-full border border-violet-300 bg-white/80 px-4 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-3 sm:p-4">
              {renderPostDetailsContent(selectedDetailPost, detailModalSectionType || (selectedDetailPost.post_type === 'Demand' ? 'Demand' : 'Available'))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
