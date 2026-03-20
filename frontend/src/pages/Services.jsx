import { Link } from 'react-router-dom'

const serviceGroups = [
  {
    title: 'Home Services',
    items: ['Electrician', 'Plumbing', 'Cleaning', 'AC Repair'],
  },
  {
    title: 'Education & Skills',
    items: ['Private Tutoring', 'Language Practice', 'Computer Training', 'Career Mentoring'],
  },
  {
    title: 'Business Support',
    items: ['Digital Marketing', 'Graphic Design', 'Accounting Support', 'Delivery Assistance'],
  },
]

export default function Services() {
  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-4 sm:px-8 sm:py-5">
          <h2 className="text-2xl font-extrabold tracking-tight text-violet-900 sm:text-3xl">Services</h2>
          <p className="mt-1 text-sm text-violet-800/80">Explore popular service categories available in Localix.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {serviceGroups.map((group) => (
          <article key={group.title} className="card border border-orange-200/80 bg-gradient-to-br from-white to-orange-50/70">
            <h3 className="text-lg font-bold text-orange-900">{group.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {group.items.map((item) => (
                <li key={item} className="rounded-lg border border-orange-100 bg-white px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="card border border-slate-200">
        <p className="text-sm text-slate-600">
          Ready to request or provide a service?
          <Link to="/create-post" className="ml-1 font-semibold text-orange-700 hover:text-orange-800">
            Create your post.
          </Link>
        </p>
      </section>
    </div>
  )
}
