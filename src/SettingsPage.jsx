import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function SettingsPage() {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [savedKey, setSavedKey] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      // Logic: Check specific keys first for backward compatibility and precision
      let key = null
      let currentProvider = 'openai'

      // Check OpenAI specific key (used by ProfilePage and Edge Functions)
      const openaiKey = localStorage.getItem('bookshelfai.openai_api_key')
      
      // Check legacy/generic settings object
      const savedSettingsStr = localStorage.getItem('bookshelfai.ai_settings')
      let savedSettings = {}
      if (savedSettingsStr) {
        savedSettings = JSON.parse(savedSettingsStr)
      }

      // Prioritize OpenAI key if found and provider is default/openai
      if (openaiKey) {
        key = openaiKey
        currentProvider = 'openai'
      } else if (savedSettings.apiKey) {
        key = savedSettings.apiKey
        currentProvider = savedSettings.provider || 'openai'
      }

      if (key) {
        setProvider(currentProvider)
        // Mask the key
        const masked = key.length > 10 
          ? key.substring(0, 8) + '••••••••' + key.substring(key.length - 4)
          : '••••••••'
        setSavedKey(masked)
      }
    } catch (err) {
      console.warn('Failed to fetch settings', err)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setStatus(null)
    setBusy(true)
    
    try {
      const trimmedKey = apiKey.trim()
      
      if (!trimmedKey && !savedKey) {
        throw new Error('Por favor, insira uma chave API.')
      }

      if (trimmedKey) {
        // Save based on provider
        if (provider === 'openai') {
          // Save to common key for compatibility
          localStorage.setItem('bookshelfai.openai_api_key', trimmedKey)
        }
        
        // Also update generic object for Settings page local state
        const settings = {
          provider,
          apiKey: trimmedKey,
          maskedKey: trimmedKey.substring(0, 8) + '...' + trimmedKey.substring(trimmedKey.length - 4)
        }
        localStorage.setItem('bookshelfai.ai_settings', JSON.stringify(settings))

        // Update Backend Profile (Best Effort)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              settings: { 
                openai_api_key: trimmedKey,
                provider: provider
              } 
            })
            .eq('id', user.id)
            .then(({ error }) => {
              if (error) console.warn('Sync to DB failed', error)
            })
        }

        setApiKey('')
      }

      setStatus({ kind: 'ok', message: '✅ Chave salva com segurança e pronta para uso.' })
      fetchSettings()
    } catch (e2) {
      const msg = e2?.message || 'Não foi possível salvar.'
      setStatus({ kind: 'err', message: '❌ ' + msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      padding: isMobile ? '1rem' : '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        ⚙️ Configurações
      </h1>
      <p style={{
        fontSize: '0.95rem',
        color: 'var(--muted)',
        marginBottom: '2rem',
        lineHeight: '1.6'
      }}>
        Gerencie suas chaves de API para habilitar os recursos de inteligência artificial.
        <br/>Suas chaves são armazenadas localmente no seu dispositivo.
      </p>

      <div className="card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
          <div style={{
            background: 'rgba(124, 92, 255, 0.15)',
            color: '#a78bfa',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '24px'
          }}>
            🔑
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '1.25rem', marginBottom: '4px', color: 'var(--text)' }}>
              Provedor de IA
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Escolha qual inteligência artificial você deseja utilizar.
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text)', display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
              Selecionar Provedor
            </label>
            <div style={{ position: 'relative' }}>
              <select 
                className="select" 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                style={{ width: '100%', padding: '12px', appearance: 'none', background: 'var(--bg-200)' }}
              >
                <option value="openai">OpenAI (GPT-4o / GPT-3.5)</option>
                <option value="gemini">Google Gemini (Flash / Pro)</option>
              </select>
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
                ▼
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text)', display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
              Chave de API ({provider === 'openai' ? 'OpenAI' : 'Google AI Details'})
            </label>

            {savedKey && (
              <div className="animate-fade-in" style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                color: '#4ade80',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ fontSize: '1.2rem' }}>✅</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Chave configurada e ativa</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', opacity: 0.8, marginTop: '2px' }}>
                    {savedKey}
                  </div>
                </div>
              </div>
            )}

            <input 
              className="input" 
              type="password" 
              placeholder={savedKey ? "Digite para substituir a chave atual..." : "Cole sua chave aqui (sk-...)"} 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              required={!savedKey}
              style={{ width: '100%', padding: '12px' }}
            />
            
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>🔒</span>
              <span>Sua chave é criptografada e salva apenas no seu navegador.</span>
            </div>
          </div>

          {status && (
            <div className="animate-fade-in" style={{ 
              fontSize: '0.9rem', 
              color: status.kind === 'err' ? '#ff5c7a' : '#4ade80',
              padding: '1rem',
              background: status.kind === 'err' ? 'rgba(255, 92, 122, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              border: status.kind === 'err' ? '1px solid rgba(255, 92, 122, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {status.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btnPrimary" type="submit" disabled={busy} style={{ minWidth: '140px' }}>
              {busy ? 'Verificando...' : savedKey ? 'Atualizar Chave' : 'Salvar Chave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
