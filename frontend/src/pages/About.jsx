export default function About() {
  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-4 sm:px-8 sm:py-5">
          <h2 className="text-2xl font-extrabold tracking-tight text-violet-900 sm:text-3xl">About Localix</h2>
          <p className="mt-1 text-sm text-violet-800/80">Connecting local people with local opportunities.</p>
        </div>
      </section>

      <section className="card border border-orange-200/70 bg-gradient-to-br from-white to-orange-50/70">
        <h3 className="text-lg font-bold text-slate-900">Our Mission</h3>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Localix helps people quickly discover trusted services nearby and helps providers promote their work.
          We focus on simple communication, transparent service posts, and practical local collaboration.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border border-slate-200">
          <h4 className="text-base font-bold text-slate-900">Discover</h4>
          <p className="mt-2 text-sm text-slate-600">Find nearby service providers by category, location, and rating.</p>
        </article>
        <article className="card border border-slate-200">
          <h4 className="text-base font-bold text-slate-900">Connect</h4>
          <p className="mt-2 text-sm text-slate-600">Connect directly through posts and build trusted local networks.</p>
        </article>
        <article className="card border border-slate-200">
          <h4 className="text-base font-bold text-slate-900">Grow</h4>
          <p className="mt-2 text-sm text-slate-600">Grow your local business visibility through consistent service updates.</p>
        </article>
      </section>
    </div>
  )
}
