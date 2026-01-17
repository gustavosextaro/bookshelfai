import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Badge } from './Badge'

export function PricingTab({ text, selected, setSelected, discount = false }) {
  return (
    <button
      onClick={() => setSelected(text)}
      className={clsx(
        'relative w-fit px-4 py-2 text-sm font-semibold capitalize transition-colors',
        discount && 'flex items-center justify-center gap-2.5'
      )}
      style={{
        color: 'var(--text)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <span className="relative z-10" style={{ position: 'relative', zIndex: 10 }}>
        {text}
      </span>
      {selected && (
        <motion.span
          layoutId="pricing-tab"
          transition={{ type: 'spring', duration: 0.4 }}
          className="absolute inset-0 z-0"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            borderRadius: '999px',
            background: 'var(--panel)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          }}
        />
      )}
      {discount && (
        <Badge
          variant="secondary"
          className="relative z-10 whitespace-nowrap shadow-none"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Save 35%
        </Badge>
      )}
    </button>
  )
}
