'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvoicesList({ type, userRole }: { type: string, userRole: string }) {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [filter, setFilter] = useState({
    supplier_id: '',
    status: '',
    start_date: '',
    end_date: '',
    show_all: false
  })
  const [loading, setLoading] = useState(false)

  const table = type === 'normal' ? 'invoices_normal' : 'invoices_consignment'

  useEffect(() => {
    fetchSuppliers()
    fetchInvoices()
  }, [type, filter])

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', user?.store_id)
    setSuppliers(data || [])
  }

  const fetchInvoices = async () => {
    setLoading(true)
    let query = supabase
      .from(table)
      .select(`
        *,
        suppliers(supplier_name),
        users(full_name)
      `)
      .eq('store_id', user?.store_id)
      .order('created_at', { ascending: true })

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

  const handlePayment = async (invoice: any) => {
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

  const exportToExcel = () => {
    const exportData = invoices.map((inv: any) => ({
      'Invoice Number': inv.invoice_number,
      'Invoice Date': inv.invoice_date,
      'Supplier': inv.suppliers?.supplier_name,
      'Due Date': inv.due_date,
      'Amount': inv.amount,
      'Status': inv.status === 'lunas' ? 'Paid' : 'Unpaid',
      'Payment Date': inv.payment_date || '-',
      'Input By': inv.users?.full_name,
      ...(type === 'consignment' && {
        'Actual Paid': inv.actual_paid || '-',
        'Difference': inv.difference || '-'
      })
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
    XLSX.writeFile(wb, `invoices_${type}_${new Date().toISOString()}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text(`Invoices Report - ${type.toUpperCase()}`, 14, 15)
    
    const tableData = invoices.map((inv: any) => [
      inv.invoice_number,
      inv.invoice_date,
      inv.suppliers?.supplier_name,
      inv.due_date,
      `Rp ${inv.amount?.toLocaleString()}`,
      inv.status === 'lunas' ? 'Paid' : 'Unpaid',
      inv.payment_date || '-',
      ...(type === 'consignment' ? [`Rp ${(inv.actual_paid || 0).toLocaleString()}`, `Rp ${(inv.difference || 0).toLocaleString()}`] : [])
    ])
    
    const columns = ['Invoice No', 'Date', 'Supplier', 'Due Date', 'Amount', 'Status', 'Payment Date']
    if (type === 'consignment') {
      columns.push('Actual Paid', 'Difference')
    }
    
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 20
    })
    
    doc.save(`invoices_${type}_${new Date().toISOString()}.pdf`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={filter.supplier_id}
          onChange={(e) => setFilter({...filter, supplier_id: e.target.value})}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Semua Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>
        
        <select
          value={filter.status}
          onChange={(e) => setFilter({...filter, status: e.target.value})}
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

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Oleh</th>
                {type === 'consignment' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktual dibayar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tandahi Lunas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice: any) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4">{invoice.invoice_number}</td>
                  <td className="px-6 py-4">{invoice.invoice_date}</td>
                  <td className="px-6 py-4">{invoice.suppliers?.supplier_name}</td>
                  <td className="px-6 py-4">{invoice.due_date}</td>
                  <td className="px-6 py-4">Rp {invoice.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      invoice.status === 'lunas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status === 'lunas' ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{invoice.users?.full_name}</td>
                  {type === 'consignment' && (
                    <>
                      <td className="px-6 py-4">{invoice.actual_paid ? `Rp ${invoice.actual_paid.toLocaleString()}` : '-'}</td>
                      <td className="px-6 py-4">{invoice.difference ? `Rp ${invoice.difference.toLocaleString()}` : '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    {invoice.status === 'belum bayar' && userRole === 'finance' && (
                      <button
                        onClick={() => handlePayment(invoice)}
                        className="text-green-600 hover:text-green-800"
                        title="Mark as paid"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">Tidak ada faktur ditemukan</div>
          )}
        </div>
      )}
    </div>
  )
}