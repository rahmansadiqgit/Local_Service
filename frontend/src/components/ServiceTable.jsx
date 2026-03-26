import { useMemo, useState } from 'react'

export default function ServiceTable({ services = [], postType = 'Supply', showDescription = true }) {
  const [sortKey, setSortKey] = useState('service_name')
  const [sortDir, setSortDir] = useState('asc')
  const isDemand = postType === 'Demand'

  const sorted = useMemo(() => {
    const copy = [...services]
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
  }, [services, sortDir, sortKey])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (!services.length) {
    return <p className="text-sm text-slate-500">No services listed.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('service_name')}>
                Service Name
              </button>
            </th>
            {showDescription && (
              <th className="px-3 py-2 whitespace-nowrap">
                <button type="button" onClick={() => handleSort('description')}>
                  {isDemand ? 'Service Description' : 'Specific Service Description'}
                </button>
              </th>
            )}
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('unit')}>
                {isDemand ? 'Service Duration Needed' : 'Service Duration'}
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('cost_per_unit')}>
                {isDemand ? 'Budget (BDT)' : 'Service Cost (BDT)'}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {sorted.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-900'}>
              <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.service_name || '-'}</td>
              {showDescription && (
                <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-pre-line break-words">{row.description || '-'}</td>
              )}
              <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.unit || '-'}</td>
              <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                {!isNaN(parseFloat(row.cost_per_unit)) ? parseFloat(row.cost_per_unit).toFixed(2) : '0.00'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
