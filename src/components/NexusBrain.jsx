import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'

function NetworkNode({ position, color, size }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={0.5} 
        roughness={0.2} 
        metalness={0.8} 
      />
    </mesh>
  )
}

function NetworkConnections({ points, color }) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={0.3} 
        linewidth={1} 
      />
    </line>
  )
}

function NexusGroup() {
  const groupRef = useRef()
  
  // Generate random nodes
  const { nodes, connections } = useMemo(() => {
    const nodeCount = 40
    const connectionDistance = 2.5
    const tempNodes = []
    
    // Create random nodes
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const r = 2 + Math.random() * 1.5 // Radius between 2 and 3.5
      
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      
      // Assign random colors from a palette
      const colors = ['#7c5cff', '#3dd9eb', '#ff5c7a', '#ffd700', '#ffffff']
      const color = colors[Math.floor(Math.random() * colors.length)]
      
      tempNodes.push({ position: new THREE.Vector3(x, y, z), color, size: Math.random() * 0.1 + 0.05 })
    }
    
    // Create connections based on distance
    const tempConnections = []
    for (let i = 0; i < tempNodes.length; i++) {
      for (let j = i + 1; j < tempNodes.length; j++) {
        const dist = tempNodes[i].position.distanceTo(tempNodes[j].position)
        if (dist < connectionDistance) {
          tempConnections.push([tempNodes[i].position, tempNodes[j].position])
        }
      }
    }
    
    return { nodes: tempNodes, connections: tempConnections }
  }, [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    
    // Rotation
    groupRef.current.rotation.y = t * 0.1
    groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.1
    
    // Breathing effect
    const scale = 1 + Math.sin(t * 0.8) * 0.05
    groupRef.current.scale.set(scale, scale, scale)
  })

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <NetworkNode key={i} {...node} />
      ))}
      
      {/* Since drawing many individual lines can be expensive, we group them or draw segments */}
      {/* For simplicity/performance in this specific setup, individual lines for shorter connections logic */}
      {connections.map((pair, i) => (
         <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  pair[0].x, pair[0].y, pair[0].z,
                  pair[1].x, pair[1].y, pair[1].z
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
         </line>
      ))}
      
      {/* Central Core Glow */}
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#7c5cff" distance={5} />
    </group>
  )
}

export default function NexusBrain({ width = '100%', height = '300px' }) {
  return (
    <div style={{ width, height, position: 'relative' }}>
        <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            filter: 'drop-shadow(0 0 30px rgba(124, 92, 255, 0.2))'
        }}>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#3dd9eb" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff5c7a" />
                <NexusGroup />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
        </div>
    </div>
  )
}
