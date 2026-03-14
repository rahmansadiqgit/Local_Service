import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import useAuth from "../context/useAuth"

export default function Header() {

  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">

      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

        {/* Logo Left */}
        <Link to="/" className="flex items-center group">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 font-extrabold shadow-md transition-transform group-hover:scale-110">
            LX
          </div>

        </Link>

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">

          <Link to="/" className="cursor-pointer">

            <p className="text-3xl md:text-4xl font-extrabold text-white tracking-wide drop-shadow-lg hover:text-yellow-300 transition">
              Localix
            </p>

            <p className="text-xs md:text-sm text-white/80">
              Local services marketplace
            </p>

          </Link>

        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">

          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative">

              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-yellow-100 transition"
              >
                🔔
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-xl bg-white shadow-xl p-4">

                  <p className="font-semibold text-slate-700 mb-2">
                    Notifications
                  </p>

                  <p className="text-sm text-slate-500">
                    No new notifications
                  </p>

                </div>
              )}

            </div>
          )}

          {/* User Dropdown */}
          {isAuthenticated ? (

            <div className="relative">

              <button
                onClick={() => setUserOpen(!userOpen)}
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-md hover:bg-yellow-100 transition"
              >
                {user?.name || user?.username || "Account"}
              </button>

              {userOpen && (

                <div className="absolute right-0 mt-3 w-44 rounded-xl bg-white shadow-xl">

                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-slate-100"
                    onClick={() => setUserOpen(false)}
                  >
                    Profile
                  </Link>

                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 hover:bg-slate-100"
                    onClick={() => setUserOpen(false)}
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

          {/* Hamburger Menu */}
          {isAuthenticated && (
            <div className="relative">

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-yellow-100 transition"
              >
                ☰
              </button>

              {menuOpen && (

                <div className="absolute right-0 mt-3 w-52 rounded-xl bg-white shadow-xl">

                  <Link
                    to="/connections"
                    className="block px-4 py-2 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Connections
                  </Link>

                  <Link
                    to="/erp"
                    className="block px-4 py-2 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
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