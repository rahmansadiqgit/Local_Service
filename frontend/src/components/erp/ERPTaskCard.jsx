import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'
import defaultAvatar from '../../assets/default-avatar.svg'
import ExpertiseTable from '../ExpertiseTable'
import ProductTable from '../ProductTable'
import RatingRingAvatar from '../RatingRingAvatar'
import ServiceTable from '../ServiceTable'

export default function ERPTaskCard({
  erp,
  post,
  rating,
  ratings = [],
  currentUserId,
  expandedId,
  trackOpenId,
  messageOpenId,
  phaseTasks,
  onSetPending,
  onToggleTrack,
  onToggleMessage,
  onGeneratePdf,
  onDelete,
  onToggleDetails,
  onTrackNext,
  onToggleReadyProduct,
  users = [],
  assignableUsersByRole = {},
  onUpdateMemberAssignment,
  onPublishMemberPost,
  onCloseMemberPost,
  onLeaveAssignment,
  onCompleteByReceiver,
  onRateParticipant,
  onRateProvider,
  onApproveBooking,
  onRejectBooking,
  onApproveApplication,
  onRejectApplication,
  onOpenOwner,
  toMediaUrl,
}) {
  const navigate = useNavigate()
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isMembersMenuOpen, setIsMembersMenuOpen] = useState(false)
  const [selectedMemberRole, setSelectedMemberRole] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [replyTargetId, setReplyTargetId] = useState(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [selfAssignMessageByRole, setSelfAssignMessageByRole] = useState({})
  const [isLeavingAssignment, setIsLeavingAssignment] = useState(false)
  const [isCompletionFormOpen, setIsCompletionFormOpen] = useState(false)
  const [completionRating, setCompletionRating] = useState('')
  const [completionComment, setCompletionComment] = useState('')
  const [completionError, setCompletionError] = useState('')
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState('')
  const [participantRating, setParticipantRating] = useState('')
  const [participantComment, setParticipantComment] = useState('')
  const [participantRatingError, setParticipantRatingError] = useState('')
  const [participantRatingSuccess, setParticipantRatingSuccess] = useState('')
  const [isSubmittingParticipantRating, setIsSubmittingParticipantRating] = useState(false)
  const [isParticipantRatingOpen, setIsParticipantRatingOpen] = useState(false)
  const [isProviderFeedbackOpen, setIsProviderFeedbackOpen] = useState(false)
  const [providerFeedbackRating, setProviderFeedbackRating] = useState('')
  const [providerFeedbackComment, setProviderFeedbackComment] = useState('')
  const [providerFeedbackError, setProviderFeedbackError] = useState('')
  const [providerFeedbackSuccess, setProviderFeedbackSuccess] = useState('')
  const [isSubmittingProviderFeedback, setIsSubmittingProviderFeedback] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeletingErp, setIsDeletingErp] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDecidingBooking, setIsDecidingBooking] = useState(false)

  const snapshot = erp.configuration_snapshot || {}
  const snapshotPost = snapshot.post || {}
  const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
  const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
  const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
  const snapshotTotals = snapshot.totals || {}
  const getDisplayQty = (row) => Number(row?.offered_people ?? row?.offered_quantity ?? row?.quantity ?? 0)
  const getDisplayDuration = (row) => Number(row?.offered_hours ?? row?.offered_unit_per_person ?? row?.duration ?? 0)
  const getDisplayUnitCost = (row) => Number(
    row?.offered_budget_per_person
      ?? row?.offered_rate
      ?? row?.offered_price
      ?? row?.unit_cost
      ?? row?.cost
      ?? 0,
  )
  const getDisplayLineTotal = (row) => Number(row?.line_total ?? row?.lineTotal ?? 0)
  const selectedExpertiseRows = snapshotExpertise.filter((row) => {
    if (!row || typeof row !== 'object') return false
    if (row.included === false) return false
    const qty = getDisplayQty(row)
    const lineTotal = getDisplayLineTotal(row)
    return qty > 0 || lineTotal > 0
  })
  const selectedServiceRows = snapshotServices.filter((row) => {
    if (!row || typeof row !== 'object') return false
    if (row.included === false) return false
    const qty = getDisplayQty(row)
    const lineTotal = getDisplayLineTotal(row)
    return qty > 0 || lineTotal > 0
  })
  const selectedProductRows = snapshotProducts.filter((row) => {
    if (!row || typeof row !== 'object') return false
    if (row.included === false) return false
    const qty = getDisplayQty(row)
    const lineTotal = getDisplayLineTotal(row)
    return qty > 0 || lineTotal > 0
  })
  const selectedExpertiseForTable = selectedExpertiseRows.map((row, index) => ({
    id: row?.id ?? `sel-exp-${erp.id}-${index}`,
    name: row?.name || row?.skill_name || '-',
    experience: row?.experience ?? '-',
    unit: row?.unit || '-',
    cost: Number(getDisplayUnitCost(row) || 0).toFixed(2),
    available_person: getDisplayQty(row),
    needed_budget_unit: Number(row?.needed_budget_unit || 0),
  }))
  const selectedServicesForTable = selectedServiceRows.map((row, index) => ({
    id: row?.id ?? `sel-svc-${erp.id}-${index}`,
    service_name: row?.name || row?.service_name || '-',
    description: String(row?.description || row?.details || '-'),
    cost_per_unit: Number(getDisplayUnitCost(row) || 0).toFixed(2),
    is_fully_booked: false,
  }))
  const selectedProductsForTable = selectedProductRows.map((row, index) => ({
    id: row?.id ?? `sel-prd-${erp.id}-${index}`,
    product_name: row?.name || row?.product_name || '-',
    description: String(row?.description || row?.details || '-'),
    unit: row?.unit || '-',
    cost_per_unit: Number(getDisplayUnitCost(row) || 0).toFixed(2),
    available_units: getDisplayQty(row),
  }))
  const supplierNote = String(snapshot?.notes?.supplier_note || snapshot?.supplier_note || '').trim()
  const bookingSubmission = snapshot.booking_submission || {}
  const bookingStatus = String(bookingSubmission?.status || '').trim().toLowerCase()
  const applicationSubmission = snapshot.application_submission || {}
  const applicationStatus = String(applicationSubmission?.status || '').trim().toLowerCase()
  const isDemandPost = String(post?.post_type || '').trim().toLowerCase() === 'demand'
  const isSupplyPost = String(post?.post_type || '').trim().toLowerCase() === 'supply'
  const isBookingAwaitingApproval = isSupplyPost && (bookingStatus === 'submitted' || bookingStatus === 'pending')
  const isBookingApproved = isSupplyPost && (bookingStatus === 'approved' || bookingStatus === 'accepted' || bookingStatus === 'confirmed')
  const isBookingRejected = isSupplyPost && bookingStatus === 'rejected'
  const isApplicationAwaitingApproval = isDemandPost && (applicationStatus === 'submitted' || applicationStatus === 'pending')
  const isApplicationApproved = isDemandPost && (applicationStatus === 'approved' || applicationStatus === 'accepted' || applicationStatus === 'confirmed')
  const isApplicationRejected = isDemandPost && applicationStatus === 'rejected'

  const phases = isSupplyPost ? ['Pending', 'On Going', 'Completed'] : ['Pending', 'Process', 'Completed']
  const displayStage =
    erp.stage === 'On Process'
      ? (isSupplyPost ? 'On Going' : 'Process')
      : erp.stage
  const activePhaseIndex = phases.indexOf(displayStage)

  const hasRequiredRows = (rows) =>
    Array.isArray(rows) &&
    rows.some((row) => {
      const qty = Number(row?.quantity ?? row?.qty ?? 0)
      const lineTotal = Number(row?.line_total ?? row?.lineTotal ?? 0)
      return qty > 0 || lineTotal > 0
    })

  const hasExpertiseRows = hasRequiredRows(snapshotExpertise)
  const hasServiceRows = hasRequiredRows(snapshotServices)
  const hasProductRows = hasRequiredRows(snapshotProducts)
  const hasExpertiseTotal = Number(snapshotTotals.expertise_total || snapshotTotals.expertise || 0) > 0
  const hasServiceTotal = Number(snapshotTotals.services_total || snapshotTotals.services || 0) > 0
  const hasProductTotal = Number(snapshotTotals.products_total || snapshotTotals.products || 0) > 0
  const hasExpertiseCategory = hasExpertiseRows || hasExpertiseTotal
  const hasServicesCategory = hasServiceRows || hasServiceTotal
  const hasProductCategory = hasProductRows || hasProductTotal

  const memberMenuOptions = [
    hasExpertiseCategory ? 'Expertise' : null,
    hasServicesCategory ? 'Skill provider' : null,
    hasProductCategory ? 'Delivery Man' : null,
  ].filter(Boolean)

  const roleLabelToKey = {
    Expertise: 'expertise',
    'Skill provider': 'skill_provider',
    'Delivery Man': 'supplier',
  }

  const roleKeyToLabel = {
    expertise: 'Expertise',
    skill_provider: 'Skill provider',
    supplier: 'Delivery Man',
  }
  const associatedMemberRoles = ['expertise', 'skill_provider', 'supplier']
  const roleKeyAliases = {
    expertise: ['expertise'],
    skill_provider: ['skill_provider', 'service_provider'],
    supplier: ['supplier', 'delivery_man', 'delivary_man', 'delivery'],
  }

  const getRoleBuckets = (roleKey) => {
    const aliases = roleKeyAliases[roleKey] || [roleKey]
    return aliases
      .map((alias) => membersState?.[alias] || null)
      .filter(Boolean)
  }

  const getRoleAssigneeIds = (roleKey) => {
    const idSet = new Set()
    getRoleBuckets(roleKey).forEach((bucket) => {
      const rawIds = Array.isArray(bucket?.assignee_ids) ? bucket.assignee_ids : []
      rawIds.forEach((rawId) => {
        const parsed = Number(rawId)
        if (Number.isFinite(parsed) && parsed > 0) {
          idSet.add(parsed)
        }
      })
    })
    return Array.from(idSet)
  }

  const getRoleState = (roleKey) => {
    const buckets = getRoleBuckets(roleKey)
    const mergedState = buckets[0] || {}
    return {
      ...mergedState,
      assignee_ids: getRoleAssigneeIds(roleKey),
      self_assign_enabled: buckets.some((bucket) => Boolean(bucket?.self_assign_enabled)),
      self_assign_message: String(
        buckets
          .map((bucket) => String(bucket?.self_assign_message || '').trim())
          .find(Boolean) || '',
      ),
    }
  }

  const membersState = snapshot.members || {}
  const associatedMembersByRole = associatedMemberRoles.map((roleKey) => {
    const assigneeIds = getRoleAssigneeIds(roleKey)
    const members = users.filter((user) => assigneeIds.includes(Number(user.id)))

    return {
      roleKey,
      roleLabel: roleKeyToLabel[roleKey] || roleKey,
      members,
    }
  })
  const associatedMembersWithAssignments = associatedMembersByRole.filter((entry) => entry.members.length > 0)
  const hasAssociatedMembers = associatedMembersByRole.some((entry) => entry.members.length > 0)
  const selectedRoleState = selectedMemberRole ? getRoleState(selectedMemberRole) : {}
  const selectedAssigneeIds = Array.isArray(selectedRoleState.assignee_ids)
    ? selectedRoleState.assignee_ids.map((id) => Number(id))
    : []
  const selfAssignEnabled = Boolean(selectedRoleState.self_assign_enabled)
  const selectedSelfAssignMessage =
    selectedMemberRole && Object.prototype.hasOwnProperty.call(selfAssignMessageByRole, selectedMemberRole)
      ? selfAssignMessageByRole[selectedMemberRole]
      : String(selectedRoleState.self_assign_message || '')

  const viewerRole =
    currentUserId && String(erp.provider) === String(currentUserId)
      ? 'Provider'
      : currentUserId && String(erp.receiver) === String(currentUserId)
        ? 'Receiver'
        : 'Viewer'
  const isProvider = viewerRole === 'Provider'
  const postOwnerId = Number(post?.owner_id || post?.owner || 0)
  const isPostOwner = Number.isFinite(postOwnerId) && postOwnerId > 0 && Number(postOwnerId) === Number(currentUserId)
  const assignedMembersForSelectedRole = users.filter((user) =>
    selectedAssigneeIds.includes(Number(user.id)),
  )
  const providerAssignableMembers = isProvider
    ? Array.isArray(assignableUsersByRole?.[selectedMemberRole])
      ? assignableUsersByRole[selectedMemberRole]
      : Array.isArray(assignableUsersByRole?.all)
        ? assignableUsersByRole.all
        : []
    : []
  const currentUserRecord = users.find((user) => Number(user.id) === Number(currentUserId)) || null
  const providerMembersWithSelfFirst = isProvider
    ? [
        currentUserRecord || {
          id: Number(currentUserId),
          name: 'Assign myself',
          username: 'Assign myself',
        },
        ...providerAssignableMembers.filter((user) => Number(user.id) !== Number(currentUserId)),
      ]
    : []
  const visibleMembers = isProvider ? providerMembersWithSelfFirst : assignedMembersForSelectedRole

  const getResponsibilityItemsByRole = (roleKey) => {
    if (roleKey === 'expertise') {
      return snapshotExpertise
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean)
    }

    if (roleKey === 'skill_provider') {
      return snapshotServices
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean)
    }

    if (roleKey === 'supplier') {
      return snapshotProducts
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean)
    }

    return []
  }

  const getResponsibilityTextByRole = (roleKey) => {
    if (!roleKey) return ''
    const items = Array.from(new Set(getResponsibilityItemsByRole(roleKey)))
    if (!items.length) return 'Specific task details are not listed yet.'

    const joined = items.join(', ')
    if (roleKey === 'expertise') return `Work as: ${joined}`
    if (roleKey === 'skill_provider') return `Provide service: ${joined}`
    if (roleKey === 'supplier') return `Deliver product: ${joined}`
    return joined
  }

  const selectedRoleResponsibilityText = getResponsibilityTextByRole(selectedMemberRole)
  const expertiseAssignmentsByRow =
    selectedMemberRole === 'expertise' && selectedRoleState && typeof selectedRoleState.expertise_assignments === 'object'
      ? selectedRoleState.expertise_assignments
      : {}
  const expertiseRowsForAssignment =
    selectedMemberRole === 'expertise'
      ? snapshotExpertise
          .map((row, index) => {
            const rowId = Number(row?.id)
            const required = Math.max(0, Number((row?.offered_people ?? row?.quantity) || 0))
            if (!Number.isFinite(rowId) || rowId <= 0 || required <= 0) return null
            const assignedRaw = Array.isArray(expertiseAssignmentsByRow[String(rowId)])
              ? expertiseAssignmentsByRow[String(rowId)]
              : []
            const assignedIds = Array.from(
              new Set(
                assignedRaw
                  .map((id) => Number(id))
                  .filter((id) => Number.isFinite(id) && id > 0),
              ),
            )
            return {
              rowId,
              name: String(row?.name || `Expertise ${index + 1}`),
              required,
              assignedIds,
            }
          })
          .filter(Boolean)
      : []
  const currentUserNumericId = Number(currentUserId)
  const hasCurrentUserId = Number.isFinite(currentUserNumericId) && currentUserNumericId > 0
  const assignedWorkerIds = Array.isArray(erp?.assigned_workers)
    ? erp.assigned_workers.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []
  const currentUserRoleResponsibilities = hasCurrentUserId
    ? (() => {
        const roleSet = new Set(
          associatedMemberRoles.filter((roleKey) => getRoleAssigneeIds(roleKey).includes(currentUserNumericId)),
        )

        // Backward compatibility: some legacy ERP records track delivery assignment only in assigned_workers.
        if (
          roleSet.size === 0
          && hasProductCategory
          && assignedWorkerIds.includes(currentUserNumericId)
        ) {
          roleSet.add('supplier')
        }

        return Array.from(roleSet).map((roleKey) => ({
          roleKey,
          roleLabel: roleKeyToLabel[roleKey] || roleKey,
          responsibilityText: getResponsibilityTextByRole(roleKey),
        }))
      })()
    : []
  const canLeaveTask = currentUserRoleResponsibilities.length > 0 && erp.stage !== 'Completed'
  const isReceiver = viewerRole === 'Receiver'
  const canUseMessenger = isProvider || isReceiver || currentUserRoleResponsibilities.length > 0
  const canCompleteAsReceiver = isReceiver && erp.stage === 'On Process'

  const averageRatingByUser = (() => {
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
  })()

  const getUserRating = useCallback(
    (userId) => averageRatingByUser.get(Number(userId)) ?? null,
    [averageRatingByUser],
  )

  const counterpartyUserId =
    viewerRole === 'Provider'
      ? Number(erp.receiver)
      : viewerRole === 'Receiver'
        ? Number(erp.provider)
        : Number(post?.owner_id)

  const counterpartyUser = users.find((user) => Number(user.id) === Number(counterpartyUserId))
  const counterpartyName =
    counterpartyUser?.name ||
    counterpartyUser?.username ||
    post?.owner_name ||
    (counterpartyUserId ? `User #${counterpartyUserId}` : 'Post owner')
  const counterpartyPhoto =
    toMediaUrl(counterpartyUser?.profile_photo) || toMediaUrl(post?.owner_profile_photo) || defaultAvatar
  const counterpartyLabel =
    viewerRole === 'Provider' ? 'Receiver' : viewerRole === 'Receiver' ? 'Provider' : 'Owner'

  const roleLabel =
    viewerRole === 'Provider' ? 'Providing' : viewerRole === 'Receiver' ? 'Receiving' : erp.category

  const requiredCategoryLabels = [
    hasExpertiseCategory ? 'Expertise' : null,
    hasServicesCategory ? 'Services' : null,
    hasProductCategory ? 'Product' : null,
  ].filter(Boolean)

  const taskCategoryLabel =
    requiredCategoryLabels.length > 0 ? requiredCategoryLabels.join(' . ') : post?.post_name || `Task #${erp.id}`

  const providerUser = users.find((entry) => Number(entry.id) === Number(erp.provider))
  const providerDisplayName =
    providerUser?.name
    || providerUser?.username
    || post?.owner_name
    || (erp.provider ? `User #${erp.provider}` : 'Provider')

  const providerRatedUserIds = new Set(
    (Array.isArray(snapshot?.feedback?.provider_rating_user_ids)
      ? snapshot.feedback.provider_rating_user_ids
      : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )
  const hasRatedProviderFromSnapshot = providerRatedUserIds.has(Number(currentUserId))

  const hasRatedProviderFromRatings = (Array.isArray(ratings) ? ratings : []).some(
    (entry) =>
      Number(entry?.post) === Number(erp.post)
      && Number(entry?.customer) === Number(currentUserId)
      && Number(entry?.provider) === Number(erp.provider),
  )

  const hasRatedProvider = hasRatedProviderFromSnapshot || hasRatedProviderFromRatings
  const shouldShowProviderCommentButton = erp.stage === 'Completed' && !isProvider && !hasRatedProvider

  const alreadyRatedParticipantIds = new Set(
    (Array.isArray(ratings) ? ratings : [])
      .filter(
        (item) =>
          Number(item?.post) === Number(erp.post)
          && Number(item?.customer) === Number(currentUserId)
          && Number(item?.provider) > 0,
      )
      .map((item) => Number(item.provider)),
  )

  const providerFeedbackForCurrentUser = (Array.isArray(ratings) ? ratings : [])
    .filter(
      (item) =>
        Number(item?.post) === Number(erp.post)
        && Number(item?.customer) === Number(erp.provider)
        && Number(item?.provider) === Number(currentUserId),
    )
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] || null

  const providerRateCandidates = Array.from(
    new Map(
      [
        ...(erp.receiver ? users.filter((user) => Number(user.id) === Number(erp.receiver)) : []),
        ...associatedMembersByRole.flatMap((entry) => entry.members),
      ]
        .filter(
          (user) =>
            Number(user.id)
            && Number(user.id) !== Number(currentUserId)
            && !alreadyRatedParticipantIds.has(Number(user.id)),
        )
        .map((user) => [Number(user.id), user]),
    ).values(),
  )
  const shouldShowProviderParticipantRatingButton =
    isProvider && erp.stage === 'Completed' && providerRateCandidates.length > 0

  const providerRateUniverseIds = new Set(
    [
      ...(erp.receiver ? [Number(erp.receiver)] : []),
      ...associatedMembersByRole.flatMap((entry) => entry.members.map((member) => Number(member.id))),
    ].filter((id) => Number.isFinite(id) && id > 0 && id !== Number(currentUserId)),
  )

  const roleLabelsByUserId = new Map()
  if (erp.receiver && Number.isFinite(Number(erp.receiver))) {
    roleLabelsByUserId.set(Number(erp.receiver), new Set(['Receiver']))
  }
  associatedMembersByRole.forEach((entry) => {
    entry.members.forEach((member) => {
      const memberId = Number(member.id)
      if (!Number.isFinite(memberId) || memberId <= 0) return
      if (!roleLabelsByUserId.has(memberId)) {
        roleLabelsByUserId.set(memberId, new Set())
      }
      roleLabelsByUserId.get(memberId).add(entry.roleLabel)
    })
  })

  const providerFeedbackByParticipant = new Map()
  ;(Array.isArray(ratings) ? ratings : []).forEach((item) => {
    const postId = Number(item?.post)
    const customerId = Number(item?.customer)
    const participantId = Number(item?.provider)
    if (postId !== Number(erp.post)) return
    if (customerId !== Number(currentUserId)) return
    if (!providerRateUniverseIds.has(participantId)) return

    const previous = providerFeedbackByParticipant.get(participantId)
    if (!previous || Number(item?.id || 0) > Number(previous?.id || 0)) {
      providerFeedbackByParticipant.set(participantId, item)
    }
  })

  const providerSubmittedFeedbackEntries = Array.from(providerFeedbackByParticipant.entries())
    .map(([participantId, item]) => {
      const participant = users.find((user) => Number(user.id) === Number(participantId))
      const roles = Array.from(roleLabelsByUserId.get(Number(participantId)) || [])
      return {
        participantId: Number(participantId),
        participantName:
          participant?.name || participant?.username || `User #${participantId}`,
        roles,
        ratingValue: Number(item?.rating_value || 0),
        message: String(item?.review_text || '').trim(),
      }
    })
    .sort((left, right) => left.participantName.localeCompare(right.participantName))

  useEffect(() => {
    if (!selectedParticipantId) return
    const stillAvailable = providerRateCandidates.some(
      (user) => Number(user.id) === Number(selectedParticipantId),
    )
    if (!stillAvailable) {
      setSelectedParticipantId('')
    }
  }, [selectedParticipantId, providerRateCandidates])

  useEffect(() => {
    if (providerRateCandidates.length === 0 && isParticipantRatingOpen) {
      setIsParticipantRatingOpen(false)
    }
  }, [providerRateCandidates, isParticipantRatingOpen])

  const stageStyle =
    erp.stage === 'Completed'
      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      : erp.stage === 'On Process'
        ? 'border border-sky-200 bg-sky-50 text-sky-700'
        : 'border border-amber-200 bg-amber-50 text-amber-700'
  const isProviderTheme = isProvider
  const isReceiverTheme = isReceiver
  const isDetailsOpen = expandedId === erp.id
  const cardShellClass = isProviderTheme
    ? 'border-transparent bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 shadow-violet-200/45'
    : isReceiverTheme
      ? 'border-transparent bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 shadow-sky-200/45'
      : 'border-transparent bg-gradient-to-br from-white via-slate-50 to-brand-50/30'
  const headerGradientClass = isProviderTheme
    ? 'from-violet-700 via-purple-700 to-fuchsia-600'
    : isReceiverTheme
      ? 'from-cyan-700 via-sky-700 to-blue-600'
      : 'from-slate-700 via-slate-600 to-slate-500'
  const roleBadgeClass = isProviderTheme
    ? 'border-violet-200/50 bg-violet-400/25 text-violet-50'
    : isReceiverTheme
      ? 'border-cyan-200/50 bg-cyan-400/25 text-cyan-50'
      : 'border-slate-200/50 bg-slate-400/25 text-slate-50'
  const categoryTextClass = isProviderTheme ? 'text-violet-100/95' : isReceiverTheme ? 'text-cyan-100/95' : 'text-slate-100/95'
  const profileCardClass = isProviderTheme
    ? 'border-violet-200/60 bg-white/90 hover:border-violet-300 hover:bg-violet-50/70'
    : isReceiverTheme
      ? 'border-sky-200/70 bg-white/90 hover:border-sky-300 hover:bg-sky-50/70'
      : 'border-slate-200 bg-white'
  const phaseLineClass = erp.stage === 'Completed' ? 'bg-emerald-400' : isProviderTheme ? 'bg-violet-200/70' : 'bg-sky-200/70'
  const activePhaseDotClass = isProviderTheme
    ? 'border-violet-100 bg-violet-500 shadow-sm'
    : 'border-cyan-100 bg-sky-500 shadow-sm'
  const activePhaseTextClass = isProviderTheme ? 'bg-violet-500 text-white' : 'bg-sky-500 text-white'

  const pendingChecklist = phaseTasks.Pending || []
  const openPendingTasks = pendingChecklist.filter((task) => !task.done)
  const donePendingTasks = pendingChecklist.filter((task) => task.done)
  const completedStageTasks = (phaseTasks.Completed || []).filter((task) => task.done)
  const completedTasks = [...donePendingTasks, ...completedStageTasks]

  const pendingMemberRoleByTaskKey = {
    member_expertise: 'expertise',
    member_skill_provider: 'skill_provider',
    member_supplier: 'supplier',
  }
  const pendingMemberRoles = new Set(
    openPendingTasks
      .map((task) => pendingMemberRoleByTaskKey[String(task.key || '').trim()])
      .filter(Boolean),
  )
  const shouldPulseMembersButton = pendingMemberRoles.size > 0 && !isDetailsOpen
  const shouldPulseActionsButton = (openPendingTasks.length > 0 || shouldPulseMembersButton) && !isDetailsOpen
  const canUseActionsMenu = isSupplyPost ? isBookingApproved : (isDemandPost ? isApplicationApproved : true)
  const menuItemBaseClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'

  useEffect(() => {
    if (!isDetailsOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isDetailsOpen])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('[data-erp-actions-root]')) {
        setIsActionsMenuOpen(false)
        setIsMembersMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const renderTaskRow = (task, listType) => {
    const isOpenPending = listType === 'pending' && !task.done
    const isReadyProductTask = task.toggleable && task.key === 'ready_product'
    const shouldBounceRow = isOpenPending && !(task.toggleable && task.key === 'ready_product') && !isDetailsOpen
    return (
      <li
        key={`${erp.id}-${listType}-${task.key || task.label}`}
        className={`flex items-center gap-1 rounded-md px-2 py-1 ${
          isOpenPending
            ? `${shouldBounceRow ? 'animate-bounce ' : ''}border border-rose-200 bg-rose-100/80 text-rose-800`
            : ''
        }`}
      >
      {isReadyProductTask ? (
        <button
          type="button"
          onClick={() => onToggleReadyProduct?.(erp.id)}
          disabled={!isProvider}
          aria-label={task.done ? 'Mark ready product as not filled' : 'Mark ready product as filled'}
          title={!isProvider ? 'Only provider can manage Pending actions' : ''}
          className={`h-4 w-4 rounded-full border transition ${
            task.done
              ? 'border-emerald-600 bg-emerald-500'
              : 'border-slate-400 bg-white hover:border-slate-500'
          }`}
        />
      ) : (
        <span className={task.done ? 'text-emerald-600' : 'text-rose-600'}>{task.done ? '✓' : '•'}</span>
      )}
      <span>{task.label}</span>
      {isReadyProductTask && isOpenPending ? (
        <span className="ml-1 rounded-full border border-rose-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
          Click circle
        </span>
      ) : null}
      </li>
    )
  }

  const loadMessages = useCallback(async () => {
    if (erp.stage !== 'On Process') return
    setIsLoadingMessages(true)
    setMessageError('')
    try {
      const { data } = await api.get(`/erp/${erp.id}/messages/`)
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessageError(detail || 'Failed to load messages. Please refresh and try again.')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [erp.id, erp.stage])

  useEffect(() => {
    if (messageOpenId === erp.id && erp.stage === 'On Process') {
      loadMessages()
    }
  }, [messageOpenId, erp.id, erp.stage, loadMessages])

  const handleSendMessage = async () => {
    const messageText = chatInput.trim()
    if (!messageText || erp.stage !== 'On Process') return

    setIsSendingMessage(true)
    setMessageError('')
    try {
      const payload = {
        message: messageText,
      }
      if (replyTargetId) {
        payload.parent = replyTargetId
      }

      const { data } = await api.post(`/erp/${erp.id}/messages/`, payload)
      setMessages((prev) => [...prev, data])
      setChatInput('')
      setReplyTargetId(null)
    } catch (error) {
      console.error(error)
      const detail = String(error?.response?.data?.detail || '').trim()
      setMessageError(detail || 'Could not send the message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleReceiverComplete = async () => {
    const ratingValue = Number(completionRating)
    const commentValue = completionComment.trim()

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setCompletionError('Please select a rating from 1 to 5.')
      return
    }

    if (!commentValue) {
      setCompletionError('Please write your completion comment.')
      return
    }

    if (!onCompleteByReceiver) {
      setCompletionError('Completion service is unavailable right now.')
      return
    }

    setIsSubmittingCompletion(true)
    setCompletionError('')

    try {
      const result = await onCompleteByReceiver(erp, {
        rating: ratingValue,
        comment: commentValue,
      })

      if (!result?.ok) {
        setCompletionError(result?.detail || 'Failed to complete ERP.')
        return
      }

      setCompletionRating('')
      setCompletionComment('')
      setIsCompletionFormOpen(false)
    } finally {
      setIsSubmittingCompletion(false)
    }
  }

  const handleProviderParticipantRating = async () => {
    const participantId = Number(selectedParticipantId)
    const ratingValue = Number(participantRating)
    const commentValue = participantComment.trim()

    if (!participantId) {
      setParticipantRatingError('Please choose a participant first.')
      return
    }

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setParticipantRatingError('Please select a rating from 1 to 5.')
      return
    }

    if (!commentValue) {
      setParticipantRatingError('Please write a short feedback comment.')
      return
    }

    if (!onRateParticipant) {
      setParticipantRatingError('Participant rating service is unavailable right now.')
      return
    }

    setIsSubmittingParticipantRating(true)
    setParticipantRatingError('')
    setParticipantRatingSuccess('')

    try {
      const result = await onRateParticipant(erp, {
        participant_id: participantId,
        rating: ratingValue,
        comment: commentValue,
      })

      if (!result?.ok) {
        setParticipantRatingError(result?.detail || 'Failed to submit participant rating.')
        return
      }

      setParticipantRatingSuccess(result?.detail || 'Participant rating submitted.')
      setParticipantRating('')
      setParticipantComment('')
      setSelectedParticipantId('')
    } finally {
      setIsSubmittingParticipantRating(false)
    }
  }

  const handleSubmitProviderFeedback = async () => {
    const ratingValue = Number(providerFeedbackRating)
    const commentValue = providerFeedbackComment.trim()

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setProviderFeedbackError('Please select a rating from 1 to 5.')
      return
    }

    if (!commentValue) {
      setProviderFeedbackError('Please write your comment about the provider.')
      return
    }

    if (!onRateProvider) {
      setProviderFeedbackError('Feedback service is unavailable right now.')
      return
    }

    setIsSubmittingProviderFeedback(true)
    setProviderFeedbackError('')
    setProviderFeedbackSuccess('')

    try {
      const result = await onRateProvider(erp, {
        rating: ratingValue,
        comment: commentValue,
      })

      if (!result?.ok) {
        setProviderFeedbackError(result?.detail || 'Failed to submit feedback.')
        return
      }

      setProviderFeedbackSuccess(result?.detail || 'Your feedback has been submitted.')
      setProviderFeedbackRating('')
      setProviderFeedbackComment('')
      setIsProviderFeedbackOpen(false)
    } finally {
      setIsSubmittingProviderFeedback(false)
    }
  }

  return (
    <div
      className={`card relative overflow-hidden rounded-3xl border p-4 shadow-sm ${cardShellClass} ${
        isDetailsOpen ? 'shadow-xl' : 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl'
      }`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-10 h-28 w-28 rounded-full bg-white/30 blur-2xl" />

      <div className={`relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br px-5 py-3 md:px-6 md:py-4 shadow-lg ${headerGradientClass}`}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <p className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${roleBadgeClass}`}>
            {roleLabel}
          </p>
          <div />
          <span className={`rounded-full px-4 py-1.5 text-base font-bold ${stageStyle}`}>{displayStage}</span>
        </div>

        <h2 className="relative mx-auto mt-3 w-full max-w-3xl text-center text-[2rem] font-bold leading-tight text-white drop-shadow-sm">
          {post?.post_title || snapshotPost?.title || '-'}
        </h2>

        <p
          className={`mt-1 text-center text-sm font-medium tracking-wide ${categoryTextClass}`}
          title={taskCategoryLabel}
        >
          {taskCategoryLabel}
        </p>

        {isSupplyPost ? (
          <div className="mt-2 flex justify-center">
            {isBookingAwaitingApproval ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Booking request pending owner approval
              </span>
            ) : isBookingApproved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Booking confirmed
              </span>
            ) : isBookingRejected ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                Booking request declined
              </span>
            ) : null}
          </div>
        ) : isDemandPost ? (
          <div className="mt-2 flex justify-center">
            {isApplicationAwaitingApproval ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Application request pending owner approval
              </span>
            ) : isApplicationApproved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Application confirmed
              </span>
            ) : isApplicationRejected ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                Application declined
              </span>
            ) : null}
          </div>
        ) : null}

        {currentUserRoleResponsibilities.length ? (
          <div className="relative mx-auto mt-3 w-full max-w-3xl rounded-2xl border border-white/35 bg-white/15 px-3 py-2 text-sm text-white shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">Your Responsibility</p>
            <div className="mt-1 space-y-1">
              {currentUserRoleResponsibilities.map((entry) => (
                <p key={`my-responsibility-${erp.id}-${entry.roleKey}`} className="leading-relaxed">
                  <span className="font-semibold text-white">{entry.roleLabel}:</span> {entry.responsibilityText}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-2">
        {counterpartyUserId && (
          <button
            type="button"
            onClick={() => onOpenOwner(counterpartyUserId)}
            className={`inline-flex w-full items-center gap-3 rounded-xl px-1 py-2 text-sm font-semibold text-slate-700 transition ${isProviderTheme ? 'hover:bg-violet-100/40' : isReceiverTheme ? 'hover:bg-sky-100/40' : 'hover:bg-slate-100/50'}`}
          >
            <RatingRingAvatar
              src={counterpartyPhoto}
              alt={counterpartyName}
              rating={getUserRating(counterpartyUserId)}
              size={48}
              ringWidth={3}
            />
            <div className="min-w-0 text-left">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{counterpartyLabel}</p>
              <span className="block truncate text-xl font-semibold text-slate-800">{counterpartyName}</span>
              <p className="truncate text-[12px] font-normal text-slate-500">{post?.location || 'Unknown location'}</p>
            </div>
          </button>
        )}
      </div>

      <div className="relative mt-1 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-100 to-yellow-100 px-3 py-2 text-amber-900 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Rating</span>
          <p className="mt-0.5 text-2xl font-bold leading-none">
            {rating.toFixed(1)}
            <span className="ml-1 text-xl font-semibold">/5</span>
          </p>
        </div>
        <div className="rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-100 to-green-100 px-3 py-2 text-emerald-900 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Total</span>
          <p className="mt-0.5 text-2xl font-bold leading-none">${Number(erp.total_cost || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="px-2 py-2 text-xs text-slate-700">
        <div className="relative">
          <div className={`pointer-events-none absolute left-8 right-8 top-3 h-0.5 ${phaseLineClass}`} />
          <div className="relative grid grid-cols-3 gap-2">
            {phases.map((phase, index) => {
              const isDone = index < activePhaseIndex
              const isActive = phase === displayStage

              return (
                <div key={`phase-flow-${erp.id}-${phase}`} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      isActive
                        ? activePhaseDotClass
                        : isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300 bg-white'
                    }`}
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? activePhaseTextClass
                        : isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-slate-600'
                    }`}
                  >
                    {phase}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 items-center" data-erp-actions-root>
        <div className="justify-self-start">
          {isApplicationAwaitingApproval && isPostOwner ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDecidingBooking}
                onClick={async () => {
                  if (!onApproveApplication) return
                  setIsDecidingBooking(true)
                  try {
                    await onApproveApplication(erp)
                  } finally {
                    setIsDecidingBooking(false)
                  }
                }}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDecidingBooking ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                disabled={isDecidingBooking}
                onClick={async () => {
                  if (!onRejectApplication) return
                  setIsDecidingBooking(true)
                  try {
                    await onRejectApplication(erp)
                  } finally {
                    setIsDecidingBooking(false)
                  }
                }}
                className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          ) : isBookingAwaitingApproval && isPostOwner && isProvider ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDecidingBooking}
                onClick={async () => {
                  if (!onApproveBooking) return
                  setIsDecidingBooking(true)
                  try {
                    await onApproveBooking(erp)
                  } finally {
                    setIsDecidingBooking(false)
                  }
                }}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDecidingBooking ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                disabled={isDecidingBooking}
                onClick={async () => {
                  if (!onRejectBooking) return
                  setIsDecidingBooking(true)
                  try {
                    await onRejectBooking(erp)
                  } finally {
                    setIsDecidingBooking(false)
                  }
                }}
                className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          ) : isBookingAwaitingApproval && !isPostOwner ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Waiting for owner response
            </span>
          ) : canCompleteAsReceiver ? (
            <button
              type="button"
              onClick={() => {
                setCompletionError('')
                setIsCompletionFormOpen((prev) => !prev)
              }}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
            >
             Completed
            </button>
          ) : shouldShowProviderParticipantRatingButton ? (
            <button
              type="button"
              onClick={() => {
                setParticipantRatingError('')
                setParticipantRatingSuccess('')
                setIsParticipantRatingOpen((prev) => !prev)
              }}
              className="animate-bounce rounded-full border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-200"
            >
              Rating
            </button>
          ) : shouldShowProviderCommentButton ? (
            <button
              type="button"
              onClick={() => {
                setProviderFeedbackError('')
                setProviderFeedbackSuccess('')
                setIsProviderFeedbackOpen((prev) => !prev)
              }}
              className="animate-bounce rounded-full border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-200"
            >
              Rating
            </button>
          ) : canLeaveTask ? (
            <button
              type="button"
              disabled={isLeavingAssignment}
              onClick={async () => {
                if (!onLeaveAssignment) return
                setIsLeavingAssignment(true)
                try {
                  await onLeaveAssignment(erp)
                } finally {
                  setIsLeavingAssignment(false)
                }
              }}
              className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLeavingAssignment ? 'Leaving...' : 'Leave'}
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className="justify-self-center">
          {erp.stage === 'On Process' && canUseMessenger ? (
            <button
              type="button"
              onClick={() => onToggleMessage?.(erp.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                messageOpenId === erp.id
                  ? 'border-brand-400 bg-brand-100 text-brand-800'
                  : 'border-brand-300 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50'
              }`}
            >
              Messenger
            </button>
          ) : null}
        </div>

        <div className="justify-self-end">
          {canUseActionsMenu ? (
            <button
              type="button"
              onClick={() => {
                setIsActionsMenuOpen((prev) => !prev)
                if (isActionsMenuOpen) {
                  setIsMembersMenuOpen(false)
                }
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                shouldPulseActionsButton
                  ? 'animate-bounce border-rose-300 bg-rose-100 text-rose-700 hover:border-rose-400 hover:bg-rose-200'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              Menu
            </button>
          ) : (
            <span />
          )}
        </div>

        {isActionsMenuOpen && canUseActionsMenu ? (
          <div className="absolute bottom-full right-0 z-30 mb-2 w-56 space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {isProvider ? (
              <button
                type="button"
                onClick={() => {
                  onToggleTrack(erp.id)
                  setIsActionsMenuOpen(false)
                  setIsMembersMenuOpen(false)
                }}
                className={`${menuItemBaseClass} ${
                  openPendingTasks.length > 0
                    ? 'animate-bounce border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : ''
                }`}
              >
                Tasks
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onGeneratePdf(erp)
                setIsActionsMenuOpen(false)
                setIsMembersMenuOpen(false)
              }}
              className={menuItemBaseClass}
            >
              Generate PDF
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMembersMenuOpen((prev) => !prev)}
                className={`${menuItemBaseClass} ${
                  shouldPulseMembersButton
                    ? 'animate-bounce border-rose-300 bg-rose-100 text-rose-700 hover:border-rose-400'
                    : ''
                }`}
              >
                Members
              </button>
              {isMembersMenuOpen && (
                <div className="absolute right-full top-0 z-40 mr-2 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  {memberMenuOptions.length ? (
                    memberMenuOptions.map((option) => {
                      const roleKey = roleLabelToKey[option] || null
                      const shouldPulseRole = roleKey ? pendingMemberRoles.has(roleKey) : false

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSelectedMemberRole(roleKey)
                            setIsMembersMenuOpen(false)
                            setIsActionsMenuOpen(false)
                          }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                            shouldPulseRole
                              ? 'animate-bounce border border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate-500">No members available</p>
                  )}
                </div>
              )}
            </div>

            {isProvider || (currentUserId && String(erp.receiver) === String(currentUserId)) ? (
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(true)
                }}
                className="w-full rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Only provider and receiver can delete this ERP card"
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-left text-sm font-semibold text-slate-400"
              >
                Delete (Read-only)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onToggleDetails(erp.id)
                setIsActionsMenuOpen(false)
                setIsMembersMenuOpen(false)
              }}
              className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-left text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              {expandedId === erp.id ? 'Hide Details' : 'View Details'}
            </button>
          </div>
        ) : null}
      </div>

      {selectedMemberRole ? (
        <div
          className={`space-y-2 rounded-lg border bg-white p-3 text-xs ${
            pendingMemberRoles.has(selectedMemberRole)
              ? 'border-rose-300 bg-rose-50/70'
              : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-800">
              Assign {roleKeyToLabel[selectedMemberRole] || 'Members'}
            </p>
            <div className="flex items-center gap-2">
              {isProvider ? (
                <>
                  <button
                    type="button"
                    onClick={() => onPublishMemberPost?.(erp, selectedMemberRole, selectedSelfAssignMessage)}
                    className="rounded-full border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-700"
                  >
                    Generate Self-Assign Post
                  </button>
                  {selfAssignEnabled ? (
                    <button
                      type="button"
                      onClick={() => onCloseMemberPost?.(erp, selectedMemberRole)}
                      className="rounded-full border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700"
                    >
                      Remove Self-Assign Post
                    </button>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedMemberRole(null)}
                className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {isProvider
              ? 'Manual assign: provider can add/remove connections. Self-assign post: connections can assign themselves from Connections page.'
              : 'You can only view assigned members for this role.'}
          </p>
          <p className="text-[11px] text-slate-500">
            Self-assign status: {selfAssignEnabled ? 'Open' : 'Closed'}
          </p>

          <div className="rounded-md border border-brand-100 bg-brand-50/50 px-2 py-1.5 text-[11px] text-slate-700">
            <p className="font-semibold text-brand-700">Responsibility in this ERP</p>
            <p className="mt-0.5">{selectedRoleResponsibilityText}</p>
          </div>

          {isProvider ? (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Self-assign message
              </label>
              <textarea
                value={selectedSelfAssignMessage}
                onChange={(event) =>
                  setSelfAssignMessageByRole((prev) => ({
                    ...prev,
                    [selectedMemberRole]: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Write a short manual message for connection members"
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300"
              />
            </div>
          ) : null}

          {selectedMemberRole === 'expertise' && expertiseRowsForAssignment.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2">
              {expertiseRowsForAssignment.map((row) => (
                <div key={`expertise-row-${erp.id}-${row.rowId}`} className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-800">
                    {row.name} ({row.assignedIds.length}/{row.required})
                  </p>
                  <div className="mt-1 space-y-1">
                    {visibleMembers.length ? (
                      visibleMembers.map((user) => {
                        const checked = row.assignedIds.includes(Number(user.id))
                        const isCurrentUser = Number(user.id) === Number(currentUserId)
                        const disableAssign = !checked && row.assignedIds.length >= row.required
                        return (
                          <label
                            key={`erp-member-${selectedMemberRole}-${row.rowId}-${user.id}`}
                            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${isProvider ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-slate-700">
                                {isCurrentUser
                                  ? 'Assign myself'
                                  : user.name || user.username || `User #${user.id}`}
                              </span>
                            </span>
                            {isProvider ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disableAssign}
                                title={disableAssign ? `Required ${row.required} already assigned for ${row.name}` : ''}
                                onChange={(event) =>
                                  onUpdateMemberAssignment?.(
                                    erp,
                                    selectedMemberRole,
                                    Number(user.id),
                                    event.target.checked,
                                    { expertiseId: row.rowId },
                                  )
                                }
                              />
                            ) : checked ? (
                              <span className="text-[11px] font-semibold text-emerald-700">Assigned</span>
                            ) : null}
                          </label>
                        )
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        {isProvider ? 'No connections found.' : 'No assigned members yet.'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2">
              {visibleMembers.length ? (
                visibleMembers.map((user) => {
                  const checked = selectedAssigneeIds.includes(Number(user.id))
                  const isCurrentUser = Number(user.id) === Number(currentUserId)
                  return (
                    <label
                      key={`erp-member-${selectedMemberRole}-${user.id}`}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${isProvider ? 'cursor-pointer hover:bg-white' : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-slate-700">
                          {isCurrentUser
                            ? 'Assign myself'
                            : user.name || user.username || `User #${user.id}`}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">
                          {selectedRoleResponsibilityText}
                        </span>
                      </span>
                      {isProvider ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            onUpdateMemberAssignment?.(
                              erp,
                              selectedMemberRole,
                              Number(user.id),
                              event.target.checked,
                            )
                          }
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">Assigned</span>
                      )}
                    </label>
                  )
                })
              ) : (
                <p className="text-[11px] text-slate-500">
                  {isProvider ? 'No connections found.' : 'No assigned members yet.'}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {isProvider && trackOpenId === erp.id && (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs text-slate-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="font-semibold text-slate-800">Pending Tasks</p>
              {openPendingTasks.length ? (
                <ul className="mt-1 space-y-1">
                  {openPendingTasks.map((task) => renderTaskRow(task, 'pending'))}
                </ul>
              ) : (
                <p className="mt-1 text-slate-500">No pending tasks.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="font-semibold text-slate-800">Completed Tasks</p>
              {completedTasks.length ? (
                <ul className="mt-1 space-y-1">
                  {completedTasks.map((task) => renderTaskRow(task, 'completed'))}
                </ul>
              ) : (
                <p className="mt-1 text-slate-500">No completed tasks yet.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onTrackNext(erp)}
              className="rounded-full border border-violet-300 bg-white px-3 py-1 font-semibold text-violet-700"
            >
              {erp.stage === 'Completed' ? 'Completed' : 'Next State'}
            </button>
            <p className="text-[11px] text-slate-500">Use Next State to move along the flow.</p>
          </div>
        </div>
      )}

      {erp.stage === 'On Process' && canUseMessenger && messageOpenId === erp.id ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Group Messages</p>
            <button
              type="button"
              onClick={loadMessages}
              className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2">
            {isLoadingMessages ? (
              <p className="text-[11px] text-slate-500">Loading messages...</p>
            ) : messages.length ? (
              messages.map((msg) => {
                const isMine = String(msg.sender) === String(currentUserId)
                return (
                  <div
                    key={`erp-msg-${msg.id}`}
                    className={`rounded-md border px-2 py-1 text-[11px] ${
                      isMine
                        ? 'border-brand-200 bg-brand-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-slate-500">
                      <button
                        type="button"
                        onClick={() => onOpenOwner?.(Number(msg.sender))}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-slate-100"
                      >
                        <RatingRingAvatar
                          src={toMediaUrl(msg.sender_profile_photo) || defaultAvatar}
                          alt={msg.sender_name || 'Member'}
                          rating={getUserRating(msg.sender)}
                          size={24}
                          ringWidth={2}
                        />
                        <span className="font-semibold text-slate-700 hover:underline">{msg.sender_name || `User #${msg.sender}`}</span>
                      </button>
                      <span>•</span>
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    {msg.parent_id ? (
                      <p className="mb-1 text-[10px] text-slate-500">Replying to message #{msg.parent_id}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-slate-700">{msg.message}</p>
                    <button
                      type="button"
                      onClick={() => setReplyTargetId(msg.id)}
                      className="mt-1 text-[10px] font-semibold text-brand-600"
                    >
                      Reply
                    </button>
                  </div>
                )
              })
            ) : (
              <p className="text-[11px] text-slate-500">No messages yet. Start the conversation.</p>
            )}
          </div>

          {replyTargetId ? (
            <div className="mt-2 flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] text-brand-700">
              <span>Replying to message #{replyTargetId}</span>
              <button
                type="button"
                onClick={() => setReplyTargetId(null)}
                className="font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => {
                setChatInput(event.target.value)
                if (messageError) {
                  setMessageError('')
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message for this ERP group"
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isSendingMessage || !chatInput.trim()}
              className="rounded-md border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingMessage ? 'Sending...' : 'Send'}
            </button>
          </div>

          {messageError ? <p className="text-[11px] text-rose-600">{messageError}</p> : null}
        </div>
      ) : null}

      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 sm:p-4" onClick={() => onToggleDetails(erp.id)}>
          <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-3xl border border-violet-200 bg-[#ece8f3] p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-violet-700">{isDemandPost ? 'Demand Post' : 'Available Post'}</p>
              <p className="text-3xl font-bold text-violet-900">{post?.post_title || snapshotPost.title || post?.post_name || '-'}</p>
            </div>
            <div className="flex items-center gap-3">
              {isPostOwner ? (
                <button
                  type="button"
                  onClick={() => navigate(`/edit-post/${post?.id || snapshotPost?.id || ''}`)}
                  className="rounded-full border border-sky-300 bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  Edit Post
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onToggleDetails(erp.id)}
                className="rounded-full border border-violet-300 bg-white px-5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                Close
              </button>
            </div>
          </div>
        <div className="space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl border border-violet-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800">Post Details</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-700">Post Type:</span> {post?.post_type || snapshotPost.type || '-'}</p>
              <p><span className="font-semibold text-slate-700">Post Categories:</span> {post?.post_name || snapshotPost.name || '-'}</p>
              <p><span className="font-semibold text-slate-700">Post Title:</span> {post?.post_title || snapshotPost.title || '-'}</p>
              <p><span className="font-semibold text-slate-700">Location:</span> {post?.location || snapshotPost.location || '-'}</p>
              <p><span className="font-semibold text-slate-700">Brand / Company:</span> {post?.brand_company_name || snapshotPost.brand_company_name || '-'}</p>
              <p>
                <span className="font-semibold text-slate-700">Website:</span>{' '}
                {post?.website_link || snapshotPost.website_link ? (
                  <a
                    href={post?.website_link || snapshotPost.website_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600"
                  >
                    Open link
                  </a>
                ) : '-'}
              </p>
            </div>
            <p className="mt-2">
              <span className="font-semibold text-slate-700">Description:</span>{' '}
              {post?.description || snapshotPost.description || '-'}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-slate-700">Note for Delivery Man:</span>{' '}
              {supplierNote || '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800">Associated Members</h4>
            {hasAssociatedMembers ? (
              <div className="mt-3 space-y-3">
                {associatedMembersWithAssignments.map(({ roleKey, roleLabel, members }) => (
                  <div key={`erp-associated-${erp.id}-${roleKey}`} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{roleLabel}</p>
                    {members.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {members.map((member) => (
                          <button
                            key={`erp-associated-user-${roleKey}-${member.id}`}
                            type="button"
                            onClick={() => onOpenOwner?.(Number(member.id))}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
                          >
                            <div className="flex items-center gap-2">
                              <RatingRingAvatar
                                src={toMediaUrl(member.profile_photo) || defaultAvatar}
                                alt={member.name || member.username || `User #${member.id}`}
                                rating={getUserRating(member.id)}
                                size={48}
                                ringWidth={2}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800">
                                  {member.name || member.username || `User #${member.id}`}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">{member.location || 'Unknown location'}</p>
                              </div>
                            </div>
                            <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                              <p><span className="font-semibold text-slate-700">Phone:</span> {member.phone || '-'}</p>
                              <p className="truncate"><span className="font-semibold text-slate-700">Email:</span> {member.email || '-'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No assigned members.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No associated members assigned yet.</p>
            )}
          </div>

          {selectedExpertiseForTable.length ? (
            <div className="rounded-2xl border border-violet-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800">Expertise (Selected)</h4>
              <div className="mt-2">
                <ExpertiseTable
                  expertises={selectedExpertiseForTable}
                  postType={isDemandPost ? 'Demand' : 'Supply'}
                />
              </div>
            </div>
          ) : null}

          {selectedServicesForTable.length ? (
            <div className="rounded-2xl border border-violet-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800">Services (Selected)</h4>
              <div className="mt-2">
                <ServiceTable
                  services={selectedServicesForTable}
                  postType={isDemandPost ? 'Demand' : 'Supply'}
                  showDescription
                />
              </div>
            </div>
          ) : null}

          {selectedProductsForTable.length ? (
            <div className="rounded-2xl border border-violet-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800">Products (Selected)</h4>
              <div className="mt-2">
                <ProductTable
                  products={selectedProductsForTable}
                  postType={isDemandPost ? 'Demand' : 'Supply'}
                  showDescription
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-violet-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800">Final Cost Summary</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-700">Expertise Total:</span> ${Number(snapshotTotals.expertise || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Services Total:</span> ${Number(snapshotTotals.services || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Products Total:</span> ${Number(snapshotTotals.products || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Grand Total:</span> ${Number(snapshotTotals.grand || erp.total_cost || 0).toFixed(2)}</p>
            </div>
          </div>

        </div>
        </div>
        </div>
      )}

      {canCompleteAsReceiver && isCompletionFormOpen ? (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="text-sm font-semibold text-emerald-800">Complete ERP With Rating</p>
          <p className="text-[11px] text-emerald-700">
            Confirm completion by giving provider a rating and comment. This will move the task to Completed.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Rating
              <select
                value={completionRating}
                onChange={(event) => {
                  setCompletionRating(event.target.value)
                  if (completionError) setCompletionError('')
                }}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-300"
              >
                <option value="">Select rating</option>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very Poor</option>
              </select>
            </label>
          </div>

          <label className="text-xs font-semibold text-slate-700">
            Completion Comment
            <textarea
              value={completionComment}
              onChange={(event) => {
                setCompletionComment(event.target.value)
                if (completionError) setCompletionError('')
              }}
              rows={3}
              placeholder="Describe your overall experience and completion note"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-300"
            />
          </label>

          {completionError ? <p className="text-[11px] text-rose-600">{completionError}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReceiverComplete}
              disabled={isSubmittingCompletion}
              className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingCompletion ? 'Completing...' : 'Confirm Completed'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCompletionFormOpen(false)
                setCompletionError('')
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {erp.stage === 'Completed' && !isProvider && hasRatedProvider ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-emerald-800">
          Your comment about provider has already been submitted.
        </div>
      ) : null}

      {erp.stage === 'Completed' && !isProvider && providerFeedbackForCurrentUser ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-xs text-slate-700">
          <p className="font-semibold text-sky-800">Provider {providerDisplayName} Feedback For You</p>
          <p className="mt-1">
            <span className="font-semibold">Rating:</span> {Number(providerFeedbackForCurrentUser.rating_value || 0).toFixed(1)} / 5
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            <span className="font-semibold">Message:</span> {providerFeedbackForCurrentUser.review_text || '-'}
          </p>
        </div>
      ) : null}

      {erp.stage === 'Completed' && !isProvider && isProviderFeedbackOpen && !hasRatedProvider ? (
        <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs text-slate-700">
          <p className="text-sm font-semibold text-brand-800">Rate and Comment Provider</p>
          <p className="text-[11px] text-brand-700">
            Share how satisfied you were working with {counterpartyName || 'the provider'}.
          </p>

          <label className="text-xs font-semibold text-slate-700">
            Rating
            <select
              value={providerFeedbackRating}
              onChange={(event) => {
                setProviderFeedbackRating(event.target.value)
                if (providerFeedbackError) setProviderFeedbackError('')
              }}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300"
            >
              <option value="">Select rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Very Poor</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Comment
            <textarea
              value={providerFeedbackComment}
              onChange={(event) => {
                setProviderFeedbackComment(event.target.value)
                if (providerFeedbackError) setProviderFeedbackError('')
              }}
              rows={3}
              placeholder={`Write your feedback about working with ${counterpartyName || 'the provider'}`}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300"
            />
          </label>

          {providerFeedbackError ? <p className="text-[11px] text-rose-600">{providerFeedbackError}</p> : null}
          {providerFeedbackSuccess ? <p className="text-[11px] text-emerald-700">{providerFeedbackSuccess}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmitProviderFeedback}
              disabled={isSubmittingProviderFeedback}
              className="rounded-md border border-brand-300 bg-white px-3 py-1 text-xs font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingProviderFeedback ? 'Submitting...' : 'Submit Rating'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProviderFeedbackOpen(false)
                setProviderFeedbackError('')
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isProvider && erp.stage === 'Completed' && isParticipantRatingOpen ? (
        <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-xs text-slate-700">
          <p className="text-sm font-semibold text-sky-800">Rate Receiver and Members</p>
          <p className="text-[11px] text-sky-700">
            Your rating updates participant profile score and sends them feedback notification.
          </p>

          <label className="text-xs font-semibold text-slate-700">
            Participant
            <select
              value={selectedParticipantId}
              onChange={(event) => {
                setSelectedParticipantId(event.target.value)
                if (participantRatingError) setParticipantRatingError('')
              }}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-300"
            >
              <option value="">Select receiver/member</option>
              {providerRateCandidates.map((user) => (
                <option key={`participant-rate-${erp.id}-${user.id}`} value={user.id}>
                  {user.name || user.username || `User #${user.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Rating
            <select
              value={participantRating}
              onChange={(event) => {
                setParticipantRating(event.target.value)
                if (participantRatingError) setParticipantRatingError('')
              }}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-300"
            >
              <option value="">Select rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Very Poor</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Comment
            <textarea
              value={participantComment}
              onChange={(event) => {
                setParticipantComment(event.target.value)
                if (participantRatingError) setParticipantRatingError('')
              }}
              rows={2}
              placeholder="Feedback for this participant"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-300"
            />
          </label>

          {participantRatingError ? <p className="text-[11px] text-rose-600">{participantRatingError}</p> : null}
          {participantRatingSuccess ? <p className="text-[11px] text-emerald-700">{participantRatingSuccess}</p> : null}

          <button
            type="button"
            onClick={handleProviderParticipantRating}
            disabled={isSubmittingParticipantRating || providerRateCandidates.length === 0}
            className="rounded-md border border-sky-300 bg-white px-3 py-1 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingParticipantRating ? 'Submitting...' : 'Submit Participant Rating'}
          </button>
        </div>
      ) : null}

      {isProvider && erp.stage === 'Completed' && providerSubmittedFeedbackEntries.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs text-slate-700">
          <p className="text-sm font-semibold text-violet-800">Given Ratings and Comments</p>
          <div className="space-y-2">
            {providerSubmittedFeedbackEntries.map((entry) => (
              <div key={`provider-given-feedback-${erp.id}-${entry.participantId}`} className="rounded-md border border-violet-200 bg-white p-2">
                <p className="font-semibold text-slate-800">{entry.participantName}</p>
                {entry.roles.length ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">Role: {entry.roles.join(', ')}</p>
                ) : null}
                <p className="mt-1">
                  <span className="font-semibold">Rating:</span> {entry.ratingValue.toFixed(1)} / 5
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  <span className="font-semibold">Message:</span> {entry.message || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg max-w-sm">
            <h3 className="text-lg font-bold text-slate-900">Delete ERP Card</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this ERP Card? This action cannot be undone. It will also be deleted from the other party's view.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-2">
                <p className="text-xs font-semibold text-rose-700">{deleteError}</p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteError('')
                }}
                disabled={isDeletingErp}
                className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingErp(true)
                  setDeleteError('')
                  try {
                    await onDelete?.(erp)
                    setIsDeleteConfirmOpen(false)
                    setIsActionsMenuOpen(false)
                  } catch (error) {
                    console.error('Delete failed:', error)
                    const errorMsg = error.response?.data?.detail || error.message || 'Failed to delete ERP card'
                    setDeleteError(errorMsg)
                  } finally {
                    setIsDeletingErp(false)
                  }
                }}
                disabled={isDeletingErp}
                className="flex-1 rounded-full border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingErp ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
