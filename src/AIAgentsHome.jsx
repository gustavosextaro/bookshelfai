import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function AIAgentsHome() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('Usuário')
  const [brainStats, setBrainStats] = useState({
    booksCount: 0,
    insightsCount: 0,
    scriptsCount: 0
  })
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const textareaRef = useRef(null)

  useEffect(() => {
    loadUserData()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + 'px'
    }
  }, [message])

  async function loadUserData() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    setUser(currentUser)

    // Priority 1: Check localStorage first
    const savedUsername = localStorage.getItem('bookshelfai.username')
    
    if (savedUsername) {
      setUsername(savedUsername)
    } else {
      // Priority 2: Fallback to database
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single()

      if (profile?.username) {
        setUsername(profile.username)
      }
    }

    const { data: booksData } = await supabase
      .from('books')
      .select('*, book_memory(*)')
      .eq('user_id', currentUser.id)

    const { data: outputs } = await supabase
      .from('ai_outputs')
      .select('type')
      .eq('user_id', currentUser.id)

    const scriptsCount = outputs?.filter(o => o.type === 'script').length || 0
    
    let insightsCount = 0
    booksData?.forEach(book => {
      book.book_memory?.forEach(mem => {
        insightsCount += mem.insights?.length || 0
      })
    })

    setBrainStats({
      booksCount: booksData?.length || 0,
      insightsCount,
      scriptsCount
    })
  }

  async function handleGenerate(customMessage) {
    const promptText = customMessage || message
    if (!promptText.trim()) return

    setLoading(true)
    setOutput(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      const response = await fetch('/.netlify/functions/generate-content', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'script',
          customPrompt: promptText,
          bookIds: [],
          knowledgeBase: 'full',
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Erro ao gerar conteúdo')
      }

      setOutput(result)
      setMessage('')
      
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: promptText },
        { role: 'assistant', content: result.result }
      ]
      setConversationHistory(newHistory)

      loadUserData()
    } catch (error) {
      console.error('Error generating content:', error)
      setOutput({
        error: true,
        message: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const currentHour = new Date().getHours()
  let greeting = 'Bom dia'
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Boa tarde'
  } else if (currentHour >= 18) {
    greeting = 'Boa noite'
  }

  const styles = {
    container: {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
      color: 'rgba(255, 255, 255, 0.92)',
      position: 'relative'
    },
    greetingContainer: {
      width: '100%',
      maxWidth: '48rem',
      marginBottom: '3rem',
      textAlign: 'center',
      animation: 'fadeIn 0.6s ease-out'
    },
    brainIcon: {
      width: '6rem',
      height: '6rem',
      margin: '0 auto 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '4.5rem',
      animation: 'pulse 3s ease-in-out infinite'
    },
    greetingText: {
      fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
      fontWeight: '300',
      color: 'rgba(255, 255, 255, 0.92)',
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em',
      fontFamily: 'Georgia, serif'
    },
    username: {
      position: 'relative',
      display: 'inline-block',
      paddingBottom: '0.5rem'
    },
    underline: {
      position: 'absolute',
      width: '140%',
      height: '20px',
      bottom: '-0.25rem',
      left: '-20%',
      fill: 'none',
      stroke: '#D97757',
      strokeWidth: '3',
      strokeLinecap: 'round'
    },
    stats: {
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.62)',
      marginTop: '1rem'
    },
    chatInputWrapper: {
      width: '100%',
      maxWidth: '42rem',
      marginBottom: '1.5rem',
      position: 'relative'
    },
    chatInputContainer: {
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.10)',
      borderRadius: '1.5rem',
      boxShadow: '0 16px 50px rgba(0, 0, 0, 0.55)',
      padding: '0.75rem 1rem',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      backdropFilter: 'blur(14px)'
    },
    textarea: {
      width: '100%',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontSize: '1rem',
      fontFamily: 'inherit',
      color: 'rgba(255, 255, 255, 0.92)',
      background: 'transparent',
      minHeight: '1.5em',
      maxHeight: '384px',
      lineHeight: '1.5',
    },
    textareaPlaceholder: {
      color: 'rgba(255, 255, 255, 0.42)'
    },
    inputActions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem'
    },
    leftActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    iconButton: {
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: 'transparent',
      color: 'rgba(255, 255, 255, 0.62)',
      cursor: 'pointer',
      borderRadius: '0.5rem',
      transition: 'all 0.15s',
      fontSize: '1.25rem'
    },
    sendButton: {
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: message.trim() ? '#D97757' : 'rgba(217, 119, 87, 0.3)',
      color: '#FFFFFF',
      cursor: message.trim() ? 'pointer' : 'default',
      borderRadius: '0.75rem',
      transition: 'all 0.15s',
      fontSize: '1rem'
    },
    quickActions: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0.5rem',
      maxWidth: '42rem',
      margin: '0 auto 2rem',
      padding: '0 1rem'
    },
    pill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.92)',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.10)',
      borderRadius: '9999px',
      cursor: 'pointer',
      transition: 'all 0.15s'
    },
    card: {
      width: '100%',
      maxWidth: '42rem',
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.10)',
      borderRadius: '1rem',
      boxShadow: '0 16px 50px rgba(0, 0, 0, 0.55)',
      padding: '1.5rem',
      animation: 'fadeIn 0.6s ease-out'
    },
    disclaimer: {
      marginTop: '2rem',
      fontSize: '0.75rem',
      color: 'rgba(255, 255, 255, 0.62)',
      opacity: 0.6,
      textAlign: 'center'
    }
  }

  return (
    <div style={styles.container}>
      {/* Greeting Section */}
      <div style={styles.greetingContainer}>
        <div style={styles.brainIcon}>🧠</div>
        <h1 style={styles.greetingText}>
          {greeting}, <span style={styles.username}>
            {username}
            <svg
              style={styles.underline}
              viewBox="0 0 140 24"
              preserveAspectRatio="none"
            >
              <path d="M6 16 Q 70 24, 134 14" />
            </svg>
          </span>
        </h1>
        <p style={styles.stats}>
          Memória: {brainStats.booksCount} livros • {brainStats.insightsCount} insights • {brainStats.scriptsCount} roteiros gerados
        </p>
      </div>

      {/* Chat Input - Simplified Inline Version */}
      <div style={styles.chatInputWrapper}>
        <div style={styles.chatInputContainer}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Como posso ajudar você hoje?"
            style={styles.textarea}
            rows={1}
          />
          <div style={styles.inputActions}>
            <div style={styles.leftActions}>
              <button style={styles.iconButton} title="Anexar arquivo">+</button>
            </div>
            <button 
              style={styles.sendButton}
              onClick={() => handleGenerate()}
              disabled={!message.trim()}
            >
              ↑
            </button>
          </div>
        </div>
        <p style={{ ...styles.disclaimer, marginTop: '0.75rem' }}>
          A IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div style={styles.quickActions}>
        {[
          { label: '📹 Roteiro TikTok', prompt: 'Crie um roteiro viral para TikTok/Reels baseado nos livros da minha biblioteca' },
          { label: '💡 Ideias de Conteúdo', prompt: 'Me dê 5 ideias criativas de conteúdo não-genéricas' },
          { label: '📝 Resumo', prompt: 'Faça um resumo em tópicos dos principais insights' },
          { label: '🎴 Flashcards', prompt: 'Crie flashcards para estudar os conceitos principais' }
        ].map((action, i) => (
          <button
            key={i}
            style={styles.pill}
            onClick={() => handleGenerate(action.prompt)}
            disabled={loading}
            onMouseEnter={e => {
              e.target.style.background = 'rgba(255, 255, 255, 0.12)'
              e.target.style.color = 'rgba(255, 255, 255, 0.92)'
            }}
            onMouseLeave={e => {
              e.target.style.background = 'rgba(255, 255, 255, 0.08)'
              e.target.style.color = 'rgba(255, 255, 255, 0.92)'
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 3s ease-in-out infinite' }}>🧠</div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.92)', marginBottom: '0.5rem' }}>
              Analisando sua biblioteca...
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.62)' }}>
              Criando conteúdo não-genérico e contextualizado
            </div>
          </div>
        </div>
      )}

      {/* Output Panel */}
      {output && !output.error && (
        <div style={styles.card}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.92)', marginBottom: '0.25rem' }}>
              Conteúdo Gerado
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.62)' }}>
              <span>⏱️ {output.duration_estimate}</span>
              <span>📊 Usos: {output.usage?.remaining}/{output.usage?.limit}</span>
            </div>
          </div>

          {output.metadata?.books_used?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.62)', marginBottom: '0.5rem' }}>Livros base:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {output.metadata.books_used.map((book, i) => (
                  <span key={i} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'rgba(255, 255, 255, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: '0.5rem'
                  }}>
                    📚 {book}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.875rem',
            lineHeight: '1.7',
            color: 'rgba(255, 255, 255, 0.92)',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            {output.result}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { label: '🔄 Gerar variação', prompt: 'Gere uma variação diferente do último roteiro, mudando o ângulo e o hook' },
              { label: '🔥 Mais polêmico', prompt: 'Torne o último roteiro mais polêmico e provocativo, sem perder a profundidade' },
              { label: '💡 Adicionar exemplo', prompt: 'Adicione um exemplo prático do mundo real ao último roteiro' },
              { label: '⏱️ 60s', prompt: 'Ajuste o último roteiro para duração de 60s' },
              { label: '⏱️ 2m20s', prompt: 'Ajuste o último roteiro para duração de 2m20s' }
            ].map((action, i) => (
              <button
                key={i}
                style={{ ...styles.pill, fontSize: '0.75rem' }}
                onClick={() => handleGenerate(action.prompt)}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.12)'
                  e.target.style.color = 'rgba(255, 255, 255, 0.92)'
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.target.style.color = 'rgba(255, 255, 255, 0.92)'
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {output?.error && (
        <div style={{
          ...styles.card,
          border: '1px solid rgba(255, 92, 122, 0.3)',
          background: 'rgba(255, 92, 122, 0.05)'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#ff5c7a', marginBottom: '0.5rem' }}>
            ❌ Erro
          </div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.62)' }}>{output.message}</div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
