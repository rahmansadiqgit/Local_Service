import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Connections from './pages/Connections'
import CreatePost from './pages/CreatePost'
import Dashboard from './pages/Dashboard'
import ERP from './pages/ERP'
import HomeFeed from './pages/HomeFeed'
import ManagePost from './pages/ManagePost'
import Profile from './pages/Profile'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Sidebar />
        <main className="flex-1 space-y-6">
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/create-post" element={<CreatePost />} />
            <Route path="/manage-post" element={<ManagePost />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/erp" element={<ERP />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  )
}
