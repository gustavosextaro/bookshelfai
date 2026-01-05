import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import InfiniteGridBackground from './InfiniteGridBackground'
import AIAgentsHome from './AIAgentsHome'
import LibraryPage from './LibraryPage'
import ProfilePage from './ProfilePage'
import SettingsPage from './SettingsPage'
import { Bot, Library, Settings, User as UserIcon, LogOut, BookOpen } from 'lucide-react'

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

function NavItem({ active, onClick, icon, label }) {
  return (
    <button 
      className={active ? 'btn btnPrimary' : 'btn'}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        justifyContent: 'flex-start',
        border: active ? undefined : '1px solid transparent', // clean look for inactive
        background: active ? undefined : 'transparent',
        textAlign: 'left'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [currentPage, setCurrentPage] = useState('ai-agents') // 'ai-agents', 'library', 'profile', 'settings'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Fetch basics when session exists
  useEffect(() => {
    if (session?.user) {
      loadUserProfile(session.user)
    }
  }, [session])

  async function loadUserProfile(user, directData = null) {
    // If direct data is provided (from ProfilePage save), use it immediately
    if (directData) {
      setUserProfile({ 
        username: directData.username, 
        email: user.email 
      })
      return
    }

    // Otherwise, fetch from DB
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    const username = data?.username || 
                     localStorage.getItem('bookshelfai.username') || 
                     user.email.split('@')[0]
    setUserProfile({ username, email: user.email })
  }

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
        <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '30px', paddingLeft: '8px' }}>
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
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <NavItem 
              active={currentPage === 'ai-agents'} 
              onClick={() => setCurrentPage('ai-agents')}
              icon={<Bot size={20} />}
              label="Agentes de IA"
            />
            <NavItem 
              active={currentPage === 'library'} 
              onClick={() => setCurrentPage('library')}
              icon={<Library size={20} />} // Changed from Book to Library
              label="Biblioteca"
            />
            <NavItem 
              active={currentPage === 'settings'} 
              onClick={() => setCurrentPage('settings')}
              icon={<Settings size={20} />}
              label="Configurações"
            />
          </nav>

          {/* User Profile Widget (Bottom) */}
          <div style={{ 
            borderTop: '1px solid var(--border)', 
            paddingTop: '16px', 
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <button 
              className={currentPage === 'profile' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setCurrentPage('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 12px',
                background: currentPage === 'profile' ? undefined : 'rgba(255,255,255,0.03)',
                border: currentPage === 'profile' ? undefined : '1px solid var(--border)',
                borderRadius: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                {userProfile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userProfile?.username || 'Usuário'}
                </div>
                <div className="muted" style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userProfile?.email}
                </div>
              </div>
            </button>

            <button 
              onClick={handleSignOut}
              className="btn"
              style={{ 
                width: '100%', 
                fontSize: '12px', 
                color: 'var(--muted)', 
                background: 'transparent', 
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {currentPage === 'ai-agents' && <AIAgentsHome user={session?.user} />}
          {currentPage === 'library' && <LibraryPage user={session?.user} />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'profile' && <ProfilePage onProfileUpdate={(data) => session?.user && loadUserProfile(session.user, data)} />}
        </main>
      </div>
    </>
  )
}
