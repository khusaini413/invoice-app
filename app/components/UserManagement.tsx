'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'kasir',
    full_name: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('store_id', user?.store_id)
      .order('created_at')
    
    if (!error) {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      toast.error('Username dan password wajib diisi')
      return
    }

    const passwordHash = `hashed_${formData.password}`

    const { error } = await supabase
      .from('users')
      .insert({
        store_id: user?.store_id,
        username: formData.username,
        password_hash: passwordHash,
        role: formData.role,
        full_name: formData.full_name
      })

    if (error) {
      toast.error('Gagal menambah pengguna')
    } else {
      toast.success('Pengguna berhasil ditambahkan')
      setIsAdding(false)
      setFormData({
        username: '',
        password: '',
        role: 'kasir',
        full_name: ''
      })
      fetchUsers()
    }
  }

  const handleUpdate = async (id: string) => {
    const updateData: any = {
      role: formData.role,
      full_name: formData.full_name
    }

    if (formData.password) {
      updateData.password_hash = `hashed_${formData.password}`
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)

    if (error) {
      toast.error('Gagal mengupdate pengguna')
    } else {
      toast.success('Pengguna berhasil diupdate')
      setEditingId(null)
      fetchUsers()
    }
  }

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      toast.error('Tidak bisa menghapus akun sendiri')
      return
    }

    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Gagal menghapus pengguna')
      } else {
        toast.success('Pengguna berhasil dihapus')
        fetchUsers()
      }
    }
  }

  const startEdit = (userData: any) => {
    setFormData({
      username: userData.username,
      password: '',
      role: userData.role,
      full_name: userData.full_name || ''
    })
    setEditingId(userData.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({
      username: '',
      password: '',
      role: 'kasir',
      full_name: ''
    })
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      finance: 'Staff Keuangan',
      kasir: 'Kasir'
    }
    return labels[role] || role
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manajemen Pengguna</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengguna
          </button>
        )}
      </div>

      {/* Form Tambah */}
      {isAdding && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">Pengguna Baru</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Default: password123</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peran *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="kasir">Kasir</option>
                <option value="finance">Staff Keuangan</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel Users */}
      {loading ? (
        <div className="text-center py-8">Memuat...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Lengkap</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userData) => (
                <tr key={userData.id}>
                  {editingId === userData.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.username}
                          disabled
                          className="w-full px-2 py-1 border rounded bg-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        >
                          <option value="kasir">Kasir</option>
                          <option value="finance">Staff Keuangan</option>
                          <option value="admin">Admin</option>
                        </select>
                       </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdate(userData.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                       </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">{userData.username}</td>
                      <td className="px-6 py-4">{userData.full_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {getRoleLabel(userData.role)}
                        </span>
                       </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEdit(userData)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {userData.id !== user?.id && (
                            <button
                              onClick={() => handleDelete(userData.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                       </td>
                    </>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Tidak ada pengguna ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}