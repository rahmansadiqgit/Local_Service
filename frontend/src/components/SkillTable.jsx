import { useMemo, useState } from 'react'

export default function SkillTable({ skills = [] }) {
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

  if (!skills.length) {
    return <p className="text-sm text-slate-500">No skills listed.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('skill_name')}>
                Skill
              </button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('unit')}>Unit</button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('cost_per_unit')}>
                Cost
              </button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('available_workers')}>
                Workers
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
              <td className="px-4 py-2 font-medium">{skill.skill_name}</td>
              <td className="px-4 py-2">{skill.unit}</td>
              <td className="px-4 py-2">${skill.cost_per_unit}</td>
              <td className="px-4 py-2">{skill.available_workers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
