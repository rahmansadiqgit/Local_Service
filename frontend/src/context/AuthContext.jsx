/*
Hook	Analogy	Purpose
useState	Notebook	Store and update local data
useEffect	Personal assistant	Perform side-effects after render
createContext/useContext	Bulletin board	Share data globally across components
useCallback	Shortcut	Keep function from being recreated
useMemo	Smart calculator	Keep calculation result from recalculating
*/



import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) { // Think of AuthProvider as a security gate — anything inside it gets access to user info and authentication functions.
  const [user, setUser] = useState(null) // stores current logged-in user data
  const [loading, setLoading] = useState(true) // indicates whether the app is fetching user info (used to show a spinner/loading state). Initially true.

  const isAuthenticated = Boolean(user) // Returns true if logged in, false otherwise.
  //useCallback → memoizes the function, so it doesn’t get recreated every render
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get('/auth/me/')
      setUser(data)
    } catch (error) {
      console.error(error)
      setUser(null)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('accessToken', data.access)
    localStorage.setItem('refreshToken', data.refresh)
    await loadUser()
  }, [loadUser])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated, loading, login, logout, refreshUser: loadUser }),
    [user, isAuthenticated, loading, login, logout, loadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
