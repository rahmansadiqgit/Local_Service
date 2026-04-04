export default function ERPHeader() {
  return (
    <div className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
      <div className="relative px-6 py-3.5 pr-36 sm:px-8 sm:py-4 sm:pr-40 lg:pr-44">
        <div>
          <h2
            className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl"
            style={{ fontFamily: "'Sora', 'Trebuchet MS', sans-serif" }}
          >
            Process Tracker
          </h2>
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">Monitor and manage your tasks.</p>
        </div>
        <img
          src="/images/erp.png"
          alt="ERP header illustration"
          className="pointer-events-none absolute right-4 top-1/2 h-32 w-32 -translate-y-1/2 object-contain sm:h-36 sm:w-36 lg:h-40 lg:w-40"
        />
      </div>
    </div>
  )
}
