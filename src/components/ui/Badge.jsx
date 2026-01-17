import clsx from 'clsx'

const badgeVariants = {
  default: 'border-transparent bg-[var(--brand)] text-[var(--bg)] hover:opacity-80',
  secondary: 'border-transparent bg-[var(--panel-2)] text-[var(--text)] hover:opacity-80',
  destructive: 'border-transparent bg-[var(--danger)] text-white hover:opacity-80',
  outline: 'text-[var(--text)] border-[var(--border)]',
}

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
