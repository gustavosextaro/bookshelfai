import { useEffect, useRef } from 'react'

/**
 * ProceduralGroundBackground
 * Enhanced WebGL 2D background with topographic neon lines.
 * Brighter colors and more visible effects.
 */
export default function ProceduralGroundBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        // Ground Perspective Simulation - more pronounced
        float depth = 1.0 / (uv.y + 1.0);
        vec2 gridUv = vec2(uv.x * depth, depth + u_time * 0.2);
        
        // Layered Procedural Noise for Terrain
        float n = noise(gridUv * 4.0);
        float n2 = noise(gridUv * 8.0) * 0.5;
        float ripples = sin(gridUv.y * 20.0 + n * 10.0 + u_time * 0.6);
        float ripples2 = sin(gridUv.y * 40.0 + n2 * 5.0 + u_time * 0.8) * 0.5;
        
        // Neon Topographic Lines - more visible
        float topoLine = smoothstep(0.04, 0.0, abs(ripples));
        float topoLine2 = smoothstep(0.06, 0.0, abs(ripples2)) * 0.4;
        
        // Color Palette - brighter and more vibrant
        vec3 baseColor = vec3(0.02, 0.02, 0.06); // Deep dark
        vec3 accentColor = vec3(0.08, 0.06, 0.18); // Purple tint
        vec3 neonGold = vec3(0.95, 0.75, 0.45);    // Bright gold
        vec3 neonPurple = vec3(0.6, 0.3, 0.9);     // Neon purple
        
        // Composite with more intensity
        vec3 finalColor = mix(baseColor, accentColor, n * 0.8);
        finalColor += topoLine * neonGold * depth * 0.5;
        finalColor += topoLine2 * neonPurple * depth * 0.3;
        
        // Add subtle glow at bottom
        float bottomGlow = smoothstep(0.3, -0.8, uv.y) * 0.15;
        finalColor += neonGold * bottomGlow;
        
        // Horizon Fog / Fade - less aggressive
        float fade = smoothstep(0.3, -0.5, uv.y);
        float vignette = 1.0 - length(uv) * 0.3;
        finalColor *= vignette * (1.0 - fade * 0.5);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const program = gl.createProgram()
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource))
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW)

    const posAttrib = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(posAttrib)
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0)

    const timeLoc = gl.getUniformLocation(program, "u_time")
    const resLoc = gl.getUniformLocation(program, "u_resolution")

    let animationFrameId

    const render = (time) => {
      const { innerWidth: width, innerHeight: height } = window
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }

      gl.uniform1f(timeLoc, time * 0.001)
      gl.uniform2f(resLoc, width, height)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0a12',
      zIndex: -10
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none'
        }}
      />
    </div>
  )
}
