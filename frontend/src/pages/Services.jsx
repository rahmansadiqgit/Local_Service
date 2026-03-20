import { Link } from 'react-router-dom'

const serviceGroups = [
  {
    title: 'Home Services',
    subtitle: 'Trusted day-to-day help available around your neighborhood.',
    items: [
      { label: 'Electrician', icon: '⚡' },
      { label: 'Plumbing', icon: '🔧' },
      { label: 'Cleaning', icon: '🧹' },
      { label: 'AC Repair', icon: '❄️' },
      { label: 'Home Painting', icon: '🖌️' },
      { label: 'Appliance Repair', icon: '🛠️' },
    ],
  },
  {
    title: 'Education & Skills',
    subtitle: 'Learning and mentoring services to boost your growth.',
    items: [
      { label: 'Private Tutoring', icon: '📘' },
      { label: 'Language Practice', icon: '🗣️' },
      { label: 'Computer Training', icon: '💻' },
      { label: 'Career Mentoring', icon: '🎯' },
      { label: 'Exam Preparation', icon: '📝' },
      { label: 'Music Lessons', icon: '🎵' },
    ],
  },
  {
    title: 'Business Support',
    subtitle: 'Practical support services for local shops and startups.',
    items: [
      { label: 'Digital Marketing', icon: '📣' },
      { label: 'Graphic Design', icon: '🎨' },
      { label: 'Accounting Support', icon: '📊' },
      { label: 'Delivery Assistance', icon: '🚚' },
      { label: 'Social Media Management', icon: '📱' },
      { label: 'Printing Services', icon: '🖨️' },
    ],
  },
]

export default function Services() {
  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-3.5 pr-40 sm:px-8 sm:py-4 sm:pr-44 lg:pr-48">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl">Services</h2>
            <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Explore popular service categories available in Localix.</p>
          </div>
          <img
            src="/images/services.png"
            alt="Services header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-36 w-36 -translate-y-1/2 object-contain sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {serviceGroups.map((group) => (
          <article
            key={group.title}
            className="card border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/40"
          >
            <h3 className="text-lg font-bold text-violet-900">{group.title}</h3>
            <p className="mt-1 text-xs text-slate-600">{group.subtitle}</p>
            <ul className="mt-4 flex flex-wrap gap-2.5 text-sm">
              {group.items.map((item) => (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="card border border-violet-200/80 bg-gradient-to-r from-violet-100/65 via-white to-fuchsia-100/65">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-700">
            Ready to request or provide a service?
          </p>
          <Link
            to="/create-post"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 hover:!text-white"
          >
            Create Post
          </Link>
        </div>
      </section>
    </div>
  )
}
