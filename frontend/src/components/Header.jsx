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
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const dropdownRef = useRef(null)
  const userRef = useRef(null)
  const moreRef = useRef(null)

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
    const timeoutId = setTimeout(() => {
      void loadNotifications()
    }, 0)
    const intervalId = setInterval(() => {
      void loadNotifications()
    }, 20000)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [isAuthenticated, loadNotifications])

  useEffect(() => {
    const handleClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false)
      }
      if (!userRef.current?.contains(event.target)) {
        setUserOpen(false)
      }
      if (!moreRef.current?.contains(event.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = notifications.filter((note) => !note.is_read).length

  const markRead = async (note) => {
    if (note.is_read) return
    try {
      await api.patch(`/notifications/${note.id}/`, { is_read: true })
      setNotifications((prev) =>
        prev.map((item) => (item.id === note.id ? { ...item, is_read: true } : item)),
      )
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = () => {
    setOpen(false)
    setUserOpen(false)
    setMoreOpen(false)
    setNotifications([])
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white">
            Lx
          </div>
          <div>
            <p className="text-lg font-semibold">Localix</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Local services marketplace
            </p>
          </div>
        </Link>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
          {isAuthenticated && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
              {open && (
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
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  More
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
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
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  More
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
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
                  </div>
                )}
              </div>
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
        </div>
      </div>
    </header>
  )
}
