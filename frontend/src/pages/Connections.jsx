import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const customers = [
  { id: 1, name: 'Ayesha Khan', role: 'Customer', location: 'Dhaka', status: 'Active' },
  { id: 2, name: 'Rafi Ahmed', role: 'Customer', location: 'Sylhet', status: 'Available' },
  { id: 3, name: 'Nusrat Jahan', role: 'Customer', location: 'Khulna', status: 'Viewer' },
]

const providers = [
  { id: 11, name: 'Mehedi Hasan', role: 'Skilled Person', location: 'Chattogram', status: 'Busy' },
  { id: 12, name: 'Sadia Noor', role: 'Business', location: 'Dhaka', status: 'Active' },
  { id: 13, name: 'Rony Kabir', role: 'Skilled Person', location: 'Rajshahi', status: 'Inactive' },
]

const statusStyles = {
  Active: 'bg-emerald-100 text-emerald-700',
  Available: 'bg-blue-100 text-blue-700',
  Viewer: 'bg-transparent text-slate-400',
  Busy: 'bg-rose-100 text-rose-700',
  Inactive: 'bg-transparent text-slate-400',
}

export default function Connections() {
  const [selected, setSelected] = useState(null)
  const [posts, setPosts] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const { data } = await api.get('/posts/')
        if (!active) return
        setPosts(data)
      } catch (error) {
        console.error(error)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const recentPosts = useMemo(() => {
    if (!selected) return []
    const matched = posts.filter((post) =>
      post.brand_company_name?.toLowerCase().includes(selected.name.toLowerCase()),
    )
    return (matched.length ? matched : posts).slice(0, 3)
  }, [posts, selected])

  const sendNotification = async (title, messageText) => {
    setMessage('')
    try {
      await api.post('/notifications/', { title, message: messageText })
      setMessage('Notification sent.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to send notification.')
    }
  }

  const renderCard = (person, type) => (
    <button
      key={person.id}
      type="button"
      onClick={() => setSelected({ ...person, type })}
      className="card text-left transition hover:border-brand-300"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          {person.name
            .split(' ')
            .map((word) => word[0])
            .join('')}
        </div>
        <div>
          <p className="font-semibold">{person.name}</p>
          <p className="text-xs text-slate-500">{person.role}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-2 py-1 text-xs font-semibold ${
            statusStyles[person.status] || 'text-slate-400'
          }`}
        >
          {person.status}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{person.location}</p>
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Connections</h2>
        <p className="text-sm text-slate-500">Manage your Localix network.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Customers</h3>
          <p className="text-xs text-slate-400">Active = green • Available = blue • Viewer = none</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {customers.map((person) => renderCard(person, 'customer'))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Service Providers</h3>
          <p className="text-xs text-slate-400">Busy = red • Active = yellow • Inactive = none</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {providers.map((person) => renderCard(person, 'provider'))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Connection Details</h3>
        {!selected ? (
          <p className="mt-3 text-sm text-slate-500">Select a connection to view profile details.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-slate-500">{selected.role} • {selected.location}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  statusStyles[selected.status] || 'text-slate-400'
                }`}
              >
                {selected.status}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {selected.type === 'customer' ? 'Customer' : 'Provider'}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold">Recent Posts</p>
              <div className="mt-2 space-y-2 text-sm text-slate-500">
                {recentPosts.length === 0 ? (
                  <p>No posts available.</p>
                ) : (
                  recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between">
                      <span>{post.post_name}</span>
                      <span className="text-xs text-slate-400">{post.post_type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  sendNotification(
                    'Booking Request',
                    `Booking initiated with ${selected.name}.`,
                  )
                }
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Book Service
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNotification(
                    'Worker Assignment',
                    `Worker assignment initiated for ${selected.name}.`,
                  )
                }
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Assign Worker
              </button>
              {message && <span className="text-sm text-slate-500">{message}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
