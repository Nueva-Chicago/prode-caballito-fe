import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string, refreshToken: string) => void
  updateUser: (partial: Partial<User>) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })(),
  token: localStorage.getItem('token'),

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  updateUser: (partial) => {
    const updated = { ...get().user, ...partial } as User
    localStorage.setItem('user', JSON.stringify(updated))
    set({ user: updated })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  isAdmin: () => get().user?.rol === 'admin',
}))
