const people = [
  { name: 'Ayesha Khan', role: 'Skilled Person', location: 'Dhaka' },
  { name: 'Mehedi Hasan', role: 'Business', location: 'Chattogram' },
  { name: 'Rafi Ahmed', role: 'Customer', location: 'Sylhet' },
]

export default function Connections() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Connections</h2>
        <p className="text-sm text-slate-500">Manage your Localix network.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {people.map((person) => (
          <div key={person.name} className="card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                {person.name
                  .split(' ')
                  .map((word) => word[0])
                  .join('')}
              </div>
              <div>
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs text-slate-500">{person.role}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{person.location}</p>
            <button className="mt-4 w-full rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300">
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
