import { useMemo, useState } from 'react'

export default function ExpertiseTable({ expertises = [], postType = 'Supply', tone = 'default' }) {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const isDemand = postType === 'Demand'

  const sorted = useMemo(() => {
    const copy = [...expertises]
    copy.sort((a, b) => {
      const aValue = a[sortKey] ?? ''
      const bValue = b[sortKey] ?? ''
      if (typeof aValue === 'number' || typeof bValue === 'number') {
        return sortDir === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
      }
      return sortDir === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
    return copy
  }, [expertises, sortDir, sortKey])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (!expertises.length) {
    return <p className="text-sm text-slate-500">No expertise detail listed.</p>
  }

  const isProfileTone = tone === 'profile'

  return (
    <div className={`overflow-x-auto rounded-xl border ${isProfileTone ? 'border-violet-200/80 bg-white/55' : 'border-slate-200 dark:border-slate-800'}`}>
      <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
        <thead className={isProfileTone ? 'bg-gradient-to-r from-violet-100/90 to-fuchsia-100/80 text-violet-900' : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300'}>
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('name')}>
                {isDemand ? 'Expertise Name' : 'Skill / Expertise Name'}
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('experience')}>
                {isDemand ? 'Preferred Experience' : 'Experience'}
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('unit')}>
                {isDemand ? 'Hire Unit' : 'Work Type'}
              </button>
            </th>
            {isDemand && (
              <th className="px-3 py-2 whitespace-nowrap">
                <button type="button" onClick={() => handleSort('needed_budget_unit')}>
                  Needed Hire Unit
                </button>
              </th>
            )}
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('cost')}>
                {isDemand ? 'Your Budget (BDT)' : 'Charge (BDT)'}
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('available_person')}>
                {isDemand ? 'Required Person' : 'Available Person'}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((expertise, index) => (
            <tr
              key={expertise.id}
              className={
                isProfileTone
                  ? `border-t border-violet-200/70 ${index % 2 === 1 ? 'bg-white/70' : 'bg-violet-50/45'}`
                  : `border-t border-slate-200 dark:border-slate-800 ${index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''}`
              }
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">{expertise.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.experience}</td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.unit}</td>
              {isDemand ? (
                <td className="px-3 py-2 whitespace-nowrap">{Number(expertise.needed_budget_unit || 0)}</td>
              ) : null}
              <td className="px-3 py-2 whitespace-nowrap">
                {isDemand
                  ? `${expertise.cost} ${
                      expertise.unit === 'hourly'
                        ? '(Hourly)'
                        : expertise.unit === 'daily'
                          ? '(Daily)'
                          : expertise.unit === 'monthly'
                            ? '(Monthly)'
                            : ''
                    }`
                  : expertise.cost}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.available_person}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
