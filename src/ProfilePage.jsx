import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({})
  const [scriptsByBook, setScriptsByBook] = useState([])
  const [editorialLine, setEditorialLine] = useState(null)
  const [generatingEditorial, setGeneratingEditorial] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Priority 1: Check localStorage first
    const savedUsername = localStorage.getItem('bookshelfai.username')
    
    // Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Use localStorage if available, otherwise fallback to database
    const displayUsername = savedUsername || profileData?.username || 'Usuário'
    setProfile({ ...(profileData || {}), username: displayUsername })
    setUsername(displayUsername)

    // Books count
    const { data: books } = await supabase
      .from('books')
      .select('id, read_date')
      .eq('user_id', user.id)

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const thisYear = books?.filter(b => {
      const d = new Date(b.read_date)
      return d.getFullYear() === currentYear
    }).length || 0

    const thisMonth = books?.filter(b => {
      const d = new Date(b.read_date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    }).length || 0

    // AI outputs
    const { data: outputs } = await supabase
      .from('ai_outputs')
      .select('type')
      .eq('user_id', user.id)

    const scripts = outputs?.filter(o => o.type === 'script').length || 0
    const summaries = outputs?.filter(o => o.type === 'summary').length || 0

    setStats({
      totalBooks: books?.length || 0,
      thisYear,
      thisMonth,
      scripts,
      summaries
    })

    // Scripts by book
    const { data: scriptData } = await supabase
      .from('ai_outputs')
      .select('book_id, books(title)')
      .eq('user_id', user.id)
      .eq('type', 'script')
      .not('book_id', 'is', null)

    const bookCounts = {}
    scriptData?.forEach(item => {
      const title = item.books?.title || 'Livro desconhecido'
      bookCounts[title] = (bookCounts[title] || 0) + 1
    })

    setScriptsByBook(
      Object.entries(bookCounts)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
    )

    // Editorial line
    const { data: brain } = await supabase
      .from('user_brain')
      .select('editorial_pillars')
      .eq('user_id', user.id)
      .single()

    setEditorialLine(brain?.editorial_pillars || null)
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      // Priority 1: Save to localStorage immediately (always succeeds)
      localStorage.setItem('bookshelfai.username', username)
      
      // Priority 2: Try to update database (best effort)
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id)

      setProfile({ ...profile, username })
      setEditing(false)
    } catch (error) {
      // Even if DB fails, localStorage persists - success!
      console.warn('DB update failed, but localStorage saved:', error)
      setProfile({ ...profile, username })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateEditorial() {
    setGeneratingEditorial(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      const response = await fetch('/.netlify/functions/generate-editorial-line', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      if (result.success) {
        setEditorialLine(result.editorial_line)
        alert('Linha editorial gerada com sucesso!')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('Erro ao gerar linha editorial: ' + error.message)
    } finally {
      setGeneratingEditorial(false)
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '30px' }}>
        👤 Meu Perfil
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        {editing ? (
          <div>
            <div style={{ fontWeight: '700', marginBottom: '16px' }}>Editar Perfil</div>
            <div style={{ marginBottom: '16px' }}>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Nome de Usuário
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btnPrimary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff'
              }}>
                {profile?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{profile?.username || 'Usuário'}</div>
                <div className="muted" style={{ fontSize: '13px' }}>
                  Membro desde {new Date(profile?.created_at || Date.now()).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            <button className="btn" onClick={() => setEditing(true)}>✏️ Editar</button>
          </div>
        )}
      </div>

      {/* Stats Dashboard */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '16px' }}>📊 Estatísticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Livros Lidos Total</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#667eea' }}>{stats.totalBooks || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Lidos no Mês</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#764ba2' }}>{stats.thisMonth || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Lidos no Ano</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#f093fb' }}>{stats.thisYear || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Roteiros Gerados</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#a78bfa' }}>{stats.scripts || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Resumos Feitos</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#fbbf24' }}>{stats.summaries || 0}</div>
          </div>
        </div>
      </div>

      {/* Roteiros por Livro */}
      {scriptsByBook.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '16px' }}>📚 Roteiros por Livro</div>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {scriptsByBook.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < scriptsByBook.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.title}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#a78bfa' }}>{item.count}</div>
                  <div className="muted" style={{ fontSize: '10px' }}>roteiros</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linha Editorial */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>🎯 Minha Linha Editorial</div>
          <button className="btn" onClick={handleGenerateEditorial} disabled={generatingEditorial}>
            {generatingEditorial ? 'Gerando...' : '✨ Gerar Nova Linha'}
          </button>
        </div>

        {editorialLine ? (
          <div className="card" style={{ padding: '20px' }}>
            {editorialLine.pillars && (
              <div style={{ marginBottom: '16px' }}>
                <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Pilares Editoriais</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {editorialLine.pillars.map((pillar, i) => (
                    <div key={i} className="badge" style={{ fontSize: '12px', padding: '8px 12px' }}>
                      {pillar}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editorialLine.progression && (
              <div>
                <div className="muted" style={{ fontSize: '12px', marginBottom: '6px' }}>Progressão de Conteúdo</div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>{editorialLine.progression}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="muted">
              Clique em "Gerar Nova Linha" para criar sua estratégia editorial personalizada
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
