'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function InvoiceForm({ type }: { type: 'normal' | 'consignment' }) {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    supplier_id: '',
    due_date: '',
    amount: '',
    notes: ''
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', user?.store_id)
    setSuppliers(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const table = type === 'normal' ? 'invoices_normal' : 'invoices_consignment'
    
    const { error } = await supabase
      .from(table)
      .insert({
        store_id: user?.store_id,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        supplier_id: formData.supplier_id,
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        input_by: user?.id,
        status: 'belum bayar'
      })

    if (error) {
      toast.error('Gagal menyimpan faktur')
      console.error(error)
    } else {
      toast.success('Faktur berhasil disimpan')
      setFormData({
        invoice_number: '',
        invoice_date: '',
        supplier_id: '',
        due_date: '',
        amount: '',
        notes: ''
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Buat Faktur {type === 'normal' ? 'Normal' : 'Konsinyasi'}</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nomor Faktur
          </label>
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Faktur
          </label>
          <input
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pemasok
          </label>
          <select
            value={formData.supplier_id}
            onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Pilih Pemasok</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.supplier_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Jatuh Tempo
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jumlah (Rp)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
        </div>
        <div className="col-span-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Simpan Faktur
          </button>
        </div>
      </form>
    </div>
  )
}