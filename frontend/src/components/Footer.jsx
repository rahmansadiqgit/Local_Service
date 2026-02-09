export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 Localix. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-500">
            Privacy
          </a>
          <a href="#" className="hover:text-brand-500">
            Terms
          </a>
          <a href="#" className="hover:text-brand-500">
            Support
          </a>
        </div>
      </div>
    </footer>
  )
}
