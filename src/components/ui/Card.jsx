import clsx from 'clsx'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx('card', className)}
      style={{
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        background: 'var(--panel)',
        boxShadow: 'var(--shadow)',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  )
}
