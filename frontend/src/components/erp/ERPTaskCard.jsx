import { useState } from 'react'

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
  onOpenOwner,
  toMediaUrl,
}) {
  const [isMembersMenuOpen, setIsMembersMenuOpen] = useState(false)

  const phases = ['Pending', 'On Process', 'Completed']
  const activePhaseIndex = phases.indexOf(erp.stage)

  const snapshot = erp.configuration_snapshot || {}
  const snapshotPost = snapshot.post || {}
  const snapshotExpertise = Array.isArray(snapshot.expertise) ? snapshot.expertise : []
  const snapshotServices = Array.isArray(snapshot.services) ? snapshot.services : []
  const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : []
  const snapshotTotals = snapshot.totals || {}

  const viewerRole =
    currentUserId && String(erp.provider) === String(currentUserId)
      ? 'Provider'
      : currentUserId && String(erp.receiver) === String(currentUserId)
        ? 'Receiver'
        : 'Viewer'

  const roleLabel =
    viewerRole === 'Provider' ? 'Providing' : viewerRole === 'Receiver' ? 'Receiving' : erp.category

  const stageStyle =
    erp.stage === 'Completed'
      ? 'bg-emerald-100 text-emerald-700'
      : erp.stage === 'On Process'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'

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
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            erp.stage === 'Pending' ? 'bg-brand-500 text-white' : 'border border-slate-200 text-slate-600'
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
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Expertise
              </button>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Skill provider
              </button>
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
              <ul className="mt-1 space-y-1">
                {phaseTasks.Pending.map((task) => (
                  <li key={`${erp.id}-pending-${task.label}`} className="flex items-center gap-1">
                    <span className={task.done ? 'text-emerald-600' : 'text-amber-600'}>
                      {task.done ? '✓' : '•'}
                    </span>
                    <span>{task.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="font-semibold text-slate-800">On Process Tasks</p>
              <ul className="mt-1 space-y-1">
                {phaseTasks['On Process'].map((task) => (
                  <li key={`${erp.id}-onprocess-${task.label}`} className="flex items-center gap-1">
                    <span className={task.done ? 'text-emerald-600' : 'text-amber-600'}>
                      {task.done ? '✓' : '•'}
                    </span>
                    <span>{task.label}</span>
                  </li>
                ))}
              </ul>
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
          }, {
            title: 'Services (Modified)',
            rows: snapshotServices,
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
