'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, CheckCircle, Edit, Trash2, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvoicesList({ type, userRole }: { type: 'normal' | 'consignment', userRole: string }) {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState({
    supplier_id: '',
    status: '',
    start_date: '',
    end_date: '',
    show_all: false
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    amount: '',
    notes: ''
  })

  const ITEMS_PER_PAGE = 20
  const table = type === 'normal' ? 'invoices_normal' : 'invoices_consignment'

  useEffect(() => {
    fetchSuppliers()
    fetchInvoices()
  }, [type, filter, currentPage])

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', user?.store_id)
    setSuppliers(data || [])
  }

  const fetchInvoices = async () => {
    setLoading(true)
    
    let countQuery = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('store_id', user?.store_id)

    if (filter.supplier_id) {
      countQuery = countQuery.eq('supplier_id', filter.supplier_id)
    }
    if (filter.status) {
      countQuery = countQuery.eq('status', filter.status)
    }
    if (filter.start_date && filter.end_date) {
      countQuery = countQuery.gte('due_date', filter.start_date).lte('due_date', filter.end_date)
    }
    if (!filter.show_all) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      countQuery = countQuery.gte('created_at', thirtyDaysAgo.toISOString())
    }

    const { count } = await countQuery
    if (count) {
      setTotalPages(Math.ceil(count / ITEMS_PER_PAGE))
    }

    let query = supabase
      .from(table)
      .select(`
        *,
        suppliers(supplier_name),
        users(full_name)
      `)
      .eq('store_id', user?.store_id)
      .order('invoice_date', { ascending: false })
      .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

    if (filter.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id)
    }
    if (filter.status) {
      query = query.eq('status', filter.status)
    }
    if (filter.start_date && filter.end_date) {
      query = query.gte('due_date', filter.start_date).lte('due_date', filter.end_date)
    }
    if (!filter.show_all) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      query = query.gte('created_at', thirtyDaysAgo.toISOString())
    }

    const { data, error } = await query
    if (!error) {
      setInvoices(data || [])
    }
    setLoading(false)
  }

  // Tandai Lunas
  const handlePayment = async (invoice: any) => {
  if (userRole !== 'finance' && userRole !== 'admin') {
    toast.error('Hanya staff finance dan admin yang bisa melakukan pelunasan')
    return
  }

  // Pop-up konfirmasi untuk Tandai Lunas
  const confirmed = window.confirm(`Tandai faktur ${invoice.invoice_number} sebagai LUNAS?`)
  if (!confirmed) return

  if (type === 'normal') {
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'lunas', 
        payment_date: new Date().toISOString().split('T')[0] 
      })
      .eq('id', invoice.id)

    if (error) {
      toast.error('Pembayaran gagal')
    } else {
      toast.success('Pembayaran berhasil')
      fetchInvoices()
    }
  } else {
    const actualPaid = prompt('Masukkan jumlah yang dibayar:', invoice.amount)
    if (actualPaid) {
      const difference = parseFloat(actualPaid) - invoice.amount
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'lunas', 
          payment_date: new Date().toISOString().split('T')[0],
          actual_paid: parseFloat(actualPaid),
          difference: difference
        })
        .eq('id', invoice.id)

      if (error) {
        toast.error('Pembayaran gagal')
      } else {
        toast.success('Pembayaran berhasil')
        fetchInvoices()
      }
    }
  }
}

  // Batalkan Lunas
  const handleCancelPayment = async (invoice: any) => {
  if (userRole !== 'finance' && userRole !== 'admin') {
    toast.error('Hanya staff finance dan admin yang bisa membatalkan pelunasan')
    return
  }

  // Pop-up konfirmasi untuk Batalkan Lunas
  const confirmed = window.confirm(`Batalkan pelunasan faktur ${invoice.invoice_number}? Status akan kembali ke "Belum Bayar".`)
  if (!confirmed) return

  if (type === 'normal') {
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'belum bayar', 
        payment_date: null 
      })
      .eq('id', invoice.id)

    if (error) {
      toast.error('Gagal membatalkan pelunasan')
    } else {
      toast.success('Pelunasan dibatalkan, faktur kembali ke "Belum Bayar"')
      fetchInvoices()
    }
  } else {
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'belum bayar', 
        payment_date: null,
        actual_paid: null,
        difference: null
      })
      .eq('id', invoice.id)

    if (error) {
      toast.error('Gagal membatalkan pelunasan')
    } else {
      toast.success('Pelunasan dibatalkan, faktur kembali ke "Belum Bayar"')
      fetchInvoices()
    }
  }
}

  const startEdit = (invoice: any) => {
    if (invoice.status === 'lunas') {
      toast.error('Faktur yang sudah lunas tidak bisa diedit')
      return
    }
    if (userRole !== 'kasir' && userRole !== 'admin') {
      toast.error('Hanya kasir dan admin yang bisa mengedit faktur')
      return
    }
    setEditingId(invoice.id)
    setEditForm({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      amount: invoice.amount.toString(),
      notes: invoice.notes || ''
    })
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from(table)
      .update({
        invoice_number: editForm.invoice_number,
        invoice_date: editForm.invoice_date,
        due_date: editForm.due_date,
        amount: parseFloat(editForm.amount),
        notes: editForm.notes
      })
      .eq('id', id)

    if (error) {
      toast.error('Gagal menyimpan perubahan')
    } else {
      toast.success('Faktur berhasil diupdate')
      setEditingId(null)
      fetchInvoices()
    }
  }

  const handleDelete = async (id: string, status: string, invoiceNumber: string) => {
  if (status === 'lunas') {
    toast.error('Faktur yang sudah lunas tidak bisa dihapus')
    return
  }
  if (userRole !== 'kasir' && userRole !== 'admin') {
    toast.error('Hanya kasir dan admin yang bisa menghapus faktur')
    return
  }

  // Pop-up konfirmasi untuk Hapus
  const confirmed = window.confirm(`Hapus faktur ${invoiceNumber}? Data akan dihapus permanen dan tidak dapat dikembalikan.`)
  if (!confirmed) return

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    toast.error('Gagal menghapus faktur')
  } else {
    toast.success('Faktur berhasil dihapus')
    fetchInvoices()
  }
}

  const exportToExcel = () => {
    const exportData = invoices.map((inv: any) => ({
      'Nomor Faktur': inv.invoice_number,
      'Tanggal Faktur': inv.invoice_date,
      'Pemasok': inv.suppliers?.supplier_name,
      'Jatuh Tempo': inv.due_date,
      'Jumlah': inv.amount,
      'Status': inv.status === 'lunas' ? 'Lunas' : 'Belum Bayar',
      'Tanggal Bayar': inv.payment_date || '-',
      'Diinput Oleh': inv.users?.full_name,
      ...(type === 'consignment' && {
        'Dibayar (Actual Paid)': inv.actual_paid ? `Rp ${inv.actual_paid.toLocaleString()}` : '-',
        'Selisih': inv.difference ? `Rp ${inv.difference.toLocaleString()}` : '-'
      })
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Faktur')
    XLSX.writeFile(wb, `faktur_${type}_${new Date().toISOString()}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text(`Laporan Faktur - ${type === 'normal' ? 'Normal' : 'Konsinyasi'}`, 14, 15)
    
    const tableData = invoices.map((inv: any) => [
      inv.invoice_number,
      inv.invoice_date,
      inv.suppliers?.supplier_name,
      inv.due_date,
      `Rp ${inv.amount?.toLocaleString()}`,
      inv.status === 'lunas' ? 'Lunas' : 'Belum Bayar',
      inv.payment_date || '-',
      ...(type === 'consignment' ? [
        inv.actual_paid ? `Rp ${inv.actual_paid.toLocaleString()}` : '-',
        inv.difference ? `Rp ${inv.difference.toLocaleString()}` : '-'
      ] : [])
    ])
    
    const columns = ['No. Faktur', 'Tanggal', 'Pemasok', 'Jatuh Tempo', 'Jumlah', 'Status', 'Tanggal Bayar']
    if (type === 'consignment') {
      columns.push('Dibayar', 'Selisih')
    }
    
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 20
    })
    
    doc.save(`faktur_${type}_${new Date().toISOString()}.pdf`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Filter Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={filter.supplier_id}
          onChange={(e) => { setFilter({...filter, supplier_id: e.target.value}); setCurrentPage(1) }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Semua Pemasok</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>
        
        <select
          value={filter.status}
          onChange={(e) => { setFilter({...filter, status: e.target.value}); setCurrentPage(1) }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Semua Status</option>
          <option value="belum bayar">Belum Bayar</option>
          <option value="lunas">Lunas</option>
        </select>
        
        <input
          type="date"
          placeholder="Tanggal Mulai"
          value={filter.start_date}
          onChange={(e) => setFilter({...filter, start_date: e.target.value})}
          className="px-3 py-2 border rounded-lg"
        />
        
        <input
          type="date"
          placeholder="Tanggal Akhir"
          value={filter.end_date}
          onChange={(e) => setFilter({...filter, end_date: e.target.value})}
          className="px-3 py-2 border rounded-lg"
        />
        
        <div className="flex items-center gap-4 col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.show_all}
              onChange={(e) => setFilter({...filter, show_all: e.target.checked})}
              className="mr-2"
            />
            Tampilkan semua data
          </label>
          
          <div className="flex space-x-2">
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Memuat...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Faktur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pemasok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Bayar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diinput Oleh</th>
                  {type === 'consignment' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibayar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id}>
                    {editingId === invoice.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editForm.invoice_number}
                            onChange={(e) => setEditForm({...editForm, invoice_number: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editForm.invoice_date}
                            onChange={(e) => setEditForm({...editForm, invoice_date: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">{invoice.suppliers?.supplier_name}</td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editForm.due_date}
                            onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">{invoice.status === 'lunas' ? 'Lunas' : 'Belum Bayar'}</td>
                        <td className="px-6 py-4">{invoice.payment_date || '-'}</td>
                        <td className="px-6 py-4">{invoice.users?.full_name}</td>
                        {type === 'consignment' && (
                          <>
                            <td className="px-6 py-4">{invoice.actual_paid ? `Rp ${invoice.actual_paid.toLocaleString()}` : '-'}</td>
                            <td className="px-6 py-4">{invoice.difference ? `Rp ${invoice.difference.toLocaleString()}` : '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveEdit(invoice.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Batal
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">{invoice.invoice_number}</td>
                        <td className="px-6 py-4">{invoice.invoice_date}</td>
                        <td className="px-6 py-4">{invoice.suppliers?.supplier_name}</td>
                        <td className="px-6 py-4">{invoice.due_date}</td>
                        <td className="px-6 py-4">Rp {invoice.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            invoice.status === 'lunas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status === 'lunas' ? 'Lunas' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{invoice.payment_date || '-'}</td>
                        <td className="px-6 py-4">{invoice.users?.full_name}</td>
                        {type === 'consignment' && (
                          <>
                            <td className="px-6 py-4">
                              {invoice.actual_paid ? `Rp ${invoice.actual_paid.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4">
                              {invoice.difference ? `Rp ${invoice.difference.toLocaleString()}` : '-'}
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            {/* Tombol Tandai Lunas (untuk faktur belum bayar) */}
                            {invoice.status === 'belum bayar' && (userRole === 'finance' || userRole === 'admin') && (
                              <button
                                onClick={() => handlePayment(invoice)}
                                className="text-green-600 hover:text-green-800"
                                title="Tandai Lunas"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            
                            {/* Tombol Batalkan Lunas (untuk faktur sudah lunas) */}
                            {invoice.status === 'lunas' && (userRole === 'finance' || userRole === 'admin') && (
                              <button
                                onClick={() => handleCancelPayment(invoice)}
                                className="text-orange-600 hover:text-orange-800"
                                title="Batalkan Lunas"
                              >
                                <Undo2 className="w-5 h-5" />
                              </button>
                            )}
                            
                            {/* Tombol Edit (hanya untuk faktur belum bayar) */}
                            {invoice.status === 'belum bayar' && (userRole === 'kasir' || userRole === 'admin') && (
                              <button
                                onClick={() => startEdit(invoice)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            
                            {/* Tombol Hapus (hanya untuk faktur belum bayar) */}
                            {invoice.status === 'belum bayar' && (userRole === 'kasir' || userRole === 'admin') && (
                              <button
                                onClick={() => handleDelete(invoice.id, invoice.status, invoice.invoice_number)}
                                className="text-red-600 hover:text-red-800"
                                title="Hapus"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={type === 'consignment' ? 11 : 9} className="text-center py-8 text-gray-500">
                      Tidak ada faktur ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!filter.show_all && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Sebelumnya
              </button>
              <span className="text-gray-700">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}