export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirming = false,
  onConfirm,
  onCancel
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-[#070709]/82 backdrop-blur-md"
        style={{ animation: 'cc-scrim-in 220ms ease both' }}
        onClick={confirming ? undefined : onCancel}
      />
      <div
        className="relative w-full max-w-[440px] bg-surface border border-border shadow-[0_40px_90px_rgba(0,0,0,0.6)] overflow-hidden"
        style={{ animation: 'cc-modal-in 260ms cubic-bezier(0.2,0.8,0.2,1) both' }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: '#3A3A45' }} />

        <div className="relative flex items-start justify-between gap-5 px-7.5 pt-7.5">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase pt-2 text-textMuted">Confirm</span>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="cc-close w-8.5 h-8.5 flex-none flex items-center justify-center border border-[#26262E] font-mono text-sm text-textFaint disabled:opacity-50"
            style={{ width: 34, height: 34 }}
          >
            ×
          </button>
        </div>

        <div className="relative px-7.5 pt-6.5">
          <h2 className="font-heading font-black text-[32px] leading-[1.08] tracking-tight m-0">{title}</h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-textMuted max-w-[44ch]">{message}</p>
        </div>

        <div className="relative flex flex-col gap-2.5 px-7.5 pb-7.5 pt-7">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="cc-primary w-full h-13 flex items-center justify-between px-5 bg-accent disabled:opacity-60 font-heading font-bold text-[14.5px] text-bg"
            style={{ height: 52 }}
          >
            <span>{cancelLabel}</span><span className="text-lg">←</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="cc-outline w-full h-12 flex items-center justify-between px-5 bg-transparent border border-[#3A3A45] disabled:opacity-50 font-heading font-semibold text-sm text-textMuted"
          >
            <span>{confirming ? 'Please wait…' : confirmLabel}</span><span>×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
