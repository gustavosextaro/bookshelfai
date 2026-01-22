import React, { useMemo, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { runAiAction, saveAiSettings, getAiSettings } from './aiClient'
import { getUserProfile, updateUserProfile, getUserStats } from './profileClient'
import InfiniteGridBackground from './InfiniteGridBackground'
import { Brain, Lightbulb, Library, CheckCircle2, User, BarChart3, Edit, CreditCard } from 'lucide-react'
import PricingPage from './PricingPage'

// Constants
const GOAL_DEFAULT = 12

// Helpers
function safeParseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function formatDate(iso) {
  if (!iso) return 'não disponível'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'não disponível'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(d)
}

function monthKeyFromIso(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function yearFromIso(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getFullYear()
}

function normalizeCover(url) {
  if (!url) return null
  return url.replace(/^http:/, 'https:')
}

async function fetchBookFromGoogle(title) {
  const q = encodeURIComponent(title.trim())
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao consultar Google Books')
  const data = await res.json()
  const item = data?.items?.[0]
  if (!item) return null

  const v = item.volumeInfo || {}
  const pages = Number(v.pageCount)

  return {
    googleBooksId: item.id ?? null,
    title: v.title ?? title,
    authors: Array.isArray(v.authors) ? v.authors : [],
    pages: Number.isFinite(pages) ? pages : null,
    coverUrl: normalizeCover(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null),
    publishedDate: v.publishedDate ?? null,
    language: v.language ?? null,
    description: v.description ?? null,
    categories: Array.isArray(v.categories) ? v.categories : [],
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function Progress({ value, max }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  return (
    <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="progressFill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div
      className="modalOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="card modal">{children}</div>
    </div>
  )
}

function Cover({ title, coverUrl }) {
  return (
    <div className="coverWrap" aria-label={title}>
      {coverUrl ? (
        <img className="cover" src={coverUrl} alt={title} loading="lazy" />
      ) : (
        <div className="coverFallback">
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sem capa</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {title || 'não disponível'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
        <div className="card" style={{ width: 'min(520px, 100%)', padding: 16 }}>
          <div className="header" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="/icon.png" 
                alt="BookshelfAI" 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  objectFit: 'contain' 
                }} 
              />
              <div>
                <div className="h1">BookshelfAI</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Entre para salvar sua biblioteca e usar a IA.
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Nome de usuário</label>
                <input className="input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu nome" />
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Como você quer ser chamado no app</div>
              </div>
            )}
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <div className="muted" style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div> : null}
            <div className="row" style={{ justifyContent: 'space-between' }}>
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

function AiSettings({ onSaved }) {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setStatus(null)
    setBusy(true)
    try {
      await saveAiSettings({ provider, apiKey })
      setApiKey('')
      setStatus({ kind: 'ok', message: 'Chave salva com segurança.' })
      fetchSettings() // refresh
      onSaved?.()
    } catch (e2) {
      const msg = e2?.message || 'Não foi possível salvar.'
      setStatus({ kind: 'err', message: msg })
    } finally {
      setBusy(false)
    }
  }

  const [savedKey, setSavedKey] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const data = await getAiSettings()
      if (data.provider) setProvider(data.provider)
      if (data.hasKey) {
        setSavedKey(data.maskedKey || '••••••••')
      }
    } catch (err) {
      // ignore silently or log
      console.warn('Failed to fetch settings', err)
    }
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 800 }}>Configurações de IA</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Configure sua chave para gerar conteúdo.</div>

      <form onSubmit={handleSave} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        <div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Provedor</label>
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>API Key</label>

          {savedKey && (
            <div style={{
              marginBottom: 8,
              padding: '8px 12px',
              background: 'rgba(0, 255, 128, 0.1)',
              border: '1px solid rgba(0, 255, 128, 0.2)',
              borderRadius: 8,
              color: '#4ade80',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 4 }} /> <span>Chave salva:</span>
              <span style={{ fontFamily: 'monospace' }}>{savedKey}</span>
            </div>
          )}

          <input className="input" type="password" placeholder={savedKey ? "Substituir chave existente..." : "Cole sua API Key aqui"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} required={!savedKey} />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Nunca compartilhamos sua chave.</div>
        </div>
        {status ? <div className="muted" style={{ fontSize: 12, color: status.kind === 'err' ? 'var(--danger)' : 'green' }}>{status.message}</div> : null}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btnPrimary" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}

function AiPanel({ totalBooks, onClose }) {
  const [actionType, setActionType] = useState('script')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [metadata, setMetadata] = useState(null)

  if (totalBooks === 0) return <div className="card" style={{ padding: 20 }}>Adicione pelo menos um livro primeiro.</div>

  async function run() {
    setResult(null)
    setBusy(true)
    try {
      const payload = await runAiAction({
        actionType
      })
      setResult({ kind: 'ok', output: payload?.output || '' })
      setMetadata(payload?.metadata || null)
    } catch (e2) {
      console.error('AI Error:', e2)
      // Try to extract the most useful message
      let msg = e2?.message || 'Erro na geração.'
      if (e2?.details && typeof e2.details === 'string') {
        msg += ` (${e2.details})`
      } else if (e2?.details?.error) {
        // Should catch { error: "..." } from edge function
        msg = e2.details.error
      }
      setResult({ kind: 'err', message: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Brain size={18} /> Amplificador Intelectual</div>
        {onClose && <button className="btn" onClick={onClose}>Fechar</button>}
      </div>

      <div style={{ 
        padding: '12px 14px', 
        background: 'rgba(139, 92, 246, 0.15)', 
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: 10,
        marginBottom: 14,
        fontSize: 13,
        lineHeight: 1.5,
        color: '#c4b5fd'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={16} /> Análise de Repertório Completo</div>
        A IA vai analisar <strong>TODOS os {totalBooks} livros</strong> da sua biblioteca para:
        <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
          <li>Identificar padrões e teses dominantes</li>
          <li>Detectar contradições e tensões intelectuais</li>
          <li>Sintetizar uma visão única e coerente</li>
          <li>Evitar repetição de ideias já usadas</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Tipo de Conteúdo</label>
          <select className="select" value={actionType} onChange={e => setActionType(e.target.value)}>
            <option value="script">Roteiro de Vídeo (Síntese da Biblioteca)</option>
            <option value="ideas">Ideias de Conteúdo</option>
            <option value="quotes">Frases Marcantes</option>
            <option value="questions">Perguntas para Debate</option>
          </select>
        </div>

        <button className="btn btnPrimary" onClick={run} disabled={busy}>
          {busy ? 'Analisando...' : `Gerar com Base em ${totalBooks} Livros`}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
          {result.kind === 'ok' ? (
            <div>
              {metadata && (
                <div style={{
                  marginBottom: 10, 
                  padding: '8px 10px', 
                  background: 'rgba(0, 255, 128, 0.05)', 
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#4ade80'
                }}>
                  <Library size={14} style={{ display: 'inline', marginRight: 4 }} /> Analisados: {metadata.booksAnalyzed} livros | Mais antigo: {metadata.oldestBook} | Mais recente: {metadata.newestBook}
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{result.output}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--danger)', fontSize: 14 }}>{result.message}</div>
          )}
        </div>
      )}
    </div>
  )
}

// =======================
// PROFILE TAB COMPONENTS
// =======================

function ProfileTab() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    setLoading(true)
    try {
      // Check localStorage first
      const savedUsername = localStorage.getItem('bookshelfai.username')
      
      const [profileData, statsData] = await Promise.all([
        getUserProfile(),
        getUserStats()
      ])
      
      // Use localStorage value if available
      if (savedUsername) {
        profileData.username = savedUsername
      }
      
      setProfile(profileData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Carregando perfil...</div>
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div className="h1" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><User size={28} /> Meu Perfil</div>

      {editing ? (
        <ProfileEditor 
          profile={profile} 
          onSave={async (updated) => {
            await updateUserProfile(updated)
            setProfile({ ...profile, ...updated })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#fff'
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  profile?.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{profile?.username || 'Usuário'}</div>
                <div className="muted" style={{ fontSize: 13 }}>Membro desde {new Date(profile?.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <button className="btn" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Edit size={16} /> Editar</button>
          </div>
        </div>
      )}

      <DashboardStats stats={stats?.stats} />
      <BookUsageList bookUsage={stats?.bookUsage} />
    </div>
  )
}

function ProfileEditor({ profile, onSave, onCancel }) {
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      // Priority 1: Save to localStorage immediately
      localStorage.setItem('bookshelfai.username', username)
      
      // Priority 2: Try backend update (best effort)
      await onSave({ username: username, avatar_url: profile?.avatar_url })
    } catch (err) {
      // Even if backend fails, localStorage succeeded
      console.warn('Backend update failed, but localStorage saved:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 14 }}>Editar Perfil</div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Nome de Usuário</label>
          <input 
            type="text" 
            className="input" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <button className="btn btnPrimary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button className="btn" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function DashboardStats({ stats }) {
  if (!stats) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={16} /> Estatísticas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Livros Lidos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#667eea' }}>{stats.total_books || 0}</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Conteúdos Gerados por IA</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#764ba2' }}>{stats.total_ai_generated || 0}</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Média por Livro</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f093fb' }}>{stats.avg_content_per_book?.toFixed(1) || '0.0'}</div>
        </div>
      </div>
    </div>
  )
}

function BookUsageList({ bookUsage }) {
  if (!bookUsage || bookUsage.length === 0) return null

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}><Library size={16} /> Uso por Livro</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {bookUsage.map((book, idx) => (
          <div 
            key={idx} 
            style={{ 
              padding: '12px 16px', 
              borderBottom: idx < bookUsage.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10,
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{book.book_title}</div>
              {book.last_ai_generated && (
                <div className="muted" style={{ fontSize: 11 }}>Último uso: {new Date(book.last_ai_generated).toLocaleDateString('pt-BR')}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>{book.ai_count || 0}</div>
              <div className="muted" style={{ fontSize: 10 }}>conteúdos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [books, setBooks] = useState([])
  const [goal, setGoal] = useState(GOAL_DEFAULT)
  const [loadingBooks, setLoadingBooks] = useState(false)

  const [page, setPage] = useState('library') // 'library', 'profile'
  const [selectedBook, setSelectedBook] = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [titleInput, setTitleInput] = useState('')
  const [readDateInput, setReadDateInput] = useState(() => new Date().toISOString().split('T')[0])

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Filters state
  const [query, setQuery] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [sortDir, setSortDir] = useState('desc')

  // Auth & Init
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Check auth and load books
  useEffect(() => {
    if (session?.user) {
      loadBooks()
      const raw = localStorage.getItem('bookshelfai.goal.v1')
      const n = safeParseJson(raw, 12)
      if (Number.isFinite(n) && n >= 0) setGoal(n)
    } else {
      setBooks([])
    }
  }, [session])

  async function loadBooks() {
    setLoadingBooks(true)
    const { data } = await supabase.from('books').select('*').order('read_date', { ascending: false })
    if (data) setBooks(data)
    setLoadingBooks(false)
  }

  function handleGoalChange(value) {
    const n = Number(value)
    const next = Number.isFinite(n) && n >= 0 ? n : 0
    setGoal(next)
    localStorage.setItem('bookshelfai.goal.v1', JSON.stringify(next))
  }

  async function handleAddBook(e) {
    e.preventDefault()
    if (!titleInput.trim()) return
    setIsSaving(true)
    setSaveError(null)

    try {
      let enriched = {}
      try {
        enriched = await fetchBookFromGoogle(titleInput) || {}
      } catch (err) {
        console.error(err)
      }

      const newBook = {
        title: enriched.title || titleInput,
        read_date: readDateInput || null,
        pages: enriched.pages || null,
        cover_url: enriched.coverUrl || null,
        authors: enriched.authors || [],
        description: enriched.description || null,
        categories: enriched.categories || [],
        google_books_id: enriched.googleBooksId || null,
        published_date: enriched.publishedDate || null,
        language: enriched.language || null,
        user_id: session.user.id
      }

      const { data, error } = await supabase.from('books').insert(newBook).select().single()
      if (error) throw error

      setBooks([data, ...books])
      setTitleInput('')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (!error) {
      setBooks(books.filter(b => b.id !== id))
      setSelectedBook(null)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  // --- DERIVED STATE ---
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const booksThisYear = useMemo(() => {
    return books.filter((b) => yearFromIso(b.read_date) === currentYear)
  }, [books, currentYear])

  const booksThisMonth = useMemo(() => {
    return books.filter((b) => monthKeyFromIso(b.read_date) === currentMonthKey)
  }, [books, currentMonthKey])

  const yearsAvailable = useMemo(() => {
    const set = new Set()
    for (const b of books) {
      const y = yearFromIso(b.read_date)
      if (y) set.add(String(y))
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [books])

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = books

    if (q) {
      list = list.filter((b) => (b.title || '').toLowerCase().includes(q))
    }

    if (filterYear) {
      list = list.filter((b) => String(yearFromIso(b.read_date) ?? '') === filterYear)
    }

    if (filterMonth && filterYear) {
      const mk = `${filterYear}-${filterMonth}`
      list = list.filter((b) => monthKeyFromIso(b.read_date) === mk)
    }

    list = [...list].sort((a, b) => {
      const da = new Date(a.read_date || 0).getTime()
      const db = new Date(b.read_date || 0).getTime()
      return sortDir === 'asc' ? da - db : db - da
    })

    return list
  }, [books, query, filterYear, filterMonth, sortDir])

  if (!session) return <Auth onAuthed={() => { }} />

  return (
    <>
      <InfiniteGridBackground />
      <div className="container">
      <aside className="sidebar">
        <div className="header">
          <div className="h1">Minha Estante</div>
          <div className="muted">{session.user.email}</div>
        </div>

        <div className="card" style={{ padding: 10, display: 'grid', gap: 8 }}>
          <button className="btn" onClick={() => { setPage('library'); setSelectedBook(null); setShowAiPanel(false) }}>Minha Biblioteca</button>
          <button className="btn" onClick={() => setPage('planos')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} /> Planos</button>
          <button className="btn" onClick={() => setPage('profile')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={16} /> Perfil</button>
          <button className="btn" onClick={handleSignOut}>Sair</button>
        </div>

        {/* RESTORED: Detailed Goal Dashboard */}
        <div className="card" style={{ padding: 14 }}>
          <div className="h2" style={{ marginBottom: 10 }}>Meta Anual</div>
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <input
              className="input"
              type="number"
              min={0}
              value={goal}
              onChange={e => handleGoalChange(e.target.value)}
            />
            <div className="muted">livros</div>
          </div>
          <Progress value={booksThisYear.length} max={goal} />

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="muted">Lidos no mês</div>
              <div style={{ fontWeight: 700 }}>{booksThisMonth.length}</div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="muted">Lidos no ano</div>
              <div style={{ fontWeight: 700 }}>{booksThisYear.length}</div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="muted">Total</div>
              <div style={{ fontWeight: 700 }}>{books.length}</div>
            </div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Dica: Adicione livros para gerar conteúdo com IA.
        </div>
      </aside>

      <main className="main">
        {page === 'profile' ? (
          <ProfileTab />
        ) : page === 'ai_settings' ? (
          <AiSettings />
        ) : page === 'planos' ? (
          <PricingPage />
        ) : (
          <>
            <form className="card form" onSubmit={handleAddBook}>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Novo Livro</label>
                <input className="input" placeholder="Título..." value={titleInput} onChange={e => setTitleInput(e.target.value)} disabled={isSaving} />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12 }}>Data de Leitura</label>
                <input className="input" type="date" value={readDateInput} onChange={e => setReadDateInput(e.target.value)} disabled={isSaving} />
              </div>
              <button className="btn btnPrimary" type="submit" disabled={isSaving}>{isSaving ? 'Adicionando...' : 'Adicionar'}</button>
              {saveError && <div style={{ color: 'red', fontSize: 12 }}>{saveError}</div>}
            </form>

            <div style={{ height: 10 }} />

            {/* RESTORED: Toolbar with Filters */}
            <div className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Biblioteca</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {visibleBooks.length} itens exibidos
                  </div>
                </div>
              </div>

              <div className="toolbar" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="Buscar por título…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <select className="select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  <option value="">Todos os anos</option>
                  {yearsAvailable.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <select
                  className="select"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  disabled={!filterYear}
                  title={!filterYear ? 'Selecione um ano primeiro' : ''}
                >
                  <option value="">Todos os meses</option>
                  <option value="01">Jan</option>
                  <option value="02">Fev</option>
                  <option value="03">Mar</option>
                  <option value="04">Abr</option>
                  <option value="05">Mai</option>
                  <option value="06">Jun</option>
                  <option value="07">Jul</option>
                  <option value="08">Ago</option>
                  <option value="09">Set</option>
                  <option value="10">Out</option>
                  <option value="11">Nov</option>
                  <option value="12">Dez</option>
                </select>

                <select className="select" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                  <option value="desc">Mais recentes</option>
                  <option value="asc">Mais antigos</option>
                </select>
              </div>
            </div>

            <div style={{ height: 20 }} />

            {loadingBooks && <div className="muted" style={{ textAlign: 'center', padding: 20 }}>Carregando...</div>}

            <div className="grid">
              {visibleBooks.map(book => (
                <div key={book.id} className="card bookCard" onClick={() => setSelectedBook(book)}>
                  <Cover title={book.title} coverUrl={book.cover_url} />
                  <div className="bookMeta">
                    <div className="bookTitle">{book.title}</div>
                    <div className="row" style={{ gap: 8, fontSize: 11, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className="muted">📅 {formatDate(book.read_date)}</span>
                      {book.pages && <span className="muted">📖 {book.pages} pgs</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Modal open={!!selectedBook} onClose={() => setSelectedBook(null)}>
              {selectedBook && (
                <div style={{ display: 'grid', gap: 20 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="h1" style={{ fontSize: 18 }}>{selectedBook.title}</div>
                    <button className="btn" onClick={() => setSelectedBook(null)}>Fechar</button>
                  </div>

                  <div className="modalGrid">
                    <div style={{ display: 'grid', justifyItems: 'center' }}>
                      <Cover title={selectedBook.title} coverUrl={selectedBook.cover_url} />
                      <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span className="badge">📅 {formatDate(selectedBook.read_date)}</span>
                        <span className="badge">📖 {selectedBook.pages || '?'} pgs</span>
                        {selectedBook.published_date && (
                          <span className="badge">📆 {selectedBook.published_date}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* RESTORED: Richer Details with Badges */}
                      <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>
                        {selectedBook.title}
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                          <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Edit size={14} /> {selectedBook.authors?.length ? selectedBook.authors.join(', ') : 'N/A'}</span>
                          <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Library size={14} /> {selectedBook.categories?.length ? selectedBook.categories.join(', ') : 'N/A'}</span>
                          {selectedBook.google_books_id && (
                            <a
                              href={`https://www.google.com/books/edition/_/${selectedBook.google_books_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge"
                              style={{ cursor: 'pointer', textDecoration: 'none', background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.3)' }}
                            >
                              🔍 Ver no Google Books
                            </a>
                          )}
                        </div>

                        <div className="row" style={{ marginTop: 10 }}>
                          <button className="btn btnPrimary" onClick={() => setShowAiPanel(!showAiPanel)}>
                            ✨ {showAiPanel ? 'Ocultar IA' : 'Painel de IA'}
                          </button>
                          <button className="btn" style={{ color: 'red', marginLeft: 10 }} onClick={() => handleDelete(selectedBook.id)}>Excluir</button>
                        </div>

                        {showAiPanel && (
                          <AiPanel totalBooks={books.length} onClose={() => setShowAiPanel(false)} />
                        )}
                        {selectedBook.description && (
                          <div className="card" style={{ padding: 10, background: 'rgba(255,255,255,0.05)', marginTop: 10 }}>
                            <div className="muted" style={{ marginBottom: 5 }}>Sinopse</div>
                            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedBook.description}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Modal>
          </>
        )}
      </main>
    </div>
    </>
  )
}
