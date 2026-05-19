'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function DashboardStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total_invoices: 0,
    paid_invoices: 0,
    unpaid_invoices: 0,
    due_today: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    // Ambil data dari kedua tabel (normal + konsinyasi)
    const tables = ['invoices_normal', 'invoices_consignment']
    
    let total = 0
    let paid = 0
    let unpaid = 0
    let dueToday = 0

    for (const table of tables) {
      // Total faktur
      const { count: totalCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('store_id', user?.store_id)

      // Faktur lunas
      const { count: paidCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('store_id', user?.store_id)
        .eq('status', 'lunas')

      // Faktur belum bayar
      const { count: unpaidCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('store_id', user?.store_id)
        .eq('status', 'belum bayar')

      // Faktur jatuh tempo hari ini
      const { count: dueTodayCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('store_id', user?.store_id)
        .eq('status', 'belum bayar')
        .lte('due_date', today)

      total += totalCount || 0
      paid += paidCount || 0
      unpaid += unpaidCount || 0
      dueToday += dueTodayCount || 0
    }

    setStats({
      total_invoices: total,
      paid_invoices: paid,
      unpaid_invoices: unpaid,
      due_today: dueToday
    })
    setLoading(false)
  }

  const cards = [
    {
      title: 'Total Faktur',
      value: stats.total_invoices,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Sudah Dibayar',
      value: stats.paid_invoices,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Belum Dibayar',
      value: stats.unpaid_invoices,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Jatuh Tempo Hari Ini',
      value: stats.due_today,
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">{card.title}</p>
              <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
            <div className={`${card.color} p-3 rounded-full text-white`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
