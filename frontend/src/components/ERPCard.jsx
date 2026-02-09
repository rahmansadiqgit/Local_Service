import PDFDownloadButton from './PDFDownloadButton'

export default function ERPCard({ erp, onStageChange, onAssignWorkers, onGeneratePdf }) {
  if (!erp) return null

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">{erp.category}</p>
          <h3 className="text-lg font-semibold">{erp.post_name || 'ERP Task'}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {erp.stage}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Total cost: ${erp.total_cost}
      </p>
      <div className="flex flex-wrap gap-2">
        {['Pending', 'On Process', 'Completed'].map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => onStageChange?.(erp, stage)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              erp.stage === stage
                ? 'bg-brand-500 text-white'
                : 'border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {stage}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAssignWorkers?.(erp)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300"
        >
          Assign Workers
        </button>
        <PDFDownloadButton onClick={() => onGeneratePdf?.(erp)} />
      </div>
    </div>
  )
}
