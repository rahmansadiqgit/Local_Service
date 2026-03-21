import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import useAuth from './useAuth'

const CartContext = createContext(null)

const CART_STORAGE_PREFIX = 'localix_cart_items'

const getStorageKey = (userId) =>
  userId ? `${CART_STORAGE_PREFIX}_${userId}` : `${CART_STORAGE_PREFIX}_guest`

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])

  const storageKey = useMemo(() => getStorageKey(user?.id), [user?.id])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setItems(Array.isArray(parsed) ? parsed : [])
    } catch (error) {
      console.error('Could not load cart items:', error)
      setItems([])
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items, storageKey])

  const addToCart = useCallback((post, metadata = {}) => {
    if (!post?.id) return false

    let added = false
    setItems((prev) => {
      if (prev.some((item) => item.post?.id === post.id)) {
        return prev
      }

      added = true
      return [
        ...prev,
        {
          post,
          metadata,
          addedAt: new Date().toISOString(),
        },
      ]
    })

    return added
  }, [])

  const removeFromCart = useCallback((postId) => {
    setItems((prev) => prev.filter((item) => item.post?.id !== postId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const isInCart = useCallback(
    (postId) => items.some((item) => item.post?.id === postId),
    [items],
  )

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, clearCart, isInCart }),
    [items, addToCart, removeFromCart, clearCart, isInCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartContext }
