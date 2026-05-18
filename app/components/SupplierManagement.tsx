'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

export default function SupplierManagement({ userRole }: { userRole: string }) {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    is_consignment: false
  })

  const canEdit = userRole === 'finance' || userRole === 'admin'

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', user?.store_id)
      .order('supplier_name')
    
    if (!error) {
      setSuppliers(data || [])
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!formData.supplier_name) {
      toast.error('Nama pemasok wajib diisi')
      return
    }

    const { error } = await supabase
      .from('suppliers')
      .insert({
        store_id: user?.store_id,
        supplier_name: formData.supplier_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        address: formData.address,
        is_consignment: formData.is_consignment
      })

    if (error) {
      toast.error('Gagal menambah pemasok')
    } else {
      toast.success('Pemasok berhasil ditambahkan')
      setIsAdding(false)
      setFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        address: '',
        is_consignment: false
      })
      fetchSuppliers()
    }
  }

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from('suppliers')
      .update({
        supplier_name: formData.supplier_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        address: formData.address,
        is_consignment: formData.is_consignment
      })
      .eq('id', id)

    if (error) {
      toast.error('Gagal mengupdate pemasok')
    } else {
      toast.success('Pemasok berhasil diupdate')
      setEditingId(null)
      fetchSuppliers()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pemasok ini?')) {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Gagal menghapus pemasok')
      } else {
        toast.success('Pemasok berhasil dihapus')
        fetchSuppliers()
      }
    }
  }

  const startEdit = (supplier: any) => {
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      is_consignment: supplier.is_consignment || false
    })
    setEditingId(supplier.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({
      supplier_name: '',
      contact_person: '',
      phone: '',
      address: '',
      is_consignment: false
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manajemen Pemasok</h2>
        {canEdit && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pemasok
          </button>
        )}
      </div>

      {isAdding && canEdit && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">Pemasok Baru</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemasok *</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narahubung</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_consignment}
                  onChange={(e) => setFormData({...formData, is_consignment: e.target.checked})}
                  className="mr-2"
                />
                Ini adalah pemasok konsinyasi
              </label>
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

      {loading ? (
        <div className="text-center py-8">Memuat...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Pemasok</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narahubung</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  {editingId === supplier.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.supplier_name}
                          onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.contact_person}
                          onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                          rows={1}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={formData.is_consignment}
                          onChange={(e) => setFormData({...formData, is_consignment: e.target.checked})}
                          className="mr-2"
                        />
                        Konsinyasi
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdate(supplier.id)}
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
                      <td className="px-6 py-4">{supplier.supplier_name}</td>
                      <td className="px-6 py-4">{supplier.contact_person || '-'}</td>
                      <td className="px-6 py-4">{supplier.phone || '-'}</td>
                      <td className="px-6 py-4">{supplier.address || '-'}</td>
                      <td className="px-6 py-4">
                        {supplier.is_consignment ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Konsinyasi</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Normal</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(supplier)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(supplier.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Tidak ada pemasok ditemukan
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