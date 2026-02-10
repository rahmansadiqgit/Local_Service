import { useMemo, useState } from 'react'

export default function ProductTable({ products = [] }) {
  const [sortKey, setSortKey] = useState('product_name')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = useMemo(() => {
    const copy = [...products]
    copy.sort((a, b) => {
      const aValue = a[sortKey] ?? ''
      const bValue = b[sortKey] ?? ''
      if (typeof aValue === 'number' || typeof bValue === 'number') {
        return sortDir === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
      }
      return sortDir === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
    return copy
  }, [products, sortDir, sortKey])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (!products.length) {
    return <p className="text-sm text-slate-500">No products listed.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('product_name')}>
                Product
              </button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('unit')}>Unit</button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('cost_per_unit')}>
                Cost
              </button>
            </th>
            <th className="px-4 py-2">
              <button type="button" onClick={() => handleSort('available_units')}>
                Units
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((product, index) => (
            <tr
              key={product.id}
              className={`border-t border-slate-200 dark:border-slate-800 ${
                index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/40' : ''
              }`}
            >
              <td className="px-4 py-2 font-medium">{product.product_name}</td>
              <td className="px-4 py-2">{product.unit}</td>
              <td className="px-4 py-2">${product.cost_per_unit}</td>
              <td className="px-4 py-2">{product.available_units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
