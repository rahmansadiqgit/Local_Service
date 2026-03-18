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
            <p className="text-3xl md:text-4xl font-extrabold text-white tracking-wide drop-shadow-lg hover:text-yellow-300 transition">
              Localix
            </p>
            <p className="text-xs md:text-sm text-white/80">Local services marketplace</p>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("notif")}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-yellow-100 transition"
              >
                🔔
              </button>
              {openDropdown === "notif" && (
                <div className="absolute right-0 mt-3 w-72 rounded-xl bg-white shadow-xl p-4">
                  <p className="font-semibold text-slate-700 mb-2">Notifications</p>
                  <p className="text-sm text-slate-500">No new notifications</p>
                </div>
              )}
            </div>
          )}

          {/* User Dropdown with Avatar */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("user")}
                className="h-10 w-10 overflow-hidden rounded-full bg-white/90 shadow-md hover:bg-yellow-100 transition flex items-center justify-center"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg leading-none">👤</span>
                )}
              </button>

              {openDropdown === "user" && (
                <div className="absolute right-0 mt-3 w-44 rounded-xl bg-white shadow-xl">
                  <Link
                    to="/profile"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-2 hover:bg-slate-100"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-2 hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
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
            <div className="relative">
              <button
                onClick={() => toggleDropdown("menu")}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-yellow-100 transition"
              >
                ☰
              </button>
              {openDropdown === "menu" && (
                <div className="absolute right-0 mt-3 w-52 rounded-xl bg-white shadow-xl">
                  <Link
                    to="/connections"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-2 hover:bg-slate-100"
                  >
                    Connections
                  </Link>
                  <Link
                    to="/erp"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-2 hover:bg-slate-100"
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