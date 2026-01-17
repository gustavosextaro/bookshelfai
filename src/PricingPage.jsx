import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Star } from 'lucide-react'
import confetti from 'canvas-confetti'
import NumberFlow from '@number-flow/react'
import { cn } from './lib/utils'
import { useMediaQuery } from './hooks/useMediaQuery'

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const toggleRef = useRef(null)

  const plans = [
    {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      yearlyTotal: 0,
      period: 'mês',
      features: [
        'Até 3 livros',
        '10 créditos IA mensais',
        'Anotações básicas',
        'Geração de resumos com IA',
        'Estatísticas de leitura',
        'Suporte por email',
      ],
      description: 'Para começar sua jornada de leitura',
      buttonText: 'Começar Grátis',
      href: '#',
      isPopular: false,
    },
    {
      name: 'Premium',
      monthlyPrice: 57.00,
      yearlyPrice: 16.42, // 197 / 12 = 16.42
      yearlyTotal: 197.00,
      period: 'mês',
      features: [
        'Livros ilimitados',
        'IA avançada para insights',
        'Geração de roteiros editoriais',
        'Brain visual interativo',
        'Análise de padrões de leitura',
        'Suporte prioritário',
        'Exportação avançada',
      ],
      description: 'Para leitores ávidos',
      buttonText: 'Assinar Premium',
      href: '#',
      isPopular: true,
    },
    {
      name: 'Enterprise',
      monthlyPrice: 87.00,
      yearlyPrice: 24.75, // 297 / 12 = 24.75
      yearlyTotal: 297.00,
      period: 'mês',
      features: [
        'Tudo do Premium',
        'Usuários ilimitados',
        'Suporte dedicado 24/7',
        'Treinamento personalizado',
        'SLA garantido',
        'Integração customizada',
        'API completa',
        'Dashboard analítico',
      ],
      description: 'Para empresas e instituições',
      buttonText: 'Falar com Vendas',
      href: '#',
      isPopular: false,
    },
  ]

  const handleToggle = (monthly) => {
    const wasMonthly = isMonthly
    setIsMonthly(monthly)
    
    // Confetti when switching to annual
    if (wasMonthly && !monthly && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ['#d4b483', '#8b7355', '#a67c52', '#c9a86a'],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle'],
      })
    }
  }

  // Calculate savings percentage for annual
  const getSavingsPercent = (plan) => {
    if (!plan.monthlyPrice) return 0
    const yearlyEquivalent = plan.monthlyPrice * 12
    const savings = ((yearlyEquivalent - plan.yearlyTotal) / yearlyEquivalent) * 100
    return Math.round(savings)
  }

  return (
    <div style={{ padding: '20px 20px 40px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>
          Planos Simples e Transparentes
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.5 }}>
          Escolha o plano que funciona para você
        </p>
      </div>

      {/* Toggle com botões clicáveis */}
      <div 
        ref={toggleRef}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          marginBottom: '28px', 
          gap: '0',
          padding: '4px',
          background: 'var(--panel-2)',
          borderRadius: '12px',
          maxWidth: '280px',
          margin: '0 auto 28px'
        }}
      >
        {/* Botão Mensal */}
        <button
          onClick={() => handleToggle(true)}
          style={{ 
            flex: 1,
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: isMonthly ? 'var(--bg)' : 'var(--muted)',
            background: isMonthly ? 'var(--brand)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Mensal
        </button>
        
        {/* Botão Anual */}
        <button
          onClick={() => handleToggle(false)}
          style={{ 
            flex: 1,
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: !isMonthly ? 'var(--bg)' : 'var(--muted)',
            background: !isMonthly ? 'var(--brand)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          Anual
          {isMonthly && (
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              color: 'var(--bg)',
              background: '#10b981',
              padding: '2px 5px',
              borderRadius: '4px'
            }}>
              -71%
            </span>
          )}
        </button>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
          gap: '14px',
          maxWidth: '1100px',
          margin: '0 auto',
          transform: isDesktop ? 'scale(0.98)' : 'scale(1)',
          transformOrigin: 'top center',
        }}
      >
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            animate={{
              y: plan.isPopular ? -15 : 0,
              opacity: 1,
            }}
            transition={{
              duration: 0.6,
              type: 'spring',
              stiffness: 100,
              damping: 20,
            }}
            className="card"
            style={{
              padding: '20px',
              position: 'relative',
              border: plan.isPopular ? '2px solid var(--brand)' : '1px solid var(--border)',
              borderRadius: '14px',
              background: 'var(--panel)',
              display: 'flex',
              flexDirection: 'column',
              marginTop: plan.isPopular ? 0 : 15,
              minHeight: '480px',
              maxHeight: '540px',
            }}
          >
            {plan.isPopular && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'var(--brand)',
                  padding: '4px 10px',
                  borderBottomLeftRadius: '10px',
                  borderTopRightRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Star size={12} style={{ fill: 'var(--bg)', color: 'var(--bg)' }} />
                <span style={{ color: 'var(--bg)', fontSize: '11px', fontWeight: 600 }}>
                  Popular
                </span>
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {plan.name}
              </p>

              <div style={{ marginTop: '18px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text)' }}>
                  {plan.price === 0 ? (
                    'Grátis'
                  ) : (
                    <NumberFlow
                      value={isMonthly ? plan.monthlyPrice : plan.yearlyPrice}
                      format={{
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                      transformTiming={{
                        duration: 500,
                        easing: 'ease-out',
                      }}
                      willChange
                    />
                  )}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                    / {plan.period}
                  </span>
                )}
              </div>

              {/* Pricing details */}
              {plan.monthlyPrice > 0 && (
                <div style={{ marginTop: '8px', minHeight: '40px' }}>
                  {isMonthly ? (
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                      cobrado mensalmente
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, margin: 0 }}>
                        R$ {plan.yearlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} à vista
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--muted)', margin: 0 }}>
                        economia de {getSavingsPercent(plan)}% vs mensal
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ul style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', padding: 0, flex: 1 }}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Check size={14} style={{ color: 'var(--brand)', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

              <button
                className={cn('btn', plan.isPopular && 'btnPrimary')}
                style={{
                  width: '100%',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '11px',
                  transition: 'all 0.3s ease',
                }}
              >
                {plan.buttonText}
              </button>

              <p style={{ marginTop: '12px', fontSize: '10px', color: 'var(--muted)', lineHeight: 1.4, textAlign: 'center' }}>
                {plan.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: 'var(--muted)' }}>
        Todos os planos incluem 14 dias de garantia. Cancele quando quiser.
      </p>
    </div>
  )
}
