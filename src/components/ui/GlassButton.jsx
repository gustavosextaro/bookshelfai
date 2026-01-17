import React, { useState } from 'react'

/**
 * GlassButton - Premium liquid glass button with transparency and backdrop blur
 */

const sizeConfig = {
  sm: {
    padding: '10px 20px',
    fontSize: '14px',
  },
  default: {
    padding: '14px 28px',
    fontSize: '16px',
  },
  lg: {
    padding: '18px 40px',
    fontSize: '18px',
  },
}

export default function GlassButton({
  children,
  size = 'default',
  variant = 'primary',
  onClick,
  style = {},
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const isPrimary = variant === 'primary'

  // Base styles for the wrapper
  const wrapperStyle = {
    position: 'relative',
    display: 'inline-block',
    borderRadius: '50px',
    cursor: 'pointer',
  }

  // Primary variant - frosted glass with blue accent
  const primaryBaseStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: '#ffffff',
    background: `
      linear-gradient(135deg, 
        rgba(96, 165, 250, 0.15) 0%, 
        rgba(59, 130, 246, 0.1) 100%)
    `,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 4px 16px rgba(96, 165, 250, 0.2),
      0 8px 32px rgba(59, 130, 246, 0.15),
      inset 0 1px 1px rgba(255, 255, 255, 0.2),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1)
    `,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(0)',
    ...sizeConfig[size],
  }

  const primaryHoverStyle = {
    transform: 'translateY(-3px)',
    background: `
      linear-gradient(135deg, 
        rgba(96, 165, 250, 0.25) 0%, 
        rgba(59, 130, 246, 0.18) 100%)
    `,
    border: '1px solid rgba(96, 165, 250, 0.5)',
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.15) inset,
      0 6px 20px rgba(96, 165, 250, 0.3),
      0 12px 40px rgba(59, 130, 246, 0.25),
      0 0 60px rgba(96, 165, 250, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.25),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1)
    `,
  }

  const primaryPressedStyle = {
    transform: 'translateY(-1px)',
    background: `
      linear-gradient(135deg, 
        rgba(96, 165, 250, 0.2) 0%, 
        rgba(59, 130, 246, 0.15) 100%)
    `,
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 2px 8px rgba(96, 165, 250, 0.2),
      0 4px 16px rgba(59, 130, 246, 0.15),
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      inset 0 -1px 1px rgba(0, 0, 0, 0.15)
    `,
  }

  // Secondary variant - frosted glass with white accent
  const secondaryBaseStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'rgba(255, 255, 255, 0.95)',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: `
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset,
      inset 0 1px 1px rgba(255, 255, 255, 0.15)
    `,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(0)',
    ...sizeConfig[size],
  }

  const secondaryHoverStyle = {
    transform: 'translateY(-2px)',
    background: 'rgba(255, 255, 255, 0.14)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: `
      0 6px 16px rgba(0, 0, 0, 0.15),
      0 0 30px rgba(255, 255, 255, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      inset 0 1px 2px rgba(255, 255, 255, 0.2)
    `,
  }

  const secondaryPressedStyle = {
    transform: 'translateY(0)',
    background: 'rgba(255, 255, 255, 0.1)',
    boxShadow: `
      0 2px 6px rgba(0, 0, 0, 0.1),
      inset 0 1px 1px rgba(255, 255, 255, 0.1)
    `,
  }

  // Get current button style based on state
  const getButtonStyle = () => {
    if (isPrimary) {
      if (isPressed) return { ...primaryBaseStyle, ...primaryPressedStyle, ...style }
      if (isHovered) return { ...primaryBaseStyle, ...primaryHoverStyle, ...style }
      return { ...primaryBaseStyle, ...style }
    } else {
      if (isPressed) return { ...secondaryBaseStyle, ...secondaryPressedStyle, ...style }
      if (isHovered) return { ...secondaryBaseStyle, ...secondaryHoverStyle, ...style }
      return { ...secondaryBaseStyle, ...style }
    }
  }

  // Glow effect for primary button
  const glowStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '120%',
    transform: 'translate(-50%, -50%)',
    background: 'radial-gradient(ellipse at center, rgba(96, 165, 250, 0.4) 0%, transparent 70%)',
    filter: 'blur(24px)',
    borderRadius: '50px',
    pointerEvents: 'none',
    opacity: isHovered ? 1 : 0.3,
    transition: 'opacity 0.4s ease',
  }

  return (
    <div style={wrapperStyle}>
      {isPrimary && <div style={glowStyle} />}
      <button
        style={getButtonStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false) }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    </div>
  )
}
