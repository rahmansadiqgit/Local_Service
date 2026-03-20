export default function ERPFiltersBar({ filters, workerPool, onFilterChange, onWorkerPoolChange }) {
  return (
    <div className="card grid gap-4 lg:grid-cols-6">
      <div>
        <label className="text-xs font-semibold text-slate-500">Category</label>
        <select
          name="category"
          value={filters.category}
          onChange={onFilterChange}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="Received">Received</option>
          <option value="Provided">Provided</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Stage</label>
        <select
          name="stage"
          value={filters.stage}
          onChange={onFilterChange}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="On Process">On Process</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Provider ID</label>
        <input
          name="provider"
          value={filters.provider}
          onChange={onFilterChange}
          placeholder="e.g. 12"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Location</label>
        <input
          name="location"
          value={filters.location}
          onChange={onFilterChange}
          placeholder="City"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Min Rating</label>
        <select
          name="rating"
          value={filters.rating}
          onChange={onFilterChange}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          <option value="5">5+</option>
          <option value="4">4+</option>
          <option value="3">3+</option>
          <option value="2">2+</option>
          <option value="1">1+</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Worker Pool</label>
        <input
          value={workerPool}
          onChange={onWorkerPoolChange}
          placeholder="IDs for auto assign"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}
