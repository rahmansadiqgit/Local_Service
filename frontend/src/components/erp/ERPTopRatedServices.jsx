export default function ERPTopRatedServices({ topServices, postMap }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold">Top Rated Services</h3>
      <div className="mt-3 grid gap-2 text-sm">
        {topServices.length === 0 ? (
          <p className="text-slate-500">No ratings yet.</p>
        ) : (
          topServices.map((item) => (
            <div key={item.postId} className="flex items-center justify-between">
              <span>{postMap[item.postId]?.post_name || `Post #${item.postId}`}</span>
              <span className="font-semibold">{item.average.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
