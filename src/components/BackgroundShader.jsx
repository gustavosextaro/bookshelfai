import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Custom shader material for advanced effects
const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vec2 uv = vUv;
    
    // Create animated noise pattern
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
    
    // Mix colors based on noise and position
    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
    
    // Add glow effect
    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);
    
    gl_FragColor = vec4(color * glow, glow * 0.8);
  }
`

export default function BackgroundShader() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    
    // Setup Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 1.5

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Create Shader Material
    const uniforms = {
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color("#d4b483") }, // Gold
      color2: { value: new THREE.Color("#2a1b3d") }, // Deep Purple
    }

    const geometry = new THREE.PlaneGeometry(2, 2, 32, 32)
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    // Scale mesh to cover screen roughly at z=0 if camera is at z=1.5
    // Actually, plane is 2x2. With camera z=1.5, we might need adjustments.
    // Let's keep it simple as per original code, maybe scale it up a bit.
    mesh.scale.set(2, 2, 1) 
    scene.add(mesh)

    // Animation Loop
    const clock = new THREE.Clock()
    let animationId

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      const elapsedTime = clock.getElapsedTime()
      uniforms.time.value = elapsedTime
      uniforms.intensity.value = 1.0 + Math.sin(elapsedTime * 2) * 0.3
      
      renderer.render(scene, camera)
    }

    animate()

    // Resize Handler
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: '#000',
        pointerEvents: 'none'
      }}
    />
  )
}
