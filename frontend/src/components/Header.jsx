import { useCallback, useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import api from "../api/client"
import useAuth from "../context/useAuth"
import RatingRingAvatar from "./RatingRingAvatar"

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [openDropdown, setOpenDropdown] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")
  const [openNotificationMenuId, setOpenNotificationMenuId] = useState(null)
  const [actionNotificationId, setActionNotificationId] = useState(null)
  const [headerProfileRating, setHeaderProfileRating] = useState(null)

  useEffect(() => {
    setOpenDropdown(null)
  }, [location])

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      setNotifications([])
      setNotificationsError("")
      return
    }

    if (!silent) {
      setLoadingNotifications(true)
      setNotificationsError("")
    }
    try {
      const { data } = await api.get("/notifications/")
      const list = Array.isArray(data) ? data : []
      const sortedList = [...list].sort((a, b) => {
        const left = new Date(a?.created_at || 0).getTime()
        const right = new Date(b?.created_at || 0).getTime()
        return right - left
      })
      setNotifications(sortedList)
    } catch (error) {
      console.error("Failed to load notifications:", error)
      if (!silent) {
        setNotificationsError("Could not load notifications right now.")
      }
    } finally {
      if (!silent) {
        setLoadingNotifications(false)
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchNotifications()
  }, [isAuthenticated, fetchNotifications])

  useEffect(() => {
    if (!isAuthenticated || !Number(user?.id)) {
      setHeaderProfileRating(null)
      return
    }

    let active = true
    const loadHeaderProfileRating = async () => {
      try {
        const asArray = (value) => {
          if (Array.isArray(value)) return value
          if (Array.isArray(value?.results)) return value.results
          return []
        }

        const [profileRes, ratingRes, postRes] = await Promise.all([
          api.get('/users/profile/'),
          api.get('/ratings/'),
          api.get('/posts/'),
        ])

        const profileData = profileRes?.data || {}
        const ratingRows = asArray(ratingRes?.data)
        const posts = asArray(postRes?.data)
        const myProviderId = Number(user.id)

        const profileFieldRating = Number(
          profileData?.profile_rating ?? profileData?.average_rating ?? profileData?.rating,
        )

        const ownedPostIds = new Set(
          posts
            .filter((post) => Number(post?.owner_id ?? post?.owner) === myProviderId)
            .map((post) => Number(post?.id))
            .filter((id) => Number.isFinite(id) && id > 0),
        )

        const receivedRatings = ratingRows.filter((entry) => {
          const providerId = Number(entry?.provider)
          const postId = Number(entry?.post)
          return (
            providerId === myProviderId
            || (ownedPostIds.has(postId) && providerId === myProviderId)
          )
        })

        if (!active) return

        if (Number.isFinite(profileFieldRating) && profileFieldRating > 0) {
          setHeaderProfileRating(profileFieldRating)
          return
        }

        if (!receivedRatings.length) {
          setHeaderProfileRating(0)
          return
        }

        const total = receivedRatings.reduce(
          (sum, entry) => sum + Number(entry?.rating_value || 0),
          0,
        )
        setHeaderProfileRating(total / receivedRatings.length)
      } catch (error) {
        console.error('Failed to load header profile rating:', error)
      }
    }

    loadHeaderProfileRating()

    return () => {
      active = false
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (openDropdown === "notif") {
      fetchNotifications()
      return
    }
    setOpenNotificationMenuId(null)
  }, [openDropdown, fetchNotifications])

  useEffect(() => {
    if (!isAuthenticated) return

    const intervalId = window.setInterval(() => {
      fetchNotifications({ silent: true })
    }, 5000)

    const handleFocusRefresh = () => {
      fetchNotifications({ silent: true })
    }

    const handleNotificationRefresh = () => {
      fetchNotifications({ silent: true })
    }

    window.addEventListener("focus", handleFocusRefresh)
    window.addEventListener("localix:notifications-refresh", handleNotificationRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocusRefresh)
      window.removeEventListener("localix:notifications-refresh", handleNotificationRefresh)
    }
  }, [isAuthenticated, fetchNotifications])

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
    if (!value) return "Unknown time"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "Unknown time"

    return parsed.toLocaleString()
  }

  const getVisibleNotificationMessage = (value) => {
    const text = String(value || "")
    // Keep link payload for routing, but remove it from visible notification copy.
    return text.replace(/\s*post\s+link:\s*[^\s]+\s*/i, " ").replace(/\s{2,}/g, " ").trim()
  }

  const handleMarkAllAsRead = async () => {
    const unreadItems = notifications.filter((item) => item && !item.is_read)
    if (!unreadItems.length) return

    try {
      await Promise.all(
        unreadItems.map((item) => api.patch(`/notifications/${item.id}/`, { is_read: true })),
      )

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        })),
      )
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
      setNotificationsError("Could not mark notifications as read.")
    }
  }

  const handleToggleNotificationMenu = (notificationId) => {
    setOpenNotificationMenuId((prev) => (prev === notificationId ? null : notificationId))
  }

  const handleMarkAsUnread = async (notificationId) => {
    setActionNotificationId(notificationId)
    try {
      await api.patch(`/notifications/${notificationId}/`, { is_read: false })
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: false,
              }
            : item,
        ),
      )
    } catch (error) {
      console.error("Failed to mark notification as unread:", error)
      setNotificationsError("Could not update this notification.")
    } finally {
      setOpenNotificationMenuId(null)
      setActionNotificationId(null)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    setActionNotificationId(notificationId)
    try {
      await api.delete(`/notifications/${notificationId}/`)
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId))
    } catch (error) {
      console.error("Failed to delete notification:", error)
      setNotificationsError("Could not delete this notification.")
    } finally {
      setOpenNotificationMenuId(null)
      setActionNotificationId(null)
    }
  }

  const isConnectionRequestNotification = (item) => {
    const title = String(item?.title || "").toLowerCase()
    return title.includes("connection request")
  }

  const getNotificationTarget = (item) => {
    const title = String(item?.title || "").toLowerCase()
    const message = String(item?.message || "")
    const messageLower = message.toLowerCase()

    // Prefer an explicit in-message link when available.
    const postLinkMatch = message.match(/post\s+link:\s*([^\s]+)/i)
    if (postLinkMatch && postLinkMatch[1]) {
      return postLinkMatch[1].trim()
    }

    if (title.includes("connection request") || messageLower.includes("connection request")) {
      return "/connections"
    }

    const erpIdMatch = message.match(/erp\s*#\s*(\d+)/i)
    if (erpIdMatch && erpIdMatch[1]) {
      return `/erp?erp_id=${erpIdMatch[1]}`
    }

    if (title.includes("erp") || messageLower.includes("erp")) {
      return "/erp"
    }

    if (title.includes("cart") || messageLower.includes("cart")) {
      return "/cart"
    }

    return "/dashboard"
  }

  const handleNotificationClick = (item) => {
    const target = getNotificationTarget(item)
    if (!target) return

    if (String(target).startsWith("http://") || String(target).startsWith("https://")) {
      window.open(target, "_blank", "noopener,noreferrer")
      return
    }

    setOpenDropdown(null)
    navigate(target)
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
  const fallbackProfileRating = Number(user?.profile_rating ?? user?.average_rating ?? user?.rating)
  const profileRatingValue = Number.isFinite(headerProfileRating)
    ? headerProfileRating
    : Number.isFinite(fallbackProfileRating)
      ? fallbackProfileRating
      : null

  const iconButtonClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-md transition-all duration-200 hover:scale-105 hover:bg-orange-100 hover:shadow-lg"
  const hamburgerButtonClass =
    "inline-flex shrink-0 items-center justify-center bg-transparent p-0 text-white [text-shadow:0_0_10px_rgba(255,255,255,0.75)] transition-all duration-200 hover:scale-105 hover:text-yellow-200 hover:[text-shadow:0_0_14px_rgba(255,255,255,0.9)] focus-visible:outline-none"

  const avatarButtonClass =
    "h-10 w-10 shrink-0 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center justify-center"

  const dropdownPanelClass =
    "absolute right-0 mt-3 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-2xl backdrop-blur-sm"

  const dropdownItemClass =
    "block rounded-xl border border-white/65 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/80 hover:text-orange-700"

  const getSidebarItemClass = (path) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`)
    if (isActive) {
      return "block rounded-xl border border-violet-300 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
    }
    return "block rounded-xl border border-white/65 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/80 hover:text-orange-700"
  }

  const logoSlotClass = "group relative z-10 ml-[10px] flex h-10 w-52 shrink-0 items-center md:w-60 lg:w-64"

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
      <div className="relative mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className={logoSlotClass} aria-label="Localix home">
          <img
            src="/images/logo.png"
            alt="Localix logo"
            className="pointer-events-none h-full w-full origin-left object-contain object-left drop-shadow-md transition-transform duration-200 [transform:scale(1.74)] group-hover:[transform:scale(1.8)]"
          />
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
        <div className="relative z-10 ml-auto flex items-center gap-3 md:translate-x-2 lg:translate-x-3">
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
                <div
                  className={`${dropdownPanelClass} w-72`}
                  onClick={(event) => {
                    const target = event.target
                    if (!(target instanceof Element)) return
                    if (
                      target.closest("[data-notification-menu-root]") ||
                      target.closest("[data-notification-menu-button]")
                    ) {
                      return
                    }
                    setOpenNotificationMenuId(null)
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 px-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</p>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      disabled={unreadCount === 0 || loadingNotifications}
                      className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark all as read
                    </button>
                  </div>

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
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              handleNotificationClick(item)
                            }
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            item?.is_read
                              ? "border-slate-200 bg-slate-50 text-slate-600"
                              : "border-violet-200 bg-violet-50 text-slate-700"
                          } cursor-pointer transition hover:border-violet-300 hover:bg-violet-100`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-800">{item.title || "Notification"}</p>
                            <div
                              className="relative"
                              data-notification-menu-root
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleToggleNotificationMenu(item.id)
                                }}
                                disabled={actionNotificationId === item.id}
                                className="rounded-full px-2 py-0.5 text-base font-bold text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Notification options"
                                data-notification-menu-button
                              >
                                ...
                              </button>

                              {openNotificationMenuId === item.id && (
                                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsUnread(item.id)}
                                    disabled={actionNotificationId === item.id}
                                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Mark as unread
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNotification(item.id)}
                                    disabled={actionNotificationId === item.id}
                                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Delete notification
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-0.5 text-xs">{getVisibleNotificationMessage(item.message)}</p>
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
                className={`${avatarButtonClass} ${avatarSrc ? "" : "bg-white/90 hover:bg-orange-100"}`}
              >
                {avatarSrc ? (
                  <RatingRingAvatar
                    src={avatarSrc}
                    alt="Profile"
                    rating={Number.isFinite(profileRatingValue) ? profileRatingValue : null}
                    size={40}
                    ringWidth={2}
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
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 -translate-x-[20px]">
              <Link
                to="/login"
                className="header-auth-btn rounded-full border border-white/50 bg-white/95 px-5 py-2 text-sm font-semibold text-indigo-600 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="header-auth-btn rounded-full border border-yellow-300 bg-yellow-400 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500"
                style={{ color: '#ffffff' }}
              >
                Register
              </Link>
            </div>
          )}

          {/* Hamburger */}
          {isAuthenticated && (
            <div className="relative" data-header-dropdown>
              <button
                onClick={() => toggleDropdown("menu")}
                className={`hamburger-icon-btn ${hamburgerButtonClass}`}
                aria-label="Open navigation menu"
                aria-expanded={openDropdown === "menu"}
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M3.5 6.5h17" />
                  <path d="M3.5 12h17" />
                  <path d="M3.5 17.5h17" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && openDropdown === "menu" && (
        <div className="fixed inset-0 z-50" data-header-dropdown>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setOpenDropdown(null)}
            aria-label="Close navigation menu overlay"
          />

          <aside className="absolute right-0 top-0 h-full w-[300px] max-w-[86vw] border-l border-white/35 bg-gradient-to-b from-pink-300/42 via-fuchsia-200/34 to-violet-300/42 p-4 shadow-2xl backdrop-blur-md">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_52%)]" />
            <div className="pointer-events-none absolute -left-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -bottom-8 h-20 w-20 rounded-full bg-fuchsia-200/38 blur-2xl" />

            <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-extrabold tracking-wide text-orange-900">Menu</p>
              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-200 bg-white text-lg text-violet-700 transition hover:bg-violet-100"
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>
            <nav className="space-y-2">
              <Link
                to="/cart"
                onClick={() => setOpenDropdown(null)}
                className={getSidebarItemClass("/cart")}
              >
                Your Cart
              </Link>
              <Link
                to="/erp"
                onClick={() => setOpenDropdown(null)}
                className={getSidebarItemClass("/erp")}
              >
                ERP
              </Link>
              <Link
                to="/connections"
                onClick={() => setOpenDropdown(null)}
                className={getSidebarItemClass("/connections")}
              >
                Connections
              </Link>
              <Link
                to="/help-centre"
                onClick={() => setOpenDropdown(null)}
                className={getSidebarItemClass("/help-centre")}
              >
                Help Centre
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null)
                  handleLogout()
                }}
                className="w-full rounded-xl border border-white/65 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-[#ff0000] transition hover:border-orange-200 hover:bg-orange-50/80 hover:text-[#ff0000]"
              >
                Logout
              </button>
            </nav>
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}