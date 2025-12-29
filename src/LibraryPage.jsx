import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

async function fetchBookFromGoogle(title) {
  const q = encodeURIComponent(title.trim())
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao consultar Google Books')
  const data = await res.json()
  const item = data?.items?.[0]
  if (!item) return null

  const v = item.volumeInfo || {}
  return {
    title: v.title ?? title,
    authors: Array.isArray(v.authors) ? v.authors : [],
    pages: Number(v.pageCount) || null,
    cover_url: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
    description: v.description ?? null,
    categories: Array.isArray(v.categories) ? v.categories : [],
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
  const [buildingMemory, setBuildingMemory] = useState(false)

  useEffect(() => {
    loadBooks()
  }, [])

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

  async function handleAddBook(e) {
    e.preventDefault()
    if (!titleInput.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
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

  async function handleDelete(id) {
    if (!confirm('Tem certeza?')) return
    
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (!error) {
      setBooks(books.filter(b => b.id !== id))
      setSelectedBook(null)
    }
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
          📚 Minha Biblioteca
        </div>
        <div className="muted" style={{ fontSize: '14px' }}>
          {books.length} {books.length === 1 ? 'livro' : 'livros'} na sua estante
        </div>
      </div>

      {/* Add Book Form */}
      <div className="card" style={{ padding: '20px', marginBottom: '30px' }}>
        <form onSubmit={handleAddBook} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Novo Livro</label>
            <input 
              className="input" 
              placeholder="Digite o título..." 
              value={titleInput} 
              onChange={(e) => setTitleInput(e.target.value)} 
              disabled={saving}
            />
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
                  📝 Roteiros: {book.ai_script_count || 0}
                </div>
                <div className="badge">
                  📚 Resumos: {book.ai_summary_count || 0}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
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
                  🧠 Memória do Livro
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
                🧠 Reconstruir Memória
              </button>
              <button className="btn" onClick={() => handleDelete(selectedBook.id)} style={{ marginLeft: 'auto', color: 'var(--danger)' }}>
                🗑️ Excluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
