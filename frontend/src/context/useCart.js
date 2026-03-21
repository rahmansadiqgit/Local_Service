import { useContext } from 'react'
import { CartContext } from './CartContext'

export default function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
