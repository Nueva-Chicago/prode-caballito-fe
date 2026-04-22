import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: string
  message: string
  action?: { label: string; to?: string; onClick?: () => void }
  className?: string
}

export function EmptyState({ icon, message, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-12 text-center ${className}`}>
      <span className="text-4xl leading-none">{icon}</span>
      <p className="text-sm text-gray-400 max-w-[220px] leading-relaxed">{message}</p>
      {action && (
        action.to
          ? <Link
              to={action.to}
              className="mt-1 px-4 py-2 rounded-lg text-xs font-bold t-text-on-primary transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'var(--theme-primary)' }}
            >
              {action.label}
            </Link>
          : <button
              onClick={action.onClick}
              className="mt-1 px-4 py-2 rounded-lg text-xs font-bold t-text-on-primary transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'var(--theme-primary)' }}
            >
              {action.label}
            </button>
      )}
    </div>
  )
}
