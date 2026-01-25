import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import InfiniteGridBackground from './InfiniteGridBackground'
import AIAgentsHome from './AIAgentsHome'
import LibraryPage from './LibraryPage'
import ProfilePage from './ProfilePage'
import SettingsPage from './SettingsPage'
import PricingPage from './PricingPage'
import LandingPage from './LandingPage'
import CreditIndicator from './components/CreditIndicator'
import { Bot, Library, Settings, User as UserIcon, LogOut, BookOpen, Mail, CreditCard, Menu, X } from 'lucide-react'

function Auth({ onAuthed }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
      if (error) throw error
    } catch (e) {
      setError(e?.message || 'Erro ao fazer login com Google')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        // Forgot password - send reset email
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`
        })
        if (err) throw err
        setSuccessMsg(`Enviamos um link de redefinição de senha para ${email}. Verifique sua caixa de entrada!`)
        setPassword('')
      } else if (mode === 'signup') {
        const finalUsername = username || email.split('@')[0]
        const { error: err } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: finalUsername
            }
          }
        })
        if (err) throw err
        // Salvar no localStorage como fallback para quando o perfil for carregado
        localStorage.setItem('bookshelfai.pendingUsername', finalUsername)
        setSuccessMsg(`Cadastro realizado! Verifique o e-mail enviado para ${email} para confirmar sua conta.`)
        setPassword('')
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

          {successMsg ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'rgba(99, 102, 241, 0.1)', 
                color: 'var(--brand)',
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '24px'
              }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text)' }}>Verifique seu e-mail</h3>
              <p className="muted" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                {successMsg}
              </p>
              <button 
                className="btn btnPrimary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setSuccessMsg(null)
                  setMode('signin')
                }}
              >
                Voltar para Login
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px',
                  background: 'white',
                  color: '#1f1f1f',
                  border: '1px solid #dadce0',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continuar com Google
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '8px 0'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
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
              {mode !== 'forgot' && (
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Senha</label>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              )}
              {mode === 'forgot' && (
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--muted)',
                  lineHeight: '1.5'
                }}>
                  Digite seu email acima e clique em "Enviar" para receber um link de redefinição de senha.
                </div>
              )}
              {error ? <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div> : null}
              
              {/* Forgot password link - only on signin mode */}
              {mode === 'signin' && (
                <button 
                  type="button" 
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'right',
                    padding: 0,
                    marginTop: '-8px'
                  }}
                >
                  Esqueci minha senha
                </button>
              )}
              
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <button className="btn" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                  {mode === 'forgot' ? 'Voltar ao login' : mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}
                </button>
                <button className="btn btnPrimary" type="submit" disabled={busy}>
                  {busy ? 'Aguarde…' : mode === 'forgot' ? 'Enviar link' : mode === 'signin' ? 'Entrar' : 'Cadastrar'}
                </button>
              </div>
            </form>
            </>
          )}
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [showAuth, setShowAuth] = useState(false) // To control landing vs auth screen

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Listen for navigation events from child components
  useEffect(() => {
    function handleNavigate(e) {
      if (e.detail) {
        setCurrentPage(e.detail)
      }
    }
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  // Load profile when session exists
  useEffect(() => {
    if (session?.user) {
      loadUserProfile(session.user)
    }
  }, [session])

  async function loadUserProfile(user, directData = null) {
    // If direct data is provided (from ProfilePage save), use it immediately
    if (directData) {
      const profile = { 
        id: user.id,
        username: directData.username, 
        email: user.email 
      }
      setUserProfile(profile)
      // Cache for faster next load
      localStorage.setItem('bookshelfai.cachedProfile', JSON.stringify(profile))
      localStorage.removeItem('bookshelfai.pendingUsername')
      return
    }

    // Check for pending username from signup
    const pendingUsername = localStorage.getItem('bookshelfai.pendingUsername')
    
    // Get username from auth metadata (set during signup)
    const metadataUsername = user.user_metadata?.username

    // Cache-first: show cached data immediately to avoid delay
    const cachedProfile = localStorage.getItem('bookshelfai.cachedProfile')
    if (cachedProfile) {
      try {
        const cached = JSON.parse(cachedProfile)
        if (cached.id === user.id) {
          setUserProfile(cached)
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // Then fetch fresh data from DB
    const { data, error } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    
    // Check localStorage for user-set username (set via ProfilePage or signup)
    const localStorageUsername = localStorage.getItem('bookshelfai.username')
    
    // Determine the best username to use
    // Priority: pendingUsername (just signed up) > localStorage (user set it) > metadata > db > email
    const bestUsername = pendingUsername || localStorageUsername || metadataUsername || data?.username || 
                         user.email.split('@')[0]
    
    // If there's a better username than what's in the DB, update the DB
    const dbNeedsUpdate = data?.username && bestUsername !== data.username
    if (!error && data) {
      // Profile exists - sync if username in DB differs from best username
      if (dbNeedsUpdate || data.username?.startsWith('user_') || !data.username) {
        await supabase.from('profiles').update({ username: bestUsername }).eq('id', user.id)
      }
    } else if (error?.code === 'PGRST116') {
      // Profile doesn't exist - create it (trigger may have failed)
      await supabase.from('profiles').insert({ id: user.id, username: bestUsername })
    }
    
    const profile = { id: user.id, username: bestUsername, email: user.email }
    setUserProfile(profile)
    
    // Update caches and clear pending
    localStorage.setItem('bookshelfai.cachedProfile', JSON.stringify(profile))
    localStorage.setItem('bookshelfai.username', bestUsername)
    localStorage.removeItem('bookshelfai.pendingUsername')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setShowAuth(false) // Reset to landing page
  }

  // If not authenticated, show landing page or auth
  if (!session) {
    if (!showAuth) {
      return (
        <LandingPage 
          onLogin={() => setShowAuth(true)}
          onSignup={() => setShowAuth(true)}
        />
      )
    }
    
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
      
      {/* Mobile Header with Hamburger */}
      <div style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0 1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        '@media (max-width: 768px)': { display: 'flex' }
      }} className="mobile-header">
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          {showMobileSidebar ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          BookshelfAI
        </div>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </div>

      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 900, /* BELOW sidebar (999) so it doesn't block clicks */
            display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      <div className="container">
        {/* Sidebar */}
        <aside className="sidebar" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          zIndex: 999
        }} data-mobile-open={showMobileSidebar}>
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
              active={currentPage === 'planos'} 
              onClick={() => setCurrentPage('planos')}
              icon={<CreditCard size={20} />}
              label="Planos"
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
            {/* Credit Indicator */}
            <CreditIndicator userId={userProfile?.id} />
            
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
          {currentPage === 'planos' && <PricingPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'profile' && <ProfilePage onProfileUpdate={(data) => session?.user && loadUserProfile(session.user, data)} />}
        </main>
      </div>
    </>
  )
}
