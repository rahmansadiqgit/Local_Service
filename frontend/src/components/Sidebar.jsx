import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home / Feed' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/create-post', label: 'Create Post' },
  { to: '/manage-post', label: 'Manage Post' },
  { to: '/connections', label: 'Connections' },
  { to: '/erp', label: 'ERP' },
]

export default function Sidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950 lg:block">
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
              }`
            }
          >
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
