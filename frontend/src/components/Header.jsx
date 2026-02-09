import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white">
            Lx
          </div>
          <div>
            <p className="text-lg font-semibold">Localix</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Local services marketplace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600">
            New Post
          </button>
        </div>
      </div>
    </header>
  )
}
