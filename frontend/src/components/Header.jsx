import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import useAuth from "../context/useAuth"
import api from "../api/client"

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [openDropdown, setOpenDropdown] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")

  useEffect(() => {
    setOpenDropdown(null)
  }, [location])

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setNotificationsError("")
      return
    }

    setLoadingNotifications(true)
    setNotificationsError("")
    try {
      const { data } = await api.get("/notifications/")
      const list = Array.isArray(data) ? data : []
      setNotifications(list)
    } catch (error) {
      console.error("Failed to load notifications:", error)
      setNotificationsError("Could not load notifications right now.")
    } finally {
      setLoadingNotifications(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchNotifications()
  }, [isAuthenticated, fetchNotifications])

  useEffect(() => {
    if (openDropdown === "notif") {
      fetchNotifications()
    }
  }, [openDropdown, fetchNotifications])

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return

      if (!target.closest("[data-header-dropdown]")) {
        setOpenDropdown(null)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

  const unreadCount = notifications.filter((item) => !item?.is_read).length

  const formatNotificationTime = (value) => {
    if (!value) return ""
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toLocaleString()
  }

  const resolveMediaUrl = (value) => {
    if (!value) return ""
    if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
      return value
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
    const backendOrigin = apiBase.replace(/\/api\/?$/, "")
    return value.startsWith("/") ? `${backendOrigin}${value}` : `${backendOrigin}/${value}`
  }

  const avatarUrl = resolveMediaUrl(user?.profile_photo)
  const avatarSrc = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${user?._avatarVersion || 0}`
    : ""

  const iconButtonClass =
    "rounded-full bg-white/90 p-2 shadow-md hover:bg-yellow-100 hover:scale-105 hover:shadow-lg transition-all duration-200"

  const avatarButtonClass =
    "h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center justify-center"

  const dropdownPanelClass =
    "absolute right-0 mt-3 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-2xl backdrop-blur-sm"

  const dropdownItemClass =
    "block rounded-xl px-4 py-2.5 text-sm font-semibold !text-slate-700 transition hover:bg-violet-100 hover:!text-violet-700"

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 font-extrabold shadow-md transition-transform group-hover:scale-110">
            LX
          </div>
        </Link>

        {/* Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <Link to="/" className="cursor-pointer">
            <p className="text-4xl md:text-5xl font-extrabold text-white tracking-wide drop-shadow-lg hover:text-yellow-300 transition">
              Localix
            </p>
            <p className="text-sm md:text-base text-white/85">Local services marketplace</p>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative" data-header-dropdown>
              <button
                onClick={() => toggleDropdown("notif")}
                className={`${iconButtonClass} relative inline-flex items-center justify-center`}
              >
                🔔
              </button>
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -left-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {openDropdown === "notif" && (
                <div className={`${dropdownPanelClass} w-72`}>
                  <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</p>

                  {loadingNotifications ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Loading...</div>
                  ) : notificationsError ? (
                    <div className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">{notificationsError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">No new notifications</div>
                  ) : (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {notifications.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            item?.is_read
                              ? "border-slate-200 bg-slate-50 text-slate-600"
                              : "border-violet-200 bg-violet-50 text-slate-700"
                          }`}
                        >
                          <p className="font-semibold text-slate-800">{item.title || "Notification"}</p>
                          <p className="mt-0.5 text-xs">{item.message || ""}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatNotificationTime(item.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Dropdown with Avatar */}
          {isAuthenticated ? (
            <div className="relative" data-header-dropdown>
              <button
                onClick={() => toggleDropdown("user")}
                className={`${avatarButtonClass} ${avatarSrc ? "" : "bg-white/90 hover:bg-yellow-100"}`}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="block h-full w-full rounded-full object-cover object-center"
                  />
                ) : (
                  <span className="text-lg leading-none">👤</span>
                )}
              </button>

              {openDropdown === "user" && (
                <div className={`${dropdownPanelClass} w-48`}>
                  <Link
                    to="/profile"
                    onClick={() => setOpenDropdown(null)}
                    className={dropdownItemClass}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpenDropdown(null)}
                    className={dropdownItemClass}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-violet-100 hover:text-violet-700"
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
                className="header-auth-btn rounded-full border border-white/50 bg-white/95 px-5 py-2 text-sm font-semibold text-indigo-600 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="header-auth-btn rounded-full border border-yellow-300 bg-yellow-400 px-5 py-2 text-sm font-bold text-slate-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500"
              >
                Register
              </Link>
            </>
          )}

          {/* Hamburger */}
          {isAuthenticated && (
            <div className="relative" data-header-dropdown>
              <button
                onClick={() => toggleDropdown("menu")}
                className={iconButtonClass}
              >
                ☰
              </button>
              {openDropdown === "menu" && (
                <div className={`${dropdownPanelClass} w-56`}>
                  <Link
                    to="/connections"
                    onClick={() => setOpenDropdown(null)}
                    className={dropdownItemClass}
                  >
                    Connections
                  </Link>
                  <Link
                    to="/erp"
                    onClick={() => setOpenDropdown(null)}
                    className={dropdownItemClass}
                  >
                    ERP
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setOpenDropdown(null)}
                    className={dropdownItemClass}
                  >
                    Your Cart
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}