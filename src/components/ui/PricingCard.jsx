import { BadgeCheck, ArrowRight } from 'lucide-react'
import NumberFlow from '@number-flow/react'
import clsx from 'clsx'
import { Badge } from './Badge'
import { Card } from './Card'

export function PricingCard({ tier, paymentFrequency }) {
  const price = tier.price[paymentFrequency]
  const isHighlighted = tier.highlighted
  const isPopular = tier.popular

  return (
    <Card
      className={clsx(
        'relative flex flex-col gap-8 overflow-hidden p-6',
        isPopular && 'ring-2'
      )}
      style={{
        background: isHighlighted ? 'var(--text)' : 'var(--panel)',
        color: isHighlighted ? 'var(--bg)' : 'var(--text)',
        ...(isPopular && { 
          boxShadow: '0 0 0 2px var(--brand)',
          borderColor: 'transparent'
        })
      }}
    >
      {isHighlighted && <HighlightedBackground />}
      {isPopular && <PopularBackground />}

      <h2 className="flex items-center gap-3 text-xl font-medium capitalize" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {tier.name}
        {isPopular && (
          <Badge variant="secondary" className="mt-1 z-10" style={{ marginTop: '4px', zIndex: 10 }}>
            🔥 Most Popular
          </Badge>
        )}
      </h2>

      <div className="relative" style={{ position: 'relative', height: '60px' }}>
        {typeof price === 'number' ? (
          <>
            <NumberFlow
              format={{
                style: 'currency',
                currency: 'USD',
                trailingZeroDisplay: 'stripIfInteger',
              }}
              value={price}
              className="text-4xl font-medium"
              style={{ fontSize: '2.25rem', fontWeight: 500 }}
            />
            <p className="text-xs" style={{ marginTop: '-8px', fontSize: '0.75rem', color: 'var(--muted)' }}>
              Per month/user
            </p>
          </>
        ) : (
          <h1 className="text-4xl font-medium" style={{ fontSize: '2.25rem', fontWeight: 500 }}>{price}</h1>
        )}
      </div>

      <div className="flex-1 space-y-2" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 className="text-sm font-medium" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tier.description}</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tier.features.map((feature, index) => (
            <li
              key={index}
              className={clsx('flex items-center gap-2 text-sm font-medium')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isHighlighted ? 'var(--bg)' : 'var(--muted)'
              }}
            >
              <BadgeCheck size={16} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <button
        className="btn btnPrimary w-full"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          ...(isHighlighted && {
            background: 'var(--bg)',
            color: 'var(--text)',
            borderColor: 'var(--bg)'
          })
        }}
      >
        {tier.cta}
        <ArrowRight size={16} />
      </button>
    </Card>
  )
}

const HighlightedBackground = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to right, rgba(79, 79, 79, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(79, 79, 79, 0.18) 1px, transparent 1px)',
      backgroundSize: '45px 45px',
      maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)'
    }}
  />
)

const PopularBackground = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(212, 180, 131, 0.15), rgba(255, 255, 255, 0))',
      pointerEvents: 'none'
    }}
  />
)
