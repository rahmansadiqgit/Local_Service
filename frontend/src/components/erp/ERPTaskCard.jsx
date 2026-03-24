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

  const phases = ['Pending', 'On Process', 'Completed']
  const activePhaseIndex = phases.indexOf(erp.stage)

  const snapshot = erp.configuration_snapshot || {}
  const snapshotPost = snapshot.post || {}
  const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
  const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
  const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
  const snapshotTotals = snapshot.totals || {}

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
    hasProductCategory ? 'Supplier' : null,
  ].filter(Boolean)

  const roleLabelToKey = {
    Expertise: 'expertise',
    'Skill provider': 'skill_provider',
    Supplier: 'supplier',
  }

  const roleKeyToLabel = {
    expertise: 'Expertise',
    skill_provider: 'Skill provider',
    supplier: 'Supplier',
  }

  const membersState = snapshot.members || {}
  const selectedRoleState = selectedMemberRole ? membersState[selectedMemberRole] || {} : {}
  const selectedAssigneeIds = Array.isArray(selectedRoleState.assignee_ids)
    ? selectedRoleState.assignee_ids.map((id) => Number(id))
    : []
  const selfAssignEnabled = Boolean(selectedRoleState.self_assign_enabled)

  const viewerRole =
    currentUserId && String(erp.provider) === String(currentUserId)
      ? 'Provider'
      : currentUserId && String(erp.receiver) === String(currentUserId)
        ? 'Receiver'
        : 'Viewer'
  const isProvider = viewerRole === 'Provider'

  const roleLabel =
    viewerRole === 'Provider' ? 'Providing' : viewerRole === 'Receiver' ? 'Receiving' : erp.category

  const stageStyle =
    erp.stage === 'Completed'
      ? 'bg-emerald-100 text-emerald-700'
      : erp.stage === 'On Process'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'

  const pendingChecklist = phaseTasks.Pending || []
  const openPendingTasks = pendingChecklist.filter((task) => !task.done)
  const donePendingTasks = pendingChecklist.filter((task) => task.done)
  const completedStageTasks = (phaseTasks.Completed || []).filter((task) => task.done)
  const completedTasks = [...donePendingTasks, ...completedStageTasks]

  const renderTaskRow = (task, listType) => (
    <li key={`${erp.id}-${listType}-${task.key || task.label}`} className="flex items-center gap-1">
      {task.toggleable && task.key === 'ready_product' ? (
        <button
          type="button"
          onClick={() => onToggleReadyProduct?.(erp.id)}
          disabled={!isProvider}
          aria-label={task.done ? 'Mark ready product as not filled' : 'Mark ready product as filled'}
          title={!isProvider ? 'Only provider can manage Pending actions' : ''}
          className={`h-4 w-4 rounded-full border transition ${
            task.done
              ? 'border-emerald-600 bg-emerald-500'
              : 'border-slate-400 bg-white hover:border-brand-400'
          }`}
        />
      ) : (
        <span className={task.done ? 'text-emerald-600' : 'text-amber-600'}>{task.done ? '✓' : '•'}</span>
      )}
      <span>{task.label}</span>
    </li>
  )

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
    <div className="card space-y-4 transition-shadow hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-slate-500">{roleLabel}</p>
          <h3 className="text-lg font-semibold">{post?.post_name || `Task #${erp.id}`}</h3>
          <p className="text-sm text-slate-500">{post?.location || 'Unknown location'}</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold">Post Title:</span> {post?.post_title || snapshotPost?.title || '-'}
          </p>
          {post?.owner_id && (
            <button
              type="button"
              onClick={() => onOpenOwner(post.owner_id)}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <img
                src={toMediaUrl(post?.owner_profile_photo) || defaultAvatar}
                alt={post?.owner_name || 'Post owner'}
                className="h-6 w-6 rounded-full object-cover"
              />
              <span>{post?.owner_name || `Owner #${post.owner_id}`}</span>
            </button>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageStyle}`}>{erp.stage}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>Rating: {rating.toFixed(2)}</span>
        <span>Total: ${Number(erp.total_cost || 0).toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSetPending(erp)}
          disabled={!isProvider}
          title={!isProvider ? 'Only provider can manage Pending actions' : ''}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            erp.stage === 'Pending'
              ? 'bg-brand-500 text-white'
              : !isProvider
                ? 'cursor-not-allowed border border-slate-200 text-slate-400'
                : 'border border-slate-200 text-slate-600'
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => onToggleTrack(erp.id)}
          className="rounded-full border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700"
        >
          Track
        </button>
        <button
          type="button"
          onClick={() => onGeneratePdf(erp)}
          className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600"
        >
          Generate PDF
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMembersMenuOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            Members
          </button>
          {isMembersMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-2 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {memberMenuOptions.length ? (
                memberMenuOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedMemberRole(roleLabelToKey[option] || null)
                      setIsMembersMenuOpen(false)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">No members available</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleDetails(erp.id)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
        >
          {expandedId === erp.id ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {selectedMemberRole ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-800">
              Assign {roleKeyToLabel[selectedMemberRole] || 'Members'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPublishMemberPost?.(erp, selectedMemberRole)}
                disabled={!isProvider}
                className="rounded-full border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate Self-Assign Post
              </button>
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
            Manual assign: provider can add/remove connections. Self-assign post: connections can assign themselves from Connections page.
          </p>
          <p className="text-[11px] text-slate-500">
            Self-assign status: {selfAssignEnabled ? 'Open' : 'Closed'}
          </p>

          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2">
            {users.length ? (
              users.map((user) => {
                const checked = selectedAssigneeIds.includes(Number(user.id))
                return (
                  <label
                    key={`erp-member-${selectedMemberRole}-${user.id}`}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-white"
                  >
                    <span className="truncate text-slate-700">{user.name || user.username || `User #${user.id}`}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!isProvider}
                      onChange={(event) =>
                        onUpdateMemberAssignment?.(
                          erp,
                          selectedMemberRole,
                          Number(user.id),
                          event.target.checked,
                        )
                      }
                    />
                  </label>
                )
              })
            ) : (
              <p className="text-[11px] text-slate-500">No connections found.</p>
            )}
          </div>
        </div>
      ) : null}

      {trackOpenId === erp.id && (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            {phases.map((phase, index) => {
              const isDone = index < activePhaseIndex
              const isActive = phase === erp.stage
              return (
                <span
                  key={`phase-chip-${erp.id}-${phase}`}
                  className={`rounded-full px-3 py-1 font-semibold ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {phase}
                </span>
              )
            })}
          </div>

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
            <p className="text-[11px] text-slate-500">Flow: Pending → On Process → Completed</p>
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
              { key: 'duration', label: 'Duration' },
              { key: 'unit', label: 'Unit' },
              { key: 'unit_cost', label: 'Unit Cost' },
              { key: 'quantity', label: 'Packages' },
              { key: 'line_total', label: 'Line Total' },
            ],
          }, {
            title: 'Products (Modified)',
            rows: snapshotProducts,
          }].map((section) => {
            const showDuration = section.title !== 'Products (Modified)'

            return (
            section.rows.length > 0 ? (
              <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Unit</th>
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
                          <td className="px-2 py-1">{row.unit || '-'}</td>
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
