export default function PDFDownloadButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
    >
      Download PDF
    </button>
  )
}
