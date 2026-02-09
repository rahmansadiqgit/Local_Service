import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import ERPCard from '../components/ERPCard'

export default function ERP() {
  const [erpItems, setErpItems] = useState([])
  const [posts, setPosts] = useState([])

  const load = async () => {
    try {
      const [erpRes, postRes] = await Promise.all([api.get('/erp/'), api.get('/posts/')])
      setErpItems(erpRes.data)
      setPosts(postRes.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const postMap = useMemo(() => {
    return posts.reduce((acc, post) => {
      acc[post.id] = post
      return acc
    }, {})
  }, [posts])

  const handleStageChange = async (erp, stage) => {
    try {
      const { data } = await api.patch(`/erp/${erp.id}/update_stage/`, { stage })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
    }
  }

  const handleAssignWorkers = async (erp) => {
    const raw = window.prompt('Enter worker IDs separated by comma')
    if (!raw) return
    const worker_ids = raw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter(Boolean)
    try {
      const { data } = await api.post(`/erp/${erp.id}/assign_workers/`, { worker_ids })
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    } catch (error) {
      console.error(error)
    }
  }

  const handleGeneratePdf = async (erp) => {
    try {
      const { data } = await api.post(`/erp/${erp.id}/generate_pdf/`)
      setErpItems((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      if (data.pdf_slip) {
        window.open(data.pdf_slip, '_blank')
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">ERP Management</h2>
        <p className="text-sm text-slate-500">Monitor and manage ERP tasks.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {erpItems.length === 0 ? (
          <div className="card">No ERP tasks yet.</div>
        ) : (
          erpItems.map((erp) => (
            <ERPCard
              key={erp.id}
              erp={{ ...erp, post_name: postMap[erp.post]?.post_name }}
              onStageChange={handleStageChange}
              onAssignWorkers={handleAssignWorkers}
              onGeneratePdf={handleGeneratePdf}
            />
          ))
        )}
      </div>
    </div>
  )
}
