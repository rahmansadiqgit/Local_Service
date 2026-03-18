import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import useAuth from "../context/useAuth"

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    setOpenDropdown(null)
  }, [location])

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
    "block rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"

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
                className={iconButtonClass}
              >
                🔔
              </button>
              {openDropdown === "notif" && (
                <div className={`${dropdownPanelClass} w-72`}>
                  <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</p>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    No new notifications
                  </div>
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
                    className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
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
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-md hover:bg-yellow-100 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-pink-700 transition"
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}