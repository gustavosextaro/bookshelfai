import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Settings, Shield, Users, Activity } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    checkAdminStatus()
  }, [])

  async function checkAdminStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setIsAdmin(user.email === 'gustavosextaro@gmail.com')
      }
    } catch (err) {
      console.warn('Failed to check admin status', err)
    }
  }

  return (
    <div style={{ 
      flex: 1, 
      padding: isMobile ? '1.5rem' : '2.5rem 3rem', 
      overflowY: 'auto',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%'
    }}>
      <h1 style={{
        fontSize: isMobile ? '1.75rem' : '2rem',
        fontWeight: '700',
        marginBottom: '0.75rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Settings size={28} style={{ flexShrink: 0 }} /> Configurações
      </h1>
      <p style={{
        fontSize: '0.95rem',
        color: 'var(--muted)',
        marginBottom: '2rem',
        lineHeight: '1.6'
      }}>
        Configure as preferências do seu BookshelfAI.
      </p>

      {/* Admin Panel - Only visible for admin */}
      {isAdmin && (
        <div className="card" style={{ 
          padding: '2rem', 
          border: '1px solid rgba(124, 92, 255, 0.3)',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.05) 0%, rgba(102, 126, 234, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
            <div style={{
              background: 'rgba(124, 92, 255, 0.15)',
              color: '#a78bfa',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '24px'
            }}>
              <Shield size={24} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1.25rem', marginBottom: '4px', color: 'var(--text)' }}>
                Painel de Admin
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Você tem acesso administrativo ao sistema
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
            {/* User Stats Card */}
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-200)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Users size={20} style={{ color: '#a78bfa' }} />
                <span style={{ fontWeight: '600', color: 'var(--text)' }}>Estatísticas de Usuários</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Em desenvolvimento - estatísticas de uso do sistema aparecerão aqui
              </div>
            </div>

            {/* System Activity Card */}
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-200)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Activity size={20} style={{ color: '#a78bfa' }} />
                <span style={{ fontWeight: '600', color: 'var(--text)' }}>Atividade do Sistema</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Monitoramento de API e métricas aparecerão aqui
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}>
          Configurações Gerais
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {user ? (
            <>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text)' }}>Email:</strong> {user.email}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text)' }}>Conta:</strong> {isAdmin ? '🔑 Administrador' : '✅ Ativa'}
              </p>
            </>
          ) : (
            <p>Carregando informações da conta...</p>
          )}
        </div>
      </div>
    </div>
  )
}
