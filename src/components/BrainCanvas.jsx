import React, { useRef, useEffect, memo } from 'react'

// Memoized for performance - only re-render when props change
function BrainCanvas({ width = 200, height = 200 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    let particlesArray = []
    let animationFrameId

    const config = {
      brainScale: Math.min(width, height) / 450,
      connectionDistance: 60, // Further reduced from 80
      mouseDistance: 100, // Reduced from 120
      particleColor: '#a855f7',
      lineColor: '168, 85, 247',
      speed: 0.25 // Slightly slower for smoother motion
    }

    let mouse = {
      x: null,
      y: null,
      radius: config.mouseDistance
    }

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const handleMouseOut = () => {
      mouse.x = null
      mouse.y = null
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseout', handleMouseOut)

    function defineBrainPath(context, scale) {
      let cx = width / 2
      let cy = height / 2

      context.beginPath()
      context.moveTo(cx - 100 * scale, cy + 60 * scale)

      context.bezierCurveTo(
        cx - 160 * scale, cy + 60 * scale,
        cx - 160 * scale, cy - 60 * scale,
        cx - 80 * scale, cy - 100 * scale
      )

      context.bezierCurveTo(
        cx - 30 * scale, cy - 130 * scale,
        cx + 60 * scale, cy - 130 * scale,
        cx + 120 * scale, cy - 70 * scale
      )

      context.bezierCurveTo(
        cx + 160 * scale, cy - 20 * scale,
        cx + 160 * scale, cy + 60 * scale,
        cx + 100 * scale, cy + 90 * scale
      )

      context.bezierCurveTo(
        cx + 60 * scale, cy + 110 * scale,
        cx + 20 * scale, cy + 100 * scale,
        cx - 20 * scale, cy + 70 * scale
      )

      context.bezierCurveTo(
        cx - 50 * scale, cy + 90 * scale,
        cx - 80 * scale, cy + 80 * scale,
        cx - 100 * scale, cy + 60 * scale
      )

      context.closePath()
    }

    class Particle {
      constructor(x, y, directionX, directionY, size, color) {
        this.x = x
        this.y = y
        this.directionX = directionX
        this.directionY = directionY
        this.size = size
        this.color = color
      }

      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false)
        ctx.fillStyle = this.color
        ctx.fill()
      }

      update() {
        let nextX = this.x + this.directionX
        let nextY = this.y + this.directionY

        defineBrainPath(ctx, config.brainScale)

        if (!ctx.isPointInPath(nextX, nextY)) {
          this.directionX = -this.directionX
          this.directionY = -this.directionY

          let angleToCenter = Math.atan2((height / 2) - this.y, (width / 2) - this.x)
          this.x += Math.cos(angleToCenter) * 2
          this.y += Math.sin(angleToCenter) * 2
        } else {
          this.x += this.directionX
          this.y += this.directionY
        }

        let dx = mouse.x - this.x
        let dy = mouse.y - this.y
        let distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < mouse.radius + this.size) {
          if (mouse.x < this.x && ctx.isPointInPath(this.x + 2, this.y)) this.x += 2
          if (mouse.x > this.x && ctx.isPointInPath(this.x - 2, this.y)) this.x -= 2
          if (mouse.y < this.y && ctx.isPointInPath(this.x, this.y + 2)) this.y += 2
          if (mouse.y > this.y && ctx.isPointInPath(this.x, this.y - 2)) this.y -= 2
        }

        this.draw()
      }
    }

    function init() {
      particlesArray = []
      // Drastically reduced for better performance on all devices
      const numParticles = (width * height) / 8000

      defineBrainPath(ctx, config.brainScale)

      let attempts = 0
      while (particlesArray.length < numParticles && attempts < numParticles * 10) {
        let size = (Math.random() * 2) + 0.8
        let x = Math.random() * width
        let y = Math.random() * height

        if (ctx.isPointInPath(x, y)) {
          let directionX = (Math.random() * 2) - 1
          let directionY = (Math.random() * 2) - 1
          let color = config.particleColor
          particlesArray.push(new Particle(x, y, directionX * config.speed, directionY * config.speed, size, color))
        }
        attempts++
      }
    }

    function connect() {
      let opacityValue = 1
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          if (Math.abs(particlesArray[a].x - particlesArray[b].x) > config.connectionDistance) continue

          let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
            + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y))

          if (distance < (config.connectionDistance * config.connectionDistance)) {
            opacityValue = 1 - (distance / (config.connectionDistance * config.connectionDistance))
            ctx.strokeStyle = `rgba(${config.lineColor}, ${opacityValue})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
            ctx.stroke()
          }
        }
      }
    }

    let lastTime = 0
    const fps = 60
    const interval = 1000 / fps

    function animate(currentTime = 0) {
      animationFrameId = requestAnimationFrame(animate)
      
      // Throttle to 60fps
      const deltaTime = currentTime - lastTime
      if (deltaTime < interval) return
      lastTime = currentTime - (deltaTime % interval)
      ctx.clearRect(0, 0, width, height)

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)'
      ctx.lineWidth = 2
      defineBrainPath(ctx, config.brainScale)
      ctx.stroke()

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update()
      }
      connect()
    }

    init()
    animate()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseout', handleMouseOut)
      cancelAnimationFrame(animationFrameId)
    }
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
        margin: '0 auto'
      }}
    />
  )
}

// Export memoized version for performance
export default memo(BrainCanvas)
