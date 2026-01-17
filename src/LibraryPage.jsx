import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Library, BookOpen, Trash2, Brain, FileText } from 'lucide-react'

async function fetchBookFromGoogle(title) {
  const cleanTitle = title.trim()
  
  // Build better query for series/volumes
  let query = cleanTitle
  
  // Detect volume patterns and improve query
  const volumeMatch = cleanTitle.match(/vol\.?\s*(\d+)|volume\s*(\d+)/i)
  if (volumeMatch) {
    // Use intitle for more precise matching
    query = `intitle:"${cleanTitle}"`
  }
  
  const q = encodeURIComponent(query)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao consultar Google Books')
  
  const data = await res.json()
  if (!data?.items || data.items.length === 0) return null
  
  // Find best matching result
  let bestMatch = data.items[0]
  
  // Try to find exact or better title match
  for (const item of data.items) {
    const itemTitle = item.volumeInfo?.title?.toLowerCase() || ''
    const searchTitle = cleanTitle.toLowerCase()
    
    // Exact match wins
    if (itemTitle === searchTitle) {
      bestMatch = item
      break
    }
    
    // Partial match with volume number
    if (volumeMatch && itemTitle.includes(searchTitle.toLowerCase())) {
      bestMatch = item
      break
    }
  }
  
  const v = bestMatch.volumeInfo || {}
  return {
    title: v.title ?? cleanTitle,
    authors: Array.isArray(v.authors) ? v.authors : [],
    pages: Number(v.pageCount) || null,
    cover_url: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
    description: v.description ?? null,
    categories: Array.isArray(v.categories) ? v.categories : [],
  }
}

// Fetch ALL books for autocomplete (not just best match)
async function fetchBooksFromGoogle(title) {
  const cleanTitle = title.trim()
  if (!cleanTitle || cleanTitle.length < 2) return []
  
  const q = encodeURIComponent(cleanTitle)
  const lowerTitle = cleanTitle.toLowerCase()
  
  // Smart keyword detection - map Portuguese/partial terms to known authors
  const knownBooks = [
    { keywords: ['prospecção', 'fanática', 'prospecting', 'fanatical'], author: 'Jeb Blount', title: 'Fanatical Prospecting' },
    { keywords: ['inteligência', 'emocional', 'vendas', 'sales eq'], author: 'Jeb Blount', title: 'Sales EQ' },
    { keywords: ['objeções', 'objections'], author: 'Jeb Blount', title: 'Objections' }
  ]
  
  // Check if query matches a known book
  const matchedBook = knownBooks.find(book => 
    book.keywords.some(kw => lowerTitle.includes(kw))
  )
  
  // Strategy: Try multiple searches and combine/dedupe results
  const urls = [
    // Primary: exact query with relevance ordering
    `https://www.googleapis.com/books/v1/volumes?q=${q}&orderBy=relevance&maxResults=10&printType=books`
  ]
  
  // If we detected a known book, add author-based search
  if (matchedBook) {
    const authorQuery = encodeURIComponent(`${matchedBook.title} ${matchedBook.author}`)
    urls.push(
      `https://www.googleapis.com/books/v1/volumes?q=${authorQuery}&maxResults=5&printType=books`
    )
  } else {
    // Fallback: search with intitle for better title matching
    urls.push(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${q}&maxResults=5&printType=books`
    )
  }
  
  try {
    const allResults = []
    
    // Fetch from all URLs
    for (const url of urls) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        
        const data = await res.json()
        if (data?.items) {
          allResults.push(...data.items)
        }
      } catch (err) {
        console.warn('Error in search fallback:', err)
      }
    }
    
    if (allResults.length === 0) return []
    
    // Deduplicate by ID
    const uniqueBooks = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    )
    
    // Convert to our format
    let books = uniqueBooks.map(item => {
      const v = item.volumeInfo || {}
      return {
        id: item.id,
        title: v.title || cleanTitle,
        authors: Array.isArray(v.authors) ? v.authors : [],
        pages: Number(v.pageCount) || null,
        cover_url: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
        description: v.description || null,
        categories: Array.isArray(v.categories) ? v.categories : [],
        ratingsCount: v.ratingsCount || 0
      }
    })
    
    // Smart filtering & sorting:
    // 1. Filter out obvious summaries/study guides (keep originals)
    const isSummary = (title) => {
      const lower = title.toLowerCase()
      return lower.includes('summary') || 
             lower.includes('analysis') || 
             lower.includes('study guide') ||
             lower.includes('resumo do livro') ||
             lower.startsWith('summary of')
    }
    
    // Separate summaries from originals
    const originals = books.filter(b => !isSummary(b.title))
    const summaries = books.filter(b => isSummary(b.title))
    
    // 2. If we matched a known book, boost exact matches to top
    if (matchedBook) {
      const exactMatches = originals.filter(b => 
        b.title.toLowerCase().includes(matchedBook.title.toLowerCase().split(' ')[0]) &&
        b.authors.some(a => a.toLowerCase().includes(matchedBook.author.toLowerCase().split(' ')[0]))
      )
      const others = originals.filter(b => !exactMatches.includes(b))
      
      // Sort each group by ratings
      exactMatches.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0))
      others.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0))
      
      // Combine: exact matches first, then others, then summaries
      const sorted = [...exactMatches, ...others, ...summaries]
      return sorted.slice(0, 10)
    }
    
    // 3. Sort originals by ratings (more ratings = more popular)
    originals.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0))
    
    // 4. Combine: originals first, then summaries
    const sorted = [...originals, ...summaries]
    
    // Return top 10
    return sorted.slice(0, 10)
    
  } catch (error) {
    console.warn('Error fetching book suggestions:', error)
    return []
  }
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

export default function LibraryPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [titleInput, setTitleInput] = useState('')
  const [readDateInput, setReadDateInput] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookNotes, setBookNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [buildingMemory, setBuildingMemory] = useState(false)
  
  // Autocomplete states
  const [bookSuggestions, setBookSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [searchTimeout, setSearchTimeout] = useState(null)

  useEffect(() => {
    loadBooks()
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showSuggestions) {
        const target = event.target
        const isInput = target.closest('input')
        const isDropdown = target.closest('[data-autocomplete-dropdown]')
        
        if (!isInput && !isDropdown) {
          setShowSuggestions(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSuggestions])

  async function loadBooks() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('books')
      .select(`
        *,
        book_memory (*),
        book_notes (*)
      `)
      .eq('user_id', user.id)
      .order('read_date', { ascending: false })

    setBooks(data || [])
    setLoading(false)
  }

  // Autocomplete handlers
  async function handleTitleInputChange(value) {
    setTitleInput(value)
    setSelectedSuggestion(null)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // If input is too short, hide suggestions
    if (!value || value.trim().length < 2) {
      setShowSuggestions(false)
      setBookSuggestions([])
      return
    }
    
    // Debounce search
    const timeout = setTimeout(async () => {
      const suggestions = await fetchBooksFromGoogle(value)
      setBookSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    }, 400)
    
    setSearchTimeout(timeout)
  }

  function selectBookSuggestion(book) {
    setSelectedSuggestion(book)
    setTitleInput(book.title)
    setShowSuggestions(false)
    setBookSuggestions([])
  }

  function clearSuggestions() {
    setShowSuggestions(false)
  }

  async function handleAddBook(e) {
    e.preventDefault()
    if (!titleInput.trim()) return

    setSaving(true)
    setShowSuggestions(false)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Check book limit for free tier users
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      
      const tier = profile?.subscription_tier || 'free'
      
      if (tier === 'free') {
        // Count current books
        const { count } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        
        if (count >= 3) {
          setSaving(false)
          alert('📚 Limite de 3 livros atingido!\n\nFaça upgrade para o plano Premium para adicionar livros ilimitados.')
          return
        }
      }
      
      let enriched = {}
      
      // If user selected a suggestion, use it directly
      if (selectedSuggestion) {
        enriched = selectedSuggestion
      } else {
        // Otherwise, try to fetch from API
        try {
          enriched = await fetchBookFromGoogle(titleInput) || {}
        } catch (err) {
          console.warn('Google Books API failed:', err)
        }
      }

      const newBook = {
        title: enriched.title || titleInput,
        read_date: readDateInput || null,
        pages: enriched.pages || null,
        cover_url: enriched.cover_url || null,
        authors: enriched.authors || [],
        description: enriched.description || null,
        categories: enriched.categories || [],
        user_id: user.id
      }

      const { data, error } = await supabase
        .from('books')
        .insert(newBook)
        .select()
        .single()

      if (error) throw error

      setBooks([data, ...books])
      setTitleInput('')
      setSelectedSuggestion(null)
      setBookSuggestions([])
      
      // Construir memória automaticamente
      buildBookMemory(data.id)
    } catch (err) {
      alert('Erro ao adicionar livro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function buildBookMemory(bookId) {
    setBuildingMemory(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      await fetch('/.netlify/functions/build-book-memory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookId })
      })

      // Recarregar livros
      loadBooks()
    } catch (error) {
      console.error('Erro ao construir memória:', error)
    } finally {
      setBuildingMemory(false)
    }
  }

  async function handleSaveNotes() {
    if (!selectedBook) return

    setSavingNotes(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Upsert notes
      await supabase
        .from('book_notes')
        .upsert({
          book_id: selectedBook.id,
          user_id: user.id,
          notes_text: bookNotes
        }, {
          onConflict: 'book_id,user_id'
        })

      // Reconstruir memória com as notas
      await buildBookMemory(selectedBook.id)

      alert('Notas salvas! A memória do livro foi atualizada.')
      loadBooks()
    } catch (error) {
      alert('Erro ao salvar notas: ' + error.message)
    } finally {
      setSavingNotes(false)
    }
  }

  function handleDelete(id) {
    setBookToDelete(id)
    setDeleteConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!bookToDelete) return
    
    try {
      const { error } = await supabase.from('books').delete().eq('id', bookToDelete)
      if (error) throw error
      
      setBooks(books.filter(b => b.id !== bookToDelete))
      setSelectedBook(null)
      setDeleteConfirmOpen(false)
      setBookToDelete(null)
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir livro: ' + error.message)
      setDeleteConfirmOpen(false)
      setBookToDelete(null)
    }
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false)
    setBookToDelete(null)
  }

  function openBookModal(book) {
    setSelectedBook(book)
    setBookNotes(book.book_notes?.[0]?.notes_text || '')
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Carregando biblioteca...</div>
  }

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={24} /> Minha Biblioteca</span>
        </div>
        <div className="muted" style={{ fontSize: '14px' }}>
          {books.length} {books.length === 1 ? 'livro' : 'livros'} na sua estante
        </div>

        {/* Search Hint */}
        <p className="muted" style={{ fontSize: '13px', textAlign: 'center', marginTop: '30px', color: 'var(--muted)' }}>
          💡 Procure pelo livro com o nome em português, Inglês ou com o nome do autor.
        </p>
      </div>

      {/* Add Book Form */}
      <div className="card" style={{ padding: '20px', marginBottom: '30px' }}>
        <form onSubmit={handleAddBook} className="mobile-form" style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '12px', alignItems: 'end' }}>
          <div style={{ position: 'relative' }}>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Novo Livro</label>
            <input 
              className="input" 
              placeholder="Digite o título..." 
              value={titleInput} 
              onChange={(e) => handleTitleInputChange(e.target.value)}
              onFocus={() => {
                if (bookSuggestions.length > 0) setShowSuggestions(true)
              }}
              disabled={saving}
              autoComplete="off"
            />
            
            {/* Autocomplete Dropdown */}
            {showSuggestions && bookSuggestions.length > 0 && (
              <div 
                data-autocomplete-dropdown="true"
                style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#1a1a1a',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                marginTop: '4px',
                maxHeight: '320px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 1000
              }}>
                {bookSuggestions.map((book, index) => (
                  <div
                    key={book.id || index}
                    onClick={() => selectBookSuggestion(book)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: index < bookSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        style={{
                          width: '40px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '60px',
                        backgroundColor: 'var(--border)',
                        borderRadius: '4px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BookOpen size={20} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '14px',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {book.title}
                      </div>
                      {book.authors && book.authors.length > 0 && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {book.authors.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Data de Leitura</label>
            <input 
              className="input" 
              type="date" 
              value={readDateInput} 
              onChange={(e) => setReadDateInput(e.target.value)} 
              disabled={saving}
            />
          </div>
          <button className="btn btnPrimary" type="submit" disabled={saving || buildingMemory}>
            {saving ? 'Adicionando...' : buildingMemory ? 'Criando memória...' : '+ Adicionar'}
          </button>
        </form>
      </div>

      {/* Books Grid */}
      <div className="grid">
        {books.map(book => (
          <div key={book.id} className="card bookCard" onClick={() => openBookModal(book)}>
            <div className="coverWrap">
              {book.cover_url ? (
                <img className="cover" src={book.cover_url} alt={book.title} loading="lazy" />
              ) : (
                <div className="coverFallback">
                  <div style={{ fontWeight: 700, fontSize: 11 }}>Sem capa</div>
                </div>
              )}
            </div>
            <div className="bookMeta">
              <h3 className="bookTitle">{book.title}</h3>
              {book.authors?.length > 0 && (
                <div className="muted" style={{ fontSize: 11 }}>{book.authors.join(', ')}</div>
              )}
              
              {/* AI Stats */}
              <div style={{ marginTop: '12px', fontSize: '11px' }}>
                <div className="badge" style={{ marginRight: '6px', marginBottom: '4px' }}>
                  <FileText size={12} style={{ display: 'inline', marginRight: 4 }} /> Roteiros: {book.ai_script_count || 0}
                </div>
                <div className="badge">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={12} /> Resumos: {book.ai_summary_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Library size={48} style={{ color: 'var(--muted)' }} />
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            Sua biblioteca está vazia
          </div>
          <div className="muted">Adicione seu primeiro livro acima para começar!</div>
        </div>
      )}

      {/* Book Modal */}
      <Modal open={!!selectedBook} onClose={() => setSelectedBook(null)}>
        {selectedBook && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{selectedBook.title}</div>
              <button className="btn" onClick={() => setSelectedBook(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', marginBottom: '24px' }}>
              <div className="coverWrap" style={{ width: '160px', height: '220px' }}>
                {selectedBook.cover_url ? (
                  <img className="cover" src={selectedBook.cover_url} alt={selectedBook.title} />
                ) : (
                  <div className="coverFallback">Sem capa</div>
                )}
              </div>

              <div>
                {selectedBook.authors?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="muted" style={{ fontSize: '12px' }}>Autores</div>
                    <div>{selectedBook.authors.join(', ')}</div>
                  </div>
                )}
                {selectedBook.description && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="muted" style={{ fontSize: '12px' }}>Descrição</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.6', maxHeight: '120px', overflow: 'auto' }}>
                      {selectedBook.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Memory */}
            {selectedBook.book_memory?.[0] && (
              <div className="card" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(124,92,255,0.1)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                  <Brain size={16} style={{ display: 'inline', marginRight: 4 }} /> Memória do Livro
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Temas:</strong> {selectedBook.book_memory[0].themes?.join(', ') || 'N/A'}
                  </div>
                  <div>
                    <strong>Insights:</strong> {selectedBook.book_memory[0].insights?.slice(0, 3).join('; ') || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div style={{ marginBottom: '20px' }}>
              <label className="muted" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Minhas Notas e Highlights
              </label>
              <textarea
                className="input"
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                placeholder="Cole seus highlights, anotações ou insights sobre o livro..."
                rows={6}
                style={{ resize: 'vertical' }}
              />
              <div className="muted" style={{ fontSize: '11px', marginTop: '6px' }}>
                Essas notas serão usadas pela IA para criar conteúdo mais personalizado
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btnPrimary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? 'Salvando...' : '💾 Salvar Notas'}
              </button>
              <button className="btn" onClick={() => buildBookMemory(selectedBook.id)}>
                <Brain size={16} style={{ display: 'inline', marginRight: 4 }} /> Reconstruir Memória
              </button>
              <button className="btn" onClick={() => handleDelete(selectedBook.id)} style={{ marginLeft: 'auto', color: 'var(--danger)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16} /> Excluir</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }} onClick={cancelDelete}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trash2 size={24} style={{ color: 'var(--danger)' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Confirmar Exclusão</h3>
            </div>
            
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '28px',
              lineHeight: '1.6'
            }}>
              Tem certeza que deseja excluir este livro? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                onClick={cancelDelete}
                style={{ minWidth: '100px' }}
              >
                Cancelar
              </button>
              <button 
                className="btn btnPrimary" 
                onClick={confirmDelete}
                style={{ 
                  minWidth: '100px',
                  backgroundColor: 'var(--danger)',
                  borderColor: 'var(--danger)'
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
