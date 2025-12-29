import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import InfiniteGridBackground from './InfiniteGridBackground'
import AIAgentsHome from './AIAgentsHome'
import LibraryPage from './LibraryPage'
import ProfilePage from './ProfilePage'

function Auth({ onAuthed }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: username || email.split('@')[0]
            }
          }
        })
        if (err) throw err
        onAuthed()
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onAuthed()
      }
    } catch (e2) {
      setError(e2?.message || 'Erro ao autenticar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ gridTemplateColumns: '1fr' }}>
      <main className="main" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="card" style={{ width: 'min(520px, 100%)', padding: 24 }}>
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              BookshelfAI
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              Seu cérebro de conteúdo com IA
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Nome de usuário</label>
                <input className="input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Como quer ser chamado?" />
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Ex: Gustavo, Maria, João...</div>
              </div>
            )}
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div> : null}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}
              </button>
              <button className="btn btnPrimary" type="submit" disabled={busy}>
                {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [currentPage, setCurrentPage] = useState('ai-agents') // 'ai-agents', 'library', 'profile'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (!session) {
    return (
      <>
        <InfiniteGridBackground />
        <Auth onAuthed={() => {}} />
      </>
    )
  }

  return (
    <>
      <InfiniteGridBackground />
      <div className="container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700',
              marginBottom: '4px',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              BookshelfAI
            </div>
            <div className="muted" style={{ fontSize: '12px' }}>Cérebro de Conteúdo</div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
            <button 
              className={currentPage === 'ai-agents' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setCurrentPage('ai-agents')}
            >
              🧠 Agentes de IA
            </button>
            <button 
              className={currentPage === 'library' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setCurrentPage('library')}
            >
              📚 Biblioteca
            </button>
            <button 
              className={currentPage === 'profile' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setCurrentPage('profile')}
            >
              👤 Perfil
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button className="btn" onClick={handleSignOut} style={{ width: '100%' }}>
              ← Sair
            </button>
          </div>

          <div className="muted" style={{ fontSize: '11px', marginTop: '20px', lineHeight: '1.5' }}>
            Transforme seus livros em conteúdo viral com IA inteligente
          </div>
        </aside>

        {/* Main Content */}
        <main className="main">
          {currentPage === 'ai-agents' && <AIAgentsHome />}
          {currentPage === 'library' && <LibraryPage />}
          {currentPage === 'profile' && <ProfilePage />}
        </main>
      </div>
    </>
  )
}
