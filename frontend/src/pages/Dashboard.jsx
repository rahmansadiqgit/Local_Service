import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js'
import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import api from '../api/client'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function Dashboard() {
  const [erpItems, setErpItems] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/erp/')
        setErpItems(data)
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const stageCounts = { Pending: 0, 'On Process': 0, Completed: 0 }
    let totalCost = 0
    erpItems.forEach((item) => {
      stageCounts[item.stage] = (stageCounts[item.stage] || 0) + 1
      totalCost += Number(item.total_cost || 0)
    })
    return { stageCounts, totalCost }
  }, [erpItems])

  const barData = {
    labels: Object.keys(stats.stageCounts),
    datasets: [
      {
        label: 'ERP Tasks',
        data: Object.values(stats.stageCounts),
        backgroundColor: ['#3d7dff', '#68a5ff', '#233f93'],
        borderRadius: 8,
      },
    ],
  }

  const donutData = {
    labels: ['Pending', 'On Process', 'Completed'],
    datasets: [
      {
        data: [
          stats.stageCounts.Pending,
          stats.stageCounts['On Process'],
          stats.stageCounts.Completed,
        ],
        backgroundColor: ['#fbbf24', '#60a5fa', '#34d399'],
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">Overview of ERP performance and revenue.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total ERP Tasks</p>
          <p className="mt-2 text-3xl font-semibold">{erpItems.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="mt-2 text-3xl font-semibold">${stats.totalCost.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active Providers</p>
          <p className="mt-2 text-3xl font-semibold">{new Set(erpItems.map((i) => i.provider)).size}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">ERP Stage Breakdown</h3>
          <Doughnut data={donutData} />
        </div>
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">Task Status Count</h3>
          <Bar data={barData} />
        </div>
      </div>
    </div>
  )
}
