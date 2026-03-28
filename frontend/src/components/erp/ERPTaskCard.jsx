import { useCallback, useEffect, useState } from 'react'

import api from '../../api/client'
import defaultAvatar from '../../assets/default-avatar.svg'

export default function ERPTaskCard({
  erp,
  post,
  rating,
  currentUserId,
  expandedId,
  trackOpenId,
  phaseTasks,
  onSetPending,
  onToggleTrack,
  onGeneratePdf,
  onToggleDetails,
  onTrackNext,
  onToggleReadyProduct,
  users = [],
  assignableUsersByRole = {},
  onUpdateMemberAssignment,
  onPublishMemberPost,
  onOpenOwner,
  toMediaUrl,
}) {
  const [isMembersMenuOpen, setIsMembersMenuOpen] = useState(false)
  const [selectedMemberRole, setSelectedMemberRole] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [replyTargetId, setReplyTargetId] = useState(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [selfAssignMessageByRole, setSelfAssignMessageByRole] = useState({})

  const phases = ['Pending', 'On Process', 'Completed']
  const activePhaseIndex = phases.indexOf(erp.stage)

  const snapshot = erp.configuration_snapshot || {}
  const snapshotPost = snapshot.post || {}
  const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
  const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
  const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
  const snapshotTotals = snapshot.totals || {}
  const supplierNote = String(snapshot?.notes?.supplier_note || snapshot?.supplier_note || '').trim()

  const parsePostCategories = (value) =>
    String(value || '')
      .split(',')
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)

  const categories = parsePostCategories(post?.post_name || snapshotPost?.name || '')
  const hasExpertiseCategory =
    categories.includes('expertise') || snapshotExpertise.some((row) => Number(row.quantity || 0) > 0)
  const hasServicesCategory =
    categories.includes('service') || categories.includes('services') || snapshotServices.length > 0
  const hasProductCategory =
    categories.includes('product') || categories.includes('products') || snapshotProducts.length > 0

  const memberMenuOptions = [
    hasExpertiseCategory ? 'Expertise' : null,
    hasServicesCategory ? 'Skill provider' : null,
    hasProductCategory ? 'Delivary Man' : null,
  ].filter(Boolean)

  const roleLabelToKey = {
    Expertise: 'expertise',
    'Skill provider': 'skill_provider',
    'Delivary Man': 'supplier',
  }

  const roleKeyToLabel = {
    expertise: 'Expertise',
    skill_provider: 'Skill provider',
    supplier: 'Delivary Man',
  }

  const membersState = snapshot.members || {}
  const selectedRoleState = selectedMemberRole ? membersState[selectedMemberRole] || {} : {}
  const selectedAssigneeIds = Array.isArray(selectedRoleState.assignee_ids)
    ? selectedRoleState.assignee_ids.map((id) => Number(id))
    : []
  const selfAssignEnabled = Boolean(selectedRoleState.self_assign_enabled)
  const selectedSelfAssignMessage =
    selectedMemberRole && Object.prototype.hasOwnProperty.call(selfAssignMessageByRole, selectedMemberRole)
      ? selfAssignMessageByRole[selectedMemberRole]
      : String(selectedRoleState.self_assign_message || '')
  const selectedSelfAssignPostLink = String(selectedRoleState.self_assign_post_link || '').trim()
  const selectedSelfAssignPostTitle =
    String(selectedRoleState.self_assign_post_title || snapshotPost?.title || post?.post_title || '').trim()

  const viewerRole =
    currentUserId && String(erp.provider) === String(currentUserId)
      ? 'Provider'
      : currentUserId && String(erp.receiver) === String(currentUserId)
        ? 'Receiver'
        : 'Viewer'
  const isProvider = viewerRole === 'Provider'
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

  const stageStyle =
    erp.stage === 'Completed'
      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      : erp.stage === 'On Process'
        ? 'border border-sky-200 bg-sky-50 text-sky-700'
        : 'border border-amber-200 bg-amber-50 text-amber-700'

  const pendingChecklist = phaseTasks.Pending || []
  const openPendingTasks = pendingChecklist.filter((task) => !task.done)
  const donePendingTasks = pendingChecklist.filter((task) => task.done)
  const completedStageTasks = (phaseTasks.Completed || []).filter((task) => task.done)
  const completedTasks = [...donePendingTasks, ...completedStageTasks]

  const openPendingTaskKeys = new Set(openPendingTasks.map((task) => String(task.key || '').trim()))
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
  const shouldPulseMembersButton = pendingMemberRoles.size > 0

  const renderTaskRow = (task, listType) => {
    const isOpenPending = listType === 'pending' && !task.done
    const isReadyProductTask = task.toggleable && task.key === 'ready_product'
    const shouldBounceRow = isOpenPending && !(task.toggleable && task.key === 'ready_product')
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
              : 'border-rose-400 bg-rose-200 hover:border-rose-500'
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
    try {
      const { data } = await api.get(`/erp/${erp.id}/messages/`)
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [erp.id, erp.stage])

  useEffect(() => {
    if (trackOpenId === erp.id && erp.stage === 'On Process') {
      loadMessages()
    }
  }, [trackOpenId, erp.id, erp.stage, loadMessages])

  const handleSendMessage = async () => {
    const messageText = chatInput.trim()
    if (!messageText || erp.stage !== 'On Process') return

    setIsSendingMessage(true)
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
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <div className="card relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-brand-50/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-brand-200/20 blur-2xl" />

      <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <p className="inline-flex rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {roleLabel}
        </p>
        <p
          className="px-2 text-center text-lg font-normal tracking-normal text-slate-500"
          title={post?.post_name || `Task #${erp.id}`}
        >
          {post?.post_name || `Task #${erp.id}`}
        </p>
        <span className={`rounded-full px-4 py-1.5 text-base font-bold ${stageStyle}`}>{erp.stage}</span>
      </div>

      <h2 className="relative mx-auto mt-2 w-full max-w-3xl rounded-xl bg-white/80 px-3 py-2 text-center text-base font-bold text-slate-800 shadow-sm ring-1 ring-slate-200/80">
        <span className="font-semibold">Post Title:</span> {post?.post_title || snapshotPost?.title || '-'}
      </h2>

      <div className="relative space-y-1.5">
        {counterpartyUserId && (
          <button
            type="button"
            onClick={() => onOpenOwner(counterpartyUserId)}
            className="mt-1 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/60"
          >
            <span className="text-slate-500">{counterpartyLabel}:</span>
            <img
              src={counterpartyPhoto}
              alt={counterpartyName}
              className="h-7 w-7 rounded-full border border-slate-200 object-cover"
            />
            <span className="text-slate-800">{counterpartyName}</span>
            <p className="text-[11px] font-normal text-slate-500">{post?.location || 'Unknown location'}</p>
          </button>
        )}
      </div>

      <div className="relative grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-700">Rating:</span> {rating.toFixed(2)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-700">Total:</span> ${Number(erp.total_cost || 0).toFixed(2)}
        </div>
      </div>

      <div className="rounded-lg border border-violet-200/70 bg-white/70 px-3 py-3 text-xs text-slate-700">
        <div className="relative">
          <div className="pointer-events-none absolute left-8 right-8 top-3 h-0.5 bg-slate-200" />
          <div className="relative grid grid-cols-3 gap-2">
            {phases.map((phase, index) => {
              const isDone = index < activePhaseIndex
              const isActive = phase === erp.stage

              return (
                <div key={`phase-flow-${erp.id}-${phase}`} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      isActive
                        ? 'border-violet-600 bg-violet-600 shadow-sm'
                        : isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300 bg-white'
                    }`}
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? 'bg-violet-600 text-white'
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

      <div className="relative flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => onSetPending(erp)}
          disabled={!isProvider}
          title={!isProvider ? 'Only provider can manage Pending actions' : ''}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            erp.stage === 'Pending'
              ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
              : !isProvider
                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700'
          }`}
        >
          Pending
        </button>
        {isProvider ? (
          <button
            type="button"
            onClick={() => onToggleTrack(erp.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              openPendingTasks.length > 0
                ? 'animate-bounce border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            Tasks
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onGeneratePdf(erp)}
          className="rounded-full border border-slate-700 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
        >
          Generate PDF
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMembersMenuOpen((prev) => !prev)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              shouldPulseMembersButton
                ? 'animate-bounce border-rose-300 bg-rose-100 text-rose-700 hover:border-rose-400'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            Members
          </button>
          {isMembersMenuOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-2 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
        <button
          type="button"
          onClick={() => onToggleDetails(erp.id)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          {expandedId === erp.id ? 'Hide Details' : 'View Details'}
        </button>
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
                <button
                  type="button"
                  onClick={() => onPublishMemberPost?.(erp, selectedMemberRole, selectedSelfAssignMessage)}
                  className="rounded-full border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-700"
                >
                  Generate Self-Assign Post
                </button>
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

          {selectedSelfAssignPostLink ? (
            <p className="text-[11px] text-slate-500">
              Post link:{' '}
              <a
                href={selectedSelfAssignPostLink}
                className="font-semibold text-brand-700 hover:underline"
              >
                {selectedSelfAssignPostTitle || 'Open post'}
              </a>
            </p>
          ) : null}

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
                    <span className="truncate text-slate-700">
                      {isCurrentUser
                        ? 'Assign myself'
                        : user.name || user.username || `User #${user.id}`}
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

          {erp.stage === 'On Process' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
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
                          <img
                            src={toMediaUrl(msg.sender_profile_photo) || defaultAvatar}
                            alt={msg.sender_name || 'Member'}
                            className="h-4 w-4 rounded-full object-cover"
                          />
                          <span className="font-semibold text-slate-700">{msg.sender_name || `User #${msg.sender}`}</span>
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
                  onChange={(event) => setChatInput(event.target.value)}
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
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">Messaging is available only in On Process stage.</p>
          )}
        </div>
      )}

      {expandedId === erp.id && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-800">Post Details</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-700">Title:</span> {snapshotPost.title || post?.post_title || '-'}</p>
              <p><span className="font-semibold text-slate-700">Type:</span> {snapshotPost.type || post?.post_type || '-'}</p>
              <p><span className="font-semibold text-slate-700">Name:</span> {snapshotPost.name || post?.post_name || '-'}</p>
              <p><span className="font-semibold text-slate-700">Location:</span> {snapshotPost.location || post?.location || '-'}</p>
              <p><span className="font-semibold text-slate-700">Brand:</span> {snapshotPost.brand_company_name || post?.brand_company_name || '-'}</p>
              <p>
                <span className="font-semibold text-slate-700">Website:</span>{' '}
                {snapshotPost.website_link || post?.website_link ? (
                  <a
                    href={snapshotPost.website_link || post?.website_link}
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
              {snapshotPost.description || post?.description || '-'}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-slate-700">Assigned Workers:</span> {(erp.assigned_workers || []).length}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-slate-700">Note for Delivary Man:</span>{' '}
              {supplierNote || '-'}
            </p>
          </div>

          {[{
            title: 'Expertise (Modified)',
            rows: snapshotExpertise,
            columns: [
              { key: 'name', label: 'Name' },
              { key: 'duration', label: 'Duration' },
              { key: 'unit', label: 'Unit' },
              { key: 'unit_cost', label: 'Unit Cost' },
              { key: 'quantity', label: 'People' },
              { key: 'line_total', label: 'Line Total' },
            ],
          }, {
            title: 'Services (Modified)',
            rows: snapshotServices,
            columns: [
              { key: 'name', label: 'Name' },
              { key: 'unit_cost', label: 'Unit Cost' },
              { key: 'quantity', label: 'Packages' },
              { key: 'line_total', label: 'Line Total' },
            ],
          }, {
            title: 'Products (Modified)',
            rows: snapshotProducts,
          }].map((section) => {
            const isProductsSection = section.title === 'Products (Modified)'
            const isServicesSection = section.title === 'Services (Modified)'
            const showDuration = !isProductsSection && !isServicesSection
            const showUnit = !isServicesSection

            return (
            section.rows.length > 0 ? (
              <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-2 py-1">Name</th>
                        {showUnit ? <th className="px-2 py-1">Unit</th> : null}
                        <th className="px-2 py-1">Qty</th>
                        {showDuration ? <th className="px-2 py-1">Duration</th> : null}
                        <th className="px-2 py-1">Unit Cost</th>
                        <th className="px-2 py-1">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={`${section.title}-${row.id}`} className="border-b border-slate-100 last:border-none">
                          <td className="px-2 py-1 font-medium text-slate-700">{row.name || '-'}</td>
                          {showUnit ? <td className="px-2 py-1">{row.unit || '-'}</td> : null}
                          <td className="px-2 py-1">{Number(row.quantity || 0)}</td>
                          {showDuration ? <td className="px-2 py-1">{Number(row.duration || 0)}</td> : null}
                          <td className="px-2 py-1">${Number(row.unit_cost || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 font-semibold text-slate-700">${Number(row.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
            )
          })}

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-800">Final Cost Summary</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-700">Expertise Total:</span> ${Number(snapshotTotals.expertise || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Services Total:</span> ${Number(snapshotTotals.services || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Products Total:</span> ${Number(snapshotTotals.products || 0).toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Grand Total:</span> ${Number(snapshotTotals.grand || erp.total_cost || 0).toFixed(2)}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
