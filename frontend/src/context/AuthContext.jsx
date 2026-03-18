import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = Boolean(user)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const stamp = Date.now()
      const { data } = await api.get('/auth/me/', {
        params: { t: stamp },
      })
      setUser({
        ...data,
        _avatarVersion: stamp,
      })
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

  const login = useCallback(
    async ({ email, password }) => {
      const { data } = await api.post('/auth/login/', { email, password })
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      await loadUser()
    },
    [loadUser]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async (nextUser = null) => {
    if (nextUser) {
      setUser({
        ...nextUser,
        _avatarVersion: Date.now(),
      })
      return
    }
    await loadUser()
  }, [loadUser])

  const value = useMemo(
    () => ({ user, isAuthenticated, loading, login, logout, refreshUser }),
    [user, isAuthenticated, loading, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }