import { useMemo, useState } from 'react'

export default function ExpertiseTable({ expertises = [] }) {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

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
    return <p className="text-sm text-slate-500">No expertise services listed.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('name')}>
                Expertise Name
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('experience')}>
                Experience
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('unit')}>
                Work Duration
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('cost')}>
                Charge $
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('available_person')}>
                Available Person
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((expertise, index) => (
            <tr
              key={expertise.id}
              className={`border-t border-slate-200 dark:border-slate-800 ${
                index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''
              }`}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">{expertise.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.experience}</td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.unit}</td>
              <td className="px-3 py-2 whitespace-nowrap">${expertise.cost}</td>
              <td className="px-3 py-2 whitespace-nowrap">{expertise.available_person}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
