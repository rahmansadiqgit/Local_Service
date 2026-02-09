export default function SkillTable({ skills = [] }) {
  if (!skills.length) {
    return <p className="text-sm text-slate-500">No skills listed.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-2">Skill</th>
            <th className="px-4 py-2">Unit</th>
            <th className="px-4 py-2">Cost</th>
            <th className="px-4 py-2">Workers</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.id} className="border-t border-slate-200 dark:border-slate-800">
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
