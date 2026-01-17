import React from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import useShaderBackground from './components/ui/useShaderBackground'
import { Typewriter } from './components/ui/Typewriter'
import GlassButton from './components/ui/GlassButton'

export default function LandingPage({ onLogin, onSignup }) {
  const canvasRef = useShaderBackground();

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#000000'
    }}>
      {/* WebGL2 Shader Background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          touchAction: 'none',
          background: 'black'
        }}
      />
      
      {/* Dimming Overlay to reduce shader intensity */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.4)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      
      {/* Vignette Effect - dark corners */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.6) 100%)',
        pointerEvents: 'none',
        zIndex: 2
      }} />
      
      {/* Top Header - Logo, Login & CTA */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '24px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo - Left Side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer'
        }}>
          {/* BookshelfAI Icon */}
          <img 
            src="/bookshelf-icon.png" 
            alt="BookshelfAI" 
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain'
            }}
          />
          
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#E0F2FE',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}>
            BookshelfAI
          </span>
        </div>

        {/* Buttons - Right Side */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <GlassButton
            onClick={onSignup}
            size="sm"
            variant="secondary"
          >
            Começar Grátis
          </GlassButton>
          <GlassButton
            onClick={onLogin}
            size="sm"
            variant="secondary"
          >
            Fazer Login
          </GlassButton>
        </div>
      </div>
      
      {/* Hero Content Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Headline */}
            <div style={{ marginBottom: '48px' }}>
              <h1 style={{
                fontSize: 'clamp(3rem, 7vw, 5rem)',
                fontWeight: 800,
                lineHeight: 1.05,
                marginBottom: '0px',
                color: '#E0F2FE',
                textShadow: '0 0 40px rgba(96, 165, 250, 0.8), 0 0 80px rgba(59, 130, 246, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)',
                minHeight: '1.2em'
              }}>
                <Typewriter 
                  text={["Transforme", "Inove", "Aprimore", "Melhore", "Diferencie"]}
                  speed={150}
                  deleteSpeed={100}
                  delay={2000}
                  loop={true}
                  style={{
                    color: '#E0F2FE',
                    textShadow: '0 0 40px rgba(96, 165, 250, 0.8), 0 0 80px rgba(59, 130, 246, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)'
                  }}
                />
                {' '}sua leitura
              </h1>
              <h1 style={{
                fontSize: 'clamp(3rem, 7vw, 5rem)',
                fontWeight: 800,
                lineHeight: 1.05,
                marginTop: '0px',
                color: '#E0F2FE',
                textShadow: '0 0 40px rgba(96, 165, 250, 0.8), 0 0 80px rgba(59, 130, 246, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)'
              }}>
                com Inteligência Artificial
              </h1>
            </div>

            {/* Subtitle */}
            <p style={{
              fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
              color: 'rgba(224, 242, 254, 0.9)',
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: '768px',
              margin: '0 auto 48px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
            }}>
              Resumos inteligentes, roteiros personalizados e análises profundas dos seus livros favoritos
            </p>

            {/* CTA Button - Only Primary */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '40px'
            }}>
              <GlassButton
                onClick={onSignup}
                size="lg"
                variant="primary"
              >
                Começar Grátis
                <ArrowRight size={20} />
              </GlassButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
