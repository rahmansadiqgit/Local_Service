export default function ProductTable({ products = [] }) {
  if (!products.length) {
    return <p className="text-sm text-slate-500">No products listed.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Unit</th>
            <th className="px-4 py-2">Cost</th>
            <th className="px-4 py-2">Units</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-t border-slate-200 dark:border-slate-800"
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
