import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Settings, Shield, Users, Activity, CheckCircle, XCircle, RefreshCw, Crown } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // Admin panel states
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [apiStatus, setApiStatus] = useState({ checking: false, status: null, error: null })

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
      const { data: { user, session } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // VERIFICAÇÃO SEGURA: Chama backend para verificar admin
        const response = await fetch('/api/check-admin', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const { isAdmin } = await response.json()
          setIsAdmin(isAdmin)
          if (isAdmin) {
            loadAllUsers()
            checkApiHealth()
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check admin status', err)
    }
  }

  async function loadAllUsers() {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, subscription_tier, ai_credits_remaining, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get emails from auth (via RPC if available) or use profile data
      const usersWithInfo = await Promise.all(
        (data || []).map(async (profile) => {
          // Try to get user email from auth.users via admin function
          return {
            ...profile,
            email: profile.username || 'Sem email'
          }
        })
      )

      setAllUsers(usersWithInfo)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function checkApiHealth() {
    setApiStatus({ checking: true, status: null, error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'chat',
          customPrompt: 'ping',
          context: 'produtor',
          conversationHistory: []
        })
      })

      if (res.ok) {
        setApiStatus({ checking: false, status: 'ok', error: null })
      } else {
        const data = await res.json()
        setApiStatus({ checking: false, status: 'error', error: data.error || 'API Error' })
      }
    } catch (err) {
      setApiStatus({ checking: false, status: 'error', error: err.message })
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

          {/* API Health Check */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-200)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={20} style={{ color: '#a78bfa' }} />
              <span style={{ fontWeight: '600', color: 'var(--text)' }}>OpenAI API Status</span>
              {apiStatus.checking ? (
                <RefreshCw size={16} style={{ color: 'var(--muted)', animation: 'spin 1s linear infinite' }} />
              ) : apiStatus.status === 'ok' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                  <CheckCircle size={16} /> Funcionando
                </span>
              ) : apiStatus.status === 'error' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                  <XCircle size={16} /> Erro: {apiStatus.error}
                </span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>Não verificado</span>
              )}
            </div>
            <button
              onClick={checkApiHealth}
              disabled={apiStatus.checking}
              style={{
                padding: '6px 12px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {apiStatus.checking ? 'Verificando...' : 'Verificar'}
            </button>
          </div>

          {/* Users Table */}
          <div style={{
            padding: '1.5rem',
            background: 'var(--bg-200)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={20} style={{ color: '#a78bfa' }} />
                <span style={{ fontWeight: '600', color: 'var(--text)' }}>Usuários Registrados ({allUsers.length})</span>
              </div>
              <button
                onClick={loadAllUsers}
                disabled={loadingUsers}
                style={{
                  padding: '6px 12px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {loadingUsers ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>

            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                Carregando usuários...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500' }}>Username</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500' }}>Plano</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--muted)', fontWeight: '500' }}>Créditos</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500' }}>Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.subscription_tier === 'enterprise' ? 1 : 0.9 }}>
                        <td style={{ padding: '12px 8px', color: 'var(--text)' }}>
                          {u.username || 'Sem nome'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: u.subscription_tier === 'enterprise' ? 'rgba(212, 180, 131, 0.15)' : 
                                       u.subscription_tier === 'premium' ? 'rgba(99, 102, 241, 0.15)' : 
                                       'rgba(100, 116, 139, 0.15)',
                            color: u.subscription_tier === 'enterprise' ? '#d4b483' : 
                                   u.subscription_tier === 'premium' ? '#818cf8' : 
                                   '#94a3b8'
                          }}>
                            {u.subscription_tier === 'enterprise' && <Crown size={12} />}
                            {(u.subscription_tier || 'free').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text)' }}>
                          {u.subscription_tier === 'enterprise' ? '∞' : (u.ai_credits_remaining ?? 10)}
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: '12px' }}>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
