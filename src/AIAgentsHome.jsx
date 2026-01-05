import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import BrainCanvas from './components/BrainCanvas'
import { Eraser } from 'lucide-react'

// Initialize username from localStorage immediately to prevent flash
const getInitialUsername = () => {
  const saved = localStorage.getItem('bookshelfai.username')
  return saved || 'Usuário'
}

// Extracted Component to fix focus loss issues
const ChatInputSection = ({
  styles,
  selectedBookIds,
  setSelectedBookIds,
  showHistory,
  setShowHistory,
  isMobile,
  message,
  setMessage,
  handleKeyDown,
  handleVoiceInput,
  isRecording,
  handleClearChat,
  textareaRef,
  handleGenerate,
  showBookSelector,
  setShowBookSelector
}) => (
  <div style={styles.chatInputWrapper}>
    {selectedBookIds.length > 0 && (
      <div style={{
        position: 'absolute',
        top: '-2.5rem',
        left: '0.5rem',
        fontSize: '0.75rem',
        color: '#6366f1',
        background: 'rgba(99, 102, 241, 0.1)',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📚 {selectedBookIds.length} livros selecionados
        <button 
          onClick={() => setSelectedBookIds([])}
          style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0 }}
        >
          ×
        </button>
      </div>
    )}



    <div style={styles.chatInputContainer}>
      <div style={styles.gradientOverlay}></div>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Como posso ajudar a transformar seus livros hoje?"
        style={styles.textarea}
        rows={1}
      />
      <div style={styles.inputActions}>
        <div style={styles.leftActions}>
          <button 
            style={{
              ...styles.iconButton,
              width: 'auto',
              padding: '0 12px',
              fontSize: '0.875rem',
              gap: '6px',
              color: selectedBookIds.length > 0 ? '#6366f1' : '#94a3b8',
              border: selectedBookIds.length > 0 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
              background: selectedBookIds.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
            }} 
            title="Selecionar Livros (Contexto)"
            onClick={() => setShowBookSelector(true)}
          >
            📚 {selectedBookIds.length > 0 ? `${selectedBookIds.length} selecionados` : 'Contexto'}
          </button>
          <button
            style={styles.iconButton}
            onClick={() => setShowHistory(!showHistory)}
            title="Histórico"
          >
            📜
          </button>
          <button 
            style={{
              ...styles.iconButton,
              color: isRecording ? '#ef4444' : '#94a3b8',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none'
            }}
            onClick={handleVoiceInput}
            title={isRecording ? "Parar gravação (clique ou fale)" : "Entrada de voz"}
          >
            {isRecording ? '🔴' : '🎤'}
          </button>
          <button 
            style={styles.iconButton}
            onClick={handleClearChat}
            title="Nova Conversa / Limpar Tela"
          >
            <Eraser size={18} />
          </button>
        </div>
        <div style={styles.rightActions}>
          <span style={styles.hint}>Shift + Enter para quebrar linha</span>
          <button 
            style={styles.sendButton}
            onClick={() => handleGenerate()}
            disabled={!message.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
    <p style={styles.disclaimer}>
      A IA pode cometer erros. Verifique informações importantes.
    </p>
  </div>
)

export default function AIAgentsHome() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState(getInitialUsername())
  const [brainStats, setBrainStats] = useState({
    booksCount: 0,
    insightsCount: 0,
    scriptsCount: 0
  })
  const [books, setBooks] = useState([])
  const [selectedBookIds, setSelectedBookIds] = useState([])
  const [showBookSelector, setShowBookSelector] = useState(false)
  
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // Moved after state initialization to prevent ReferenceError
  const isHeroMode = conversationHistory.length === 0 && !loading && !output

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory, loading, output])

  // Initialize Web Speech API for voice input
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'pt-BR'
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setMessage(transcript)
        setIsRecording(false)
      }
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        if (event.error === 'not-allowed') {
          alert('Permissão de microfone negada. Por favor, permita o acesso ao microfone.')
        }
      }
      
      recognition.onend = () => {
        setIsRecording(false)
      }
      
      recognitionRef.current = recognition
    }
  }, [])

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
      
    if (booksData) {
      setBooks(booksData)
    }

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

  async function handleGenerate(customPrompt = null) {
    let prompt = customPrompt || message.trim()
    if (!prompt) return

    // Inject Selected Books Context
    if (selectedBookIds.length > 0) {
      const selectedTitles = books
        .filter(b => selectedBookIds.includes(b.id))
        .map(b => `"${b.title}"`)
        .join(', ')
        
      prompt += `\n\n[CONTEXTO IMPORTANTE: Use APENAS o conhecimento dos seguintes livros para esta resposta: ${selectedTitles}]`
    } else if (books.length > 0) {
       // Implicitly context is all books, but explicit mentions help RAG agents
       // We let the backend handle 'all' usually, or we can list all titles if we want strictness.
       // For now, leaving it open if no specific selection is made (default behavior).
    }

    const userMessage = { type: 'user', content: customPrompt || message.trim(), timestamp: new Date().toISOString() }
    
    setConversationHistory(prev => [...prev, userMessage])
    setLoading(true)
    setOutput(null)
    if (!customPrompt) setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Não autenticado')
      }

      const res = await fetch('/.netlify/functions/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          type: 'chat',
          customPrompt: prompt,
          conversationHistory: conversationHistory.filter(msg => msg.type !== 'error').map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      })

      const data = await res.json()
      
      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || 'Erro ao gerar conteúdo')
      }
      
      const aiMessage = { 
        type: 'ai', 
        content: data.result,
        metadata: data.metadata,
        timestamp: new Date().toISOString() 
      }
      setConversationHistory(prev => [...prev, aiMessage])
      setOutput(data)
      
      loadUserData()
    } catch (error) {
      console.error('Error generating content:', error)
      const errorMessage = { type: 'error', content: error.message, timestamp: new Date().toISOString() }
      setConversationHistory(prev => [...prev, errorMessage])
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
  
  const toggleBookSelection = (id) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    )
  }

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta entrada de voz. Use Chrome ou Edge para melhor experiência.')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Error starting recognition:', error)
        setIsRecording(false)
      }
    }
  }

  const handleClearChat = () => {
    if (conversationHistory.length > 0 || output || message) {
      if (window.confirm('Iniciar nova conversa? O histórico atual da tela será limpo.')) {
        setConversationHistory([])
        setOutput(null)
        setMessage('')
      }
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
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isHeroMode ? 'flex-start' : 'center',
      justifyContent: isHeroMode ? 'flex-start' : 'center',
      padding: '2rem 1.5rem',
      fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden'
    },
    greetingContainer: {
      width: '100%',
      maxWidth: '52rem',
      marginBottom: '1rem', // Reduced from 2.5rem
      textAlign: 'center',
      animation: 'fadeIn 0.6s ease-out'
    },
    greetingText: {
      fontSize: 'clamp(2rem, 5vw, 3rem)',
      fontWeight: '400',
      color: '#ffffff',
      marginBottom: '1rem', // Reduced from 1.5rem
      letterSpacing: '-0.025em',
      fontFamily: '"Playfair Display", Georgia, serif'
    },
    statsContainer: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5rem',
      padding: '0.75rem 1.5rem',
      borderRadius: '9999px',
      background: 'rgba(30, 41, 59, 0.4)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    statIndicator: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: '#10b981',
      boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
    },
    statText: {
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#cbd5e1'
    },
    statDivider: {
      width: '1px',
      height: '12px',
      background: 'rgba(148, 163, 184, 0.3)'
    },
    chatInputWrapper: {
      width: '100%',
      maxWidth: '100%',
      marginTop: '1rem' // Reduced from 1.5rem
    },
    chatInputContainer: {
      position: 'relative',
      width: '100%',
      borderRadius: '16px',
      border: '1px solid rgba(71, 85, 105, 0.3)',
      background: 'rgba(26, 31, 46, 0.6)',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      padding: window.innerWidth < 768 ? '0.75rem' : '1rem',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.0)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    gradientOverlay: {
      position: 'absolute',
      inset: '1px',
      borderRadius: '1rem',
      background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
      pointerEvents: 'none'
    },
    textarea: {
      width: '100%',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontSize: '1.125rem',
      fontWeight: '300',
      fontFamily: 'inherit',
      color: '#e2e8f0',
      background: 'transparent',
      padding: '1.25rem',
      minHeight: '70px',
      maxHeight: '384px',
      lineHeight: '1.6',
      zIndex: 1,
      position: 'relative'
    },
    inputActions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.25rem 0.75rem 0.75rem',
      gap: '0.75rem',
      position: 'relative',
      zIndex: 1
    },
    leftActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    iconButton: {
      width: '2.25rem',
      height: '2.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: 'transparent',
      color: '#94a3b8',
      cursor: 'pointer',
      borderRadius: '0.5rem',
      transition: 'all 0.2s',
      fontSize: '1.25rem'
    },
    rightActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    hint: {
      fontSize: '0.625rem',
      color: '#64748b',
      display: 'block'
    },
    sendButton: {
      width: '2.25rem',
      height: '2.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: message.trim() ? '#6366f1' : 'rgba(99, 102, 241, 0.3)',
      color: '#FFFFFF',
      cursor: message.trim() ? 'pointer' : 'default',
      borderRadius: '0.75rem',
      transition: 'all 0.2s',
      fontSize: '1.125rem',
      boxShadow: message.trim() ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none',
      transform: message.trim() ? 'scale(1)' : 'scale(0.95)'
    },
    card: {
      width: '100%',
      maxWidth: '42rem',
      background: 'rgba(26, 31, 46, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '1rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      padding: '1.5rem',
      animation: 'fadeIn 0.6s ease-out',
      backdropFilter: 'blur(12px)',
      marginBottom: '1rem' 
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '1rem',
      maxWidth: '48rem',
      width: '100%',
      padding: '0 1rem',
      marginBottom: '2rem'
    },
    actionCard: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.5rem',
      padding: '1rem',
      borderRadius: '0.75rem',
      background: 'rgba(26, 31, 46, 0.6)',
      border: '1px solid rgba(71, 85, 105, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      textAlign: 'left',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    },
    actionIcon: {
      width: '2.25rem',
      height: '2.25rem',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      transition: 'all 0.3s',
      marginBottom: '0.25rem'
    },
    actionLabel: {
      fontSize: '0.8125rem',
      fontWeight: '600',
      color: '#e2e8f0',
      transition: 'color 0.3s',
      display: 'block'
    },
    actionDescription: {
      fontSize: '0.6875rem',
      color: '#64748b',
      marginTop: '0.125rem',
      lineHeight: '1.3',
      display: 'block'
    },
    disclaimer: {
      marginTop: '0.75rem',
      fontSize: '0.625rem',
      color: '#64748b',
      textAlign: 'center'
    }
  }

  const quickActions = [
    {
      icon: '🎬',
      label: 'Roteiro TikTok',
      description: 'Viralize conteúdo de livros',
      prompt: 'Crie um roteiro viral para TikTok/Reels baseado nos livros da minha biblioteca',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.1)'
    },
    {
      icon: '💡',
      label: 'Gerar Ideias',
      description: '10 conceitos de vídeo',
      prompt: 'Me dê 5 ideias criativas de conteúdo não-genéricas',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)'
    },
    {
      icon: '📝',
      label: 'Resumo Rápido',
      description: 'Capítulos essenciais',
      prompt: 'Faça um resumo em tópicos dos principais insights',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      icon: '🎴',
      label: 'Flashcards',
      description: 'Estudo ativo & revisão',
      prompt: 'Crie flashcards para estudar os conceitos principais',
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.1)'
    }
  ]

  // Shared props for ChatInputSection
  const chatInputProps = {
    styles,
    selectedBookIds,
    setSelectedBookIds,
    showHistory,
    setShowHistory,
    isMobile,
    message,
    setMessage,
    handleKeyDown,
    handleVoiceInput,
    isRecording,
    handleClearChat,
    textareaRef,
    handleGenerate,
    showBookSelector,
    setShowBookSelector
  }


  return (
    <div style={{
      ...styles.container,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Scrollable Main Area */}
      <div className="no-scrollbar" style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: isHeroMode ? '0' : '0.5rem',
        paddingBottom: '160px', // Extra padding to clear the fixed footer
        overflowY: isHeroMode ? 'hidden' : 'auto',
        overflowX: 'hidden', // prevent horizontal scroll
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          width: '100%',
          maxWidth: '800px',
          position: 'relative',
          zIndex: 1,
          marginTop: '0',
          paddingTop: '8rem'
        }}>
          {isHeroMode && (
            <>
               
               {/* Greeting Section */}
              <div style={styles.greetingContainer}>
                <h2 style={{...styles.greetingText, fontSize: isMobile ? '1.5rem' : '2rem'}}>
                  {greeting}, {username}
                </h2>
                <div style={{...styles.statsContainer, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.5rem' : '1rem'}}>
                  <div style={styles.statItem}>
                    <div style={styles.statIndicator}></div>
                    <span style={styles.statText}>{brainStats.booksCount} livros processados</span>
                  </div>
                  <div style={styles.statDivider}></div>
                  <div style={styles.statItem}>
                    <span style={styles.statText}>{brainStats.scriptsCount} roteiros</span>
                  </div>
                  <div style={styles.statDivider}></div>
                  <div style={styles.statItem}>
                    <span style={styles.statText}>{brainStats.insightsCount} insights novos</span>
                  </div>
                </div>
              </div>
              
              {/* Centralized Input Area */}
              <div style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                <ChatInputSection {...chatInputProps} />
              </div>

              {/* Quick Action Cards - Centralized */}
              <div style={{...styles.quickActions, marginTop: '0', width: '100%', maxWidth: '800px'}}>
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    style={styles.actionCard}
                    onClick={() => handleGenerate(action.prompt)}
                    disabled={loading}
                  >
                    <div style={styles.actionIcon}>
                      {action.icon}
                    </div>
                    <div>
                      <span style={styles.actionLabel}>{action.label}</span>
                      <div style={styles.actionDescription}>{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Messages History - Loading/Output/Error States */}
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

              {((output.metadata?.books_used?.length > 0) || (selectedBookIds.length > 0)) && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.62)', marginBottom: '0.5rem' }}>Livros base:</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(output.metadata?.books_used || books.filter(b => selectedBookIds.includes(b.id)).map(b => b.title)).map((book, i) => (
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
                padding: '1rem'
              }}>
                {output.result}
              </div>
            </div>
          )}

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
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer / Input Area - Fixed at bottom - Only visible when NOT in Hero Mode */}
      {!isHeroMode && (
        <div style={{ 
          width: '100%', 
          maxWidth: '800px', 
          paddingTop: '1rem',
          position: 'relative',
          zIndex: 10
        }}>
           <ChatInputSection {...chatInputProps} />
        </div>
      )}

      {/* Book Selector Modal */}
      {showBookSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={() => setShowBookSelector(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: 'rgb(30, 41, 59)',
            borderRadius: '1rem',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            overflow: 'hidden',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}>
              <h3 style={{ margin: 0, color: 'white' }}>Selecionar Contexto de Livros</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
                Escolha quais livros a IA deve usar como base.
              </p>
            </div>
            
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
               {books.length === 0 ? (
                 <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                   Nenhum livro na biblioteca ainda.
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div 
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                      onClick={() => setSelectedBookIds([])}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedBookIds.length === 0} 
                        onChange={() => setSelectedBookIds([])}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <span style={{ color: 'white', fontWeight: '500' }}>Todos os Livros (Automático)</span>
                    </div>

                    {books.map(book => (
                      <div 
                        key={book.id}
                        style={{ 
                          padding: '0.75rem', 
                          borderRadius: '0.5rem', 
                          background: selectedBookIds.includes(book.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                          border: selectedBookIds.includes(book.id) ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                        onClick={() => toggleBookSelection(book.id)}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedBookIds.includes(book.id)} 
                          onChange={() => toggleBookSelection(book.id)}
                          style={{ accentColor: '#6366f1' }}
                        />
                        <span style={{ color: 'white' }}>{book.title}</span>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btnPrimary"
                onClick={() => setShowBookSelector(false)}
                style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Confirmar seleção ({selectedBookIds.length || 'Todos'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal (Same as before) */}
      {showHistory && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '2rem'
          }}
          onClick={() => setShowHistory(false)}
          >
            <div 
              style={{
                width: isMobile ? '100%' : '100%',
                maxWidth: isMobile ? '100%' : '800px',
                height: isMobile ? '100%' : 'auto',
                maxHeight: isMobile ? '100%' : '80vh',
                background: 'rgba(18, 21, 30, 0.95)',
                borderRadius: isMobile ? '0' : '16px',
                border: isMobile ? 'none' : '1px solid rgba(71, 85, 105, 0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                padding: isMobile ? '1rem' : '1.5rem',
                borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: '600', color: '#ffffff' }}>
                  📜 Histórico de Conversas
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: isMobile ? '1rem' : '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {conversationHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                    Nenhuma conversa ainda. Comece enviando uma mensagem!
                  </div>
                ) : (
                  conversationHistory.map((msg, i) => (
                    <div key={i} style={{
                      padding: isMobile ? '0.75rem' : '1rem',
                      borderRadius: '12px',
                      background: msg.type === 'user' ? 'rgba(99, 102, 241, 0.1)' : msg.type === 'error' ? 'rgba(255, 92, 122, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${msg.type === 'user' ? 'rgba(99, 102, 241, 0.2)' : msg.type === 'error' ? 'rgba(255, 92, 122, 0.2)' : 'rgba(71, 85, 105, 0.3)'}`,
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{msg.type === 'user' ? '👤 Você' : msg.type === 'error' ? '❌ Erro' : '🤖 IA'}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <div style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: isMobile ? '0.8125rem' : '0.875rem',
                        lineHeight: '1.6',
                        color: msg.type === 'error' ? '#ff5c7a' : '#e2e8f0'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
