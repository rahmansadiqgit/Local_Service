import { Link } from 'react-router-dom'

const features = [
  {
    icon: '/images/discover.jpg?v=2',
    title: 'Discover',
    description: 'Find nearby services easily.',
  },
  {
    icon: '/images/connect.avif?v=2',
    title: 'Connect',
    description: 'Build trusted local relationships.',
  },
  {
    icon: '/images/grow.avif?v=2',
    title: 'Grow',
    description: 'Expand your business visibility.',
  },
]

const whyChooseItems = [
  {
    title: 'Location-based Services',
    text: 'Get relevant providers and opportunities near your area.',
    badge: 'Local',
  },
  {
    title: 'Trusted Community',
    text: 'Build confidence through real users and transparent profiles.',
    badge: 'Trusted',
  },
  {
    title: 'Real-time Communication',
    text: 'Coordinate quickly with direct responses and updates.',
    badge: 'Live',
  },
  {
    title: 'Easy Discovery',
    text: 'Post, search, and connect without complicated steps.',
    badge: 'Simple',
  },
]

export default function About() {
  return (
    <div className="-mx-4 -mb-8 -mt-6 overflow-hidden sm:-mx-6 lg:-mx-10">
      <section className="relative overflow-hidden bg-[#efe6ff]">
        <img
          src="/images/about.png"
          alt="Localix community illustration"
          className="h-[300px] w-full object-cover object-right sm:h-[420px] lg:h-[520px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#efe6ff]/88 via-[#efe6ff]/46 to-transparent" />

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8 lg:px-14">
            <div className="max-w-xl space-y-4 md:space-y-5">
              <h2
                className="text-3xl font-extrabold tracking-tight text-violet-950 sm:text-5xl"
                style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
              >
                About Localix
              </h2>
              <p className="max-w-md text-base text-violet-900/85 sm:text-xl">
                Connecting local people with real opportunities.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold !text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-[0.99]"
                >
                  Get Started
                </Link>
                <Link
                  to="/services"
                  className="rounded-xl border border-violet-300 bg-white/88 px-6 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-white"
                >
                  Explore Services
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/95 px-5 py-12 text-center sm:px-8 lg:px-14">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="mx-auto flex w-fit items-center gap-3 text-violet-300">
            <span className="h-px w-12 bg-violet-300" />
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-500">Mission</span>
            <span className="h-px w-12 bg-violet-300" />
          </div>
          <p
            className="text-2xl leading-tight text-violet-950 sm:text-4xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            <span className="font-extrabold">Our mission</span> is to simplify how people connect with local services.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-[#efe7ff] via-[#f3edff] to-[#efe8ff] px-5 py-12 sm:px-8 lg:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_50%)]" />
        <div className="relative mx-auto max-w-screen-xl">
          <h3
            className="text-center text-3xl font-extrabold text-violet-950 sm:text-4xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Features
          </h3>
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-violet-200/70 bg-white/92 px-5 py-6 text-center shadow-md"
              >
                <img
                  src={feature.icon}
                  alt={`${feature.title} icon`}
                  className="mx-auto h-12 w-12 object-contain bg-transparent mix-blend-multiply"
                />
                <h4 className="mt-3 text-2xl font-extrabold text-violet-950" style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}>
                  {feature.title}
                </h4>
                <p className="mt-2 text-base text-violet-900/75">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/95 px-5 py-12 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-screen-xl">
          <h3
            className="text-center text-3xl font-extrabold text-violet-950 sm:text-4xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Why Choose Localix?
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-violet-900/70 sm:text-base">
            Designed to help people and providers connect faster, safer, and smarter.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-violet-200/70 bg-gradient-to-b from-white to-violet-50/85 p-5 shadow-sm"
              >
                <span className="inline-flex rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  {item.badge}
                </span>
                <h4 className="mt-3 text-lg font-extrabold text-violet-950" style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}>
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-violet-900/75">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#eeebf7]">
        <img
          src="/images/about_last.png"
          alt="Localix team"
          className="h-[160px] w-full object-cover object-[34%_68%] sm:h-[190px] lg:h-[220px]"
        />

        <div className="absolute inset-0 flex items-center justify-end px-4 sm:px-8 lg:px-14">
          <div className="w-[52%] text-right">
            <h3
              className="text-lg font-extrabold tracking-tight text-violet-950 sm:text-2xl lg:text-3xl"
              style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
            >
              Built by Passionate Developers
            </h3>
            <p className="mt-2 text-xs text-violet-900/85 sm:text-sm lg:text-base">
              Committed to solving real local problems with innovative solutions.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
