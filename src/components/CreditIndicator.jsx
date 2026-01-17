import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Zap, Clock } from 'lucide-react'

export default function CreditIndicator({ userId }) {
  const [credits, setCredits] = useState(null) // null = loading
  const [resetDate, setResetDate] = useState(null)
  const [daysUntilReset, setDaysUntilReset] = useState(30)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!userId) return

    loadCredits()

    // Listen for custom event to refresh credits immediately
    const handleCreditsUpdated = (e) => {
      console.log('Credits updated event received:', e.detail)
      if (e.detail?.userId === userId) {
        if (e.detail.credits !== undefined) {
          setCredits(e.detail.credits)
        } else {
          loadCredits() // Fallback: reload from DB
        }
      }
    }
    window.addEventListener('creditsUpdated', handleCreditsUpdated)

    // Real-time subscription for credit updates
    const channel = supabase
      .channel(`credits-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        console.log('Credit update received:', payload)
        if (payload.new) {
          const tier = payload.new.subscription_tier
          if (tier !== 'free') {
            setCredits(999)
          } else {
            setCredits(payload.new.ai_credits_remaining ?? 0)
          }
          if (payload.new.credits_reset_date) {
            const newResetDate = new Date(payload.new.credits_reset_date)
            setResetDate(newResetDate)
            updateCountdown(newResetDate)
          }
        }
      })
      .subscribe()

    // Atualizar countdown a cada hora
    const interval = setInterval(updateCountdown, 3600000)
    
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdated)
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [userId])


  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_credits_remaining, credits_reset_date, subscription_tier')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        // Usuários premium têm créditos ilimitados
        if (data.subscription_tier !== 'free') {
          setCredits(999)
          return
        }

        setCredits(data.ai_credits_remaining || 0)
        setResetDate(new Date(data.credits_reset_date))
        updateCountdown(new Date(data.credits_reset_date))
      }
    } catch (error) {
      console.error('Erro ao carregar créditos:', error)
    }
  }

  const updateCountdown = (resetDateParam) => {
    const reset = resetDateParam || resetDate
    if (!reset) return

    const now = new Date()
    const diff = reset - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    setDaysUntilReset(Math.max(0, days))
  }

  const getCreditColor = () => {
    if (credits === null) return 'var(--muted)' // Loading
    if (credits === 999) return 'var(--brand)' // Premium
    if (credits > 6) return '#10b981' // Verde (70%+)
    if (credits > 3) return '#f59e0b' // Amarelo (30-70%)
    return '#ef4444' // Vermelho (<30%)
  }

  const getCreditIcon = () => {
    if (credits === null) return '...'
    if (credits === 999) return '∞'
    return credits
  }

  // Show minimal loading state
  const isLoading = credits === null

  return (
    <div
      style={{
        position: 'relative',
        padding: '8px 12px',
        background: 'var(--panel-2)',
        borderRadius: '8px',
        marginBottom: '12px',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={16} style={{ color: getCreditColor() }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: getCreditColor() }}>
              {getCreditIcon()}
            </span>
            {credits !== 999 && (
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/ 10</span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
            {credits === 999 ? 'Créditos ilimitados' : 'Créditos IA'}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && credits !== 999 && (
        <div
          style={{
            position: 'absolute',
            left: '110%',
            top: '0',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Clock size={14} style={{ color: 'var(--brand)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
              Reset em {daysUntilReset} {daysUntilReset === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
            Você tem <strong style={{ color: getCreditColor() }}>{credits} créditos</strong> restantes
            para gerar conteúdo com IA este mês.
          </p>
          {credits === 0 && (
            <p style={{ fontSize: '11px', color: '#ef4444', margin: '8px 0 0', lineHeight: 1.4 }}>
              Faça upgrade para o plano Premium e tenha créditos ilimitados!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
