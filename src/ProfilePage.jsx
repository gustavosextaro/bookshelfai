import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { User, Edit, Library, Trash2, BarChart3, Star, Target, Sparkles, BookOpen } from 'lucide-react'

export default function ProfilePage({ onProfileUpdate }) {
  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({})
  const [scriptsByBook, setScriptsByBook] = useState([])
  const [editorialLine, setEditorialLine] = useState(null)
  const [generatingEditorial, setGeneratingEditorial] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [favoriteBooks, setFavoriteBooks] = useState([])
  const [showFavoriteSelector, setShowFavoriteSelector] = useState(false)
  const [availableBooks, setAvailableBooks] = useState([])

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    console.log('🔍 [ProfilePage] Starting loadProfileData...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ [ProfilePage] Error getting user:', userError)
      return
    }
    
    if (!user) {
      console.warn('⚠️ [ProfilePage] No user found')
      return
    }
    
    console.log('✅ [ProfilePage] User ID:', user.id)

    // Priority 1: Check localStorage first
    const savedUsername = localStorage.getItem('bookshelfai.username')
    console.log('📦 [ProfilePage] localStorage username:', savedUsername)
    
    // Profile & Settings
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ [ProfilePage] Profile fetch error:', profileError)
    } else {
      console.log('✅ [ProfilePage] Profile data:', profileData)
    }

    // Use localStorage if available, otherwise fallback to database
    const displayUsername = savedUsername || profileData?.username || 'Usuário'
    setProfile({ ...(profileData || {}), username: displayUsername })
    setUsername(displayUsername)
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem(`bookshelfai.favorites.${user.id}`)
    if (savedFavorites) {
      try {
        const favorites = JSON.parse(savedFavorites)
        setFavoriteBooks(favorites)
        console.log('⭐ [ProfilePage] Loaded favorites from localStorage:', favorites)
      } catch (e) {
        console.error('Error parsing favorites:', e)
      }
    }

    // Check reset date
    const lastReset = profileData?.settings?.last_reset_at ? new Date(profileData.settings.last_reset_at) : null
    console.log('🔄 [ProfilePage] Last reset:', lastReset)

    // Books count (Books are never reset, only AI stats)
    console.log('📚 [ProfilePage] Fetching books for user:', user.id)
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, authors, cover_url, read_date')
      .eq('user_id', user.id)
      
    if (booksError) {
      console.error('❌ [ProfilePage] Books fetch error:', booksError)
      console.error('❌ [ProfilePage] Books error details:', JSON.stringify(booksError, null, 2))
    } else {
      console.log('✅ [ProfilePage] Books fetched:', books?.length || 0, 'books')
      console.log('📖 [ProfilePage] Books data:', books)
    }
      
    setAvailableBooks(books || [])

    const now = new Date()
//...
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
    console.log('🤖 [ProfilePage] Fetching AI outputs...')
    const { data: allOutputs, error: outputsError } = await supabase
      .from('ai_outputs')
      .select('type, created_at, book_id, books(title)')
      .eq('user_id', user.id)

    if (outputsError) {
      console.error('❌ [ProfilePage] AI outputs fetch error:', outputsError)
    } else {
      console.log('✅ [ProfilePage] AI outputs fetched:', allOutputs?.length || 0)
    }

    // Filter outputs based on reset date
    const outputs = allOutputs?.filter(o => 
      !lastReset || new Date(o.created_at) > lastReset
    ) || []

    const scripts = outputs.filter(o => o.type === 'script').length || 0
    const summaries = outputs.filter(o => o.type === 'summary').length || 0
    
    console.log('📊 [ProfilePage] Final stats:', {
      totalBooks: books?.length || 0,
      thisYear,
      thisMonth,
      scripts,
      summaries
    })

    setStats({
      totalBooks: books?.length || 0,
      thisYear,
      thisMonth,
      scripts,
      summaries
    })

    // Scripts by book (filtered)
    const scriptOutputs = outputs.filter(o => o.type === 'script' && o.book_id)
    const bookCounts = {}
    
    scriptOutputs.forEach(item => {
      const title = item.books?.title || 'Livro desconhecido'
      bookCounts[title] = (bookCounts[title] || 0) + 1
    })

    setScriptsByBook(
      Object.entries(bookCounts)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
    )

    // Editorial line
    const { data: brain, error: brainError } = await supabase
      .from('user_brain')
      .select('editorial_pillars')
      .eq('user_id', user.id)
      .single()

    if (brainError && brainError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('❌ [ProfilePage] Brain fetch error:', brainError)
    }

    setEditorialLine(brain?.editorial_pillars || null)
    console.log('✅ [ProfilePage] loadProfileData completed!')
  }

  async function handleResetStats() {
    if (!window.confirm('Tem certeza? Isso irá zerar o contador de roteiros e resumos gerados. (Seus dados históricos não serão apagados, apenas o contador visual).')) {
      return
    }

    setResetting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Fetch current settings to preserve other keys (like api key)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      
      const currentSettings = profileData?.settings || {}
      
      // Update with new reset timestamp
      await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...currentSettings, 
            last_reset_at: new Date().toISOString() 
          } 
        })
        .eq('id', user.id)

      await loadProfileData() // Reload to apply filter
    } catch (error) {
      console.error('Error resetting stats:', error)
      alert('Erro ao resetar estatísticas.')
    } finally {
      setResetting(false)
    }
  }

  async function handleUpdateFavorites(newFavorites) {
    setFavoriteBooks(newFavorites)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Save to localStorage instead of Supabase settings (column doesn't exist)
      localStorage.setItem(`bookshelfai.favorites.${user.id}`, JSON.stringify(newFavorites))
      console.log('✅ [ProfilePage] Saved favorites to localStorage:', newFavorites)
    } catch (e) {
      console.error('Error saving favorites:', e)
    }
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

      const updates = { username }
      // Update local state
      setProfile(prev => ({ ...prev, ...updates }))
      setEditing(false)
      
      // Notify parent component to update sidebar immediately without waiting for fetch
      if (onProfileUpdate) {
        onProfileUpdate({ ...profile, ...updates })
      }

      alert('Perfil atualizado com sucesso!')
    } catch (error) {
      console.warn('DB update failed, but localStorage saved:', error)
      // Still update local state even if DB fails
      setProfile({ ...profile, username })
      setEditing(false)
      if (onProfileUpdate) {
        onProfileUpdate({ username })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateEditorial() {
    setGeneratingEditorial(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const user = session.session?.user

      // 1. Fetch ALL User Books for Context
      const { data: books } = await supabase
        .from('books')
        .select('title, author')
        .eq('user_id', user.id)

      const bookList = books?.map(b => `"${b.title}" de ${b.author}`).join(', ') || 'nenhum livro cadastrado ainda'

      // 2. Construct Prompt with Explicit Context
      const prompt = `
Analise os SEGUINTES LIVROS da minha biblioteca pessoal:
${bookList}

Com base APENAS nestes livros, crie uma linha editorial estratégica.
A linha editorial deve conter:
1. **Pilares Editoriais** (3-5 temas principais que conectam estes livros específicos)
2. **Progressão de Conteúdo** (uma descrição de como estruturar conteúdos ao longo do tempo usando estes tópicos)

Formato de resposta (JSON):
{
  "pillars": ["Pilar 1", "Pilar 2", "Pilar 3"],
  "progression": "Descrição da progressão..."
}
      `

      const response = await fetch('/.netlify/functions/generate-content', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': openaiApiKey
        },
        body: JSON.stringify({
          type: 'editorial-line',
          customPrompt: prompt,
          knowledgeBase: 'full' // Keep full for RAG backup, but prompt is explicit
        })
      })

      const result = await response.json()
      
      if (result.success || result.result) {
        let content = result.result || result.content
        if (content.includes('```')) {
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        }
        
        try {
          const parsed = JSON.parse(content)
          setEditorialLine({
            pillars: parsed.pillars || [],
            progression: parsed.progression || ''
          })
          
          // Save to DB (optional, assuming edge function saves it, but updating local state is key)
          await loadProfileData() // Refetch to sync if edge function saved to 'user_brain'
        } catch (e) {
          console.error('Failed to parse JSON:', e)
          // Fallback parsing...
          const pillarMatch = content.match(/"pillars":\s*\[(.*?)\]/s)
          const progressionMatch = content.match(/"progression":\s*"(.*?)"/s)
           setEditorialLine({
            pillars: pillarMatch ? 
              pillarMatch[1].split(',').map(p => p.trim().replace(/"/g, '')) : 
              ['Geral', 'Desenvolvimento', 'Estratégia'],
             progression: progressionMatch ? 
              progressionMatch[1].replace(/\\n/g, '\n') : 
              content
          })
        }
        
        alert('✅ Linha editorial gerada com sucesso baseada nos seus livros!')
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Error generating editorial:', error)
      alert('❌ Erro ao gerar linha editorial: ' + error.message)
    } finally {
      setGeneratingEditorial(false)
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '30px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={24} /> Meu Perfil</span>
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
                  {profile?.email || 'Membro da comunidade'}
                </div>
              </div>
            </div>
            <button className="btn" onClick={() => setEditing(true)}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={16} /> Editar</span></button>
          </div>
        )}
      </div>

      {/* Favorite Books Section */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={16} /> Livros Favoritos</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map(index => {
            const bookId = favoriteBooks[index]
            const book = availableBooks.find(b => b.id === bookId)
            
            return (
              <div 
                key={index}
                onClick={() => setShowFavoriteSelector(index)}
                style={{
                  width: '100px',
                  height: '140px',
                  borderRadius: '12px',
                  background: book ? '#2d3748' : 'rgba(255,255,255,0.05)',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}
              >
                {book ? (
                  <>
                     {/* Book cover background */}
                     {book.cover_url && (
                       <div style={{
                         position: 'absolute',
                         top: 0,
                         left: 0,
                         right: 0,
                         bottom: 0,
                         backgroundImage: `url(${book.cover_url})`,
                         backgroundSize: 'cover',
                         backgroundPosition: 'center',
                         zIndex: 0
                       }} />
                     )}
                     
                     {/* Fallback emoji if no cover */}
                     {!book.cover_url && (
                       <div style={{ fontSize: '24px', zIndex: 0 }}><BookOpen size={24} /></div>
                     )}
                  </>
                ) : (
                  <div style={{ color: 'var(--muted)', fontSize: '24px' }}>+</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={16} /> Estatísticas de IA</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Livros na Biblioteca</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#667eea' }}>{stats.totalBooks || 0}</div>
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
          <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={18} /> Roteiros por Livro</div>
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
          <div style={{ fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={16} /> Minha Linha Editorial</div>
          <button className="btn" onClick={handleGenerateEditorial} disabled={generatingEditorial}>
            {generatingEditorial ? 'Analisando Biblioteca...' : <><Sparkles size={16} style={{ display: 'inline', marginRight: 4 }} /> Gerar Nova Linha</>}
          </button>
        </div>

        {editorialLine ? (
          <div className="card" style={{ padding: '20px' }}>
            {editorialLine.pillars && (
              <div style={{ marginBottom: '16px' }}>
                <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Pilares Editoriais (Baseado em {stats.totalBooks} livros)</div>
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
            
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
              Gerado analisando seus livros específicos.
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="muted">
              Clique em "Gerar Nova Linha" para a IA analisar seus livros e criar uma estratégia.
            </div>
          </div>
        )}
      </div>

      {/* Favorite Selector Modal */}
      {showFavoriteSelector !== false && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowFavoriteSelector(false)}>
          <div style={{
            background: '#1a202c',
            padding: '32px',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={24} /> Minha Biblioteca</h2>
              <button 
                onClick={() => setShowFavoriteSelector(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
              >×</button>
            </div>
            
            <div style={{ 
              overflowY: 'auto', 
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '20px',
              padding: '4px'
            }}>
              {/* Remove option */}
              <div
                onClick={() => {
                  const newFavs = [...favoriteBooks]
                  newFavs[showFavoriteSelector] = null
                  handleUpdateFavorites(newFavs)
                  setShowFavoriteSelector(false)
                }}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px dashed rgba(239, 68, 68, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ':hover': { transform: 'scale(1.05)' }
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Trash2 size={32} style={{ marginBottom: '8px', color: '#ef4444' }} />
                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center', padding: '0 8px' }}>Remover</div>
              </div>

              {/* Book covers */}
              {availableBooks.map(book => (
                <div
                  key={book.id}
                  onClick={() => {
                    const newFavs = [...favoriteBooks]
                    newFavs[showFavoriteSelector] = book.id
                    handleUpdateFavorites(newFavs)
                    setShowFavoriteSelector(false)
                  }}
                  style={{
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    background: book.cover_url 
                      ? `url(${book.cover_url}) center/cover` 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%)',
                    padding: '32px 12px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'white',
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {book.title}
                    </div>
                    {book.authors && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {book.authors}
                      </div>
                    )}
                  </div>
                  
                  {/* Placeholder icon if no cover */}
                  {!book.cover_url && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '48px',
                      opacity: 0.3
                    }}><BookOpen size={48} style={{ opacity: 0.3 }} /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
