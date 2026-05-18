'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import InvoicesList from '../components/InvoicesList'
import InvoiceForm from '../components/InvoiceForm'
import SupplierManagement from '../components/SupplierManagement'
import UserManagement from '../components/UserManagement'
import { FileText, Truck, Users, LogOut } from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoiceType, setInvoiceType] = useState<'normal' | 'consignment'>('normal')

  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800">Aplikasi Faktur</h2>
          <p className="text-sm text-gray-600 mt-1">Selamat datang, {user.full_name}</p>
          <p className="text-xs text-indigo-600 mt-1">Peran: {
            user.role === 'admin' ? 'Admin' : 
            user.role === 'finance' ? 'Staff Keuangan' : 
            'Kasir'
          }</p>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full text-left px-6 py-3 flex items-center ${
              activeTab === 'invoices' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 mr-3" />
            Faktur
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full text-left px-6 py-3 flex items-center ${
              activeTab === 'suppliers' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
            }`}
          >
            <Truck className="w-5 h-5 mr-3" />
            Pemasok
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-6 py-3 flex items-center ${
                activeTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Pengguna
            </button>
          )}
          <button
            onClick={() => { logout(); router.push('/') }}
            className="w-full text-left px-6 py-3 flex items-center text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </button>
        </nav>
      </div>

      <div className="ml-64 p-8">
        {activeTab === 'invoices' && (
          <>
            <div className="mb-6 flex space-x-4">
              <button
                onClick={() => setInvoiceType('normal')}
                className={`px-6 py-2 rounded-lg ${
                  invoiceType === 'normal' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700'
                }`}
              >
                Faktur Normal
              </button>
              <button
                onClick={() => setInvoiceType('consignment')}
                className={`px-6 py-2 rounded-lg ${
                  invoiceType === 'consignment' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700'
                }`}
              >
                Faktur Konsinyasi
              </button>
            </div>
            {(user.role === 'kasir' || user.role === 'admin') && (
              <InvoiceForm type={invoiceType} />
            )}
            <InvoicesList type={invoiceType} userRole={user.role} />
          </>
        )}
        {activeTab === 'suppliers' && (
          <SupplierManagement userRole={user.role} />
        )}
        {activeTab === 'users' && user.role === 'admin' && (
          <UserManagement />
        )}
      </div>
    </div>
  )
}