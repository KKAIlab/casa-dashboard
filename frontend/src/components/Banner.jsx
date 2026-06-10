const VARIANTS = {
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
}

const ICONS = { error: '⚠', warning: '⚠', info: 'ℹ', success: '✓' }

export default function Banner({ variant = 'info', title, children, onDismiss }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${VARIANTS[variant] || VARIANTS.info}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">{ICONS[variant] || ICONS.info}</span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">✕</button>
      )}
    </div>
  )
}
