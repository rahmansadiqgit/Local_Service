import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuth from '../context/useAuth'
import NotificationPanel from './NotificationPanel'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const notifRef = useRef(null)
  const userRef = useRef(null)
  const menuRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const { data } = await api.get('/notifications/')
      setNotifications(data)
    } catch (error) {
      console.error(error)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 20000)
    return () => clearInterval(interval)
  }, [isAuthenticated, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false)
      if (!userRef.current?.contains(e.target)) setUserOpen(false)
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markRead = async (note) => {
    if (note.is_read) return
    try {
      await api.patch(`/notifications/${note.id}/`, { is_read: true })
      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = () => {
    logout()
    setNotifications([])
    setUserOpen(false)
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

        {/* Left: Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white font-bold">
            LX
          </div>
        </Link>

        {/* Center: Localix + subtitle */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <Link to="/" className="cursor-pointer">
            <p className="text-2xl font-bold hover:text-brand-500">Localix</p>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
              Local services marketplace
            </p>
          </Link>
        </div>

        {/* Right side: Notifications, User, Menu */}
        <div className="flex items-center gap-3">

          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <span className="sr-only">Notifications</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 18a2 2 0 0 1-4 0m-2-2h8m-9-4V9a5 5 0 0 1 10 0v3l1.5 2a1 1 0 0 1-.86 1.5H6.36a1 1 0 0 1-.86-1.5L7 12Z"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                  <NotificationPanel
                    notifications={notifications}
                    compact
                    title="Recent"
                    onRefresh={loadNotifications}
                    onMarkRead={markRead}
                  />
                </div>
              )}
            </div>
          )}

          {/* User dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setUserOpen((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {user?.name || user?.username || 'Account'}
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                  <Link
                    to="/profile"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600"
              >
                Register
              </Link>
            </>
          )}

          {/* Hamburger menu */}
          {isAuthenticated && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                  <Link
                    to="/connections"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Connections
                  </Link>
                  <Link
                    to="/erp"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    ERP
                  </Link>
                  <div className="mt-1 px-2">
                    {/* ThemeToggle now only toggles on user click */}
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}