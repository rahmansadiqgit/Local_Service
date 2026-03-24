import { useMemo, useState } from 'react'

export default function SkillTable({ skills = [], category = 'Expertise' }) {
  const [sortKey, setSortKey] = useState('skill_name')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = useMemo(() => {
    const copy = [...skills]
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
  }, [skills, sortDir, sortKey])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Determine headers based on category
  const isExpertise = category.toLowerCase() === 'expertise'
  const nameHeader = isExpertise ? 'Expertise Name' : 'Service Name'
  const unitHeader = isExpertise ? 'Experience' : 'Service Duration'
  const costHeader = isExpertise ? 'Charge $' : 'Service Cost'

  if (!skills.length) {
    return <p className="text-sm text-slate-500">No skills listed.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('skill_name')}>
                {nameHeader}
              </button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('unit')}>{unitHeader}</button>
            </th>
            <th className="px-3 py-2 whitespace-nowrap">
              <button type="button" onClick={() => handleSort('cost_per_unit')}>
                {costHeader}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((skill, index) => (
            <tr
              key={skill.id}
              className={`border-t border-slate-200 dark:border-slate-800 ${
                index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''
              }`}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">{skill.skill_name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{skill.unit}</td>
              <td className="px-3 py-2 whitespace-nowrap">${skill.cost_per_unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
