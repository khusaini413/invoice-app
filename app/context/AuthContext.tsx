'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface User {
  id: string
  username: string
  role: string
  store_id: string
  full_name: string
}

interface AuthContextType {
  user: User | null
  login: (storeCode: string, username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (storeCode: string, username: string, password: string) => {
    try {
      console.log('Mencari store dengan kode:', storeCode)
      
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('store_code', storeCode)
        .maybeSingle()

      if (storeError || !store) {
        console.error('Store tidak ditemukan')
        return false
      }

      console.log('Store ditemukan:', store)

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('store_id', store.id)
        .eq('username', username)
        .maybeSingle()

      if (userError || !userData) {
        console.error('User tidak ditemukan')
        return false
      }

      console.log('User ditemukan:', userData.username)

      // Verifikasi password SEDERHANA (karena hash di database adalah plain text)
      // Untuk sementara, semua user pakai password "password123"
      const isValidPassword = (password === 'password123')

      if (!isValidPassword) {
        console.error('Password salah')
        return false
      }

      const loggedUser = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        store_id: userData.store_id,
        full_name: userData.full_name
      }
      
      setUser(loggedUser)
      localStorage.setItem('user', JSON.stringify(loggedUser))
      console.log('Login berhasil!')
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)