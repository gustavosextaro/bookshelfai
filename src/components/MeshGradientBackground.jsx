import { MeshGradient } from '@paper-design/shaders-react'

/**
 * MeshGradientBackground
 * Premium animated mesh gradient background using @paper-design/shaders-react
 * Colors: Dark base with gold/amber accents matching BookshelfAI brand
 */
export default function MeshGradientBackground({ speed = 1.0 }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      zIndex: -10,
      overflow: 'hidden',
      background: '#0a0a0f'
    }}>
      <MeshGradient
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0
        }}
        colors={['#0f0f15', '#1a1510', '#2d1f10', '#d4b483']}
        speed={speed}
      />
    </div>
  )
}
