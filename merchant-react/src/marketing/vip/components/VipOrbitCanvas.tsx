import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../vipMotion'

interface Node {
  angle: number
  radius: number
  speed: number
  size: number
  hue: number
}

export function VipOrbitCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let raf = 0
    const nodes: Node[] = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2,
      radius: 0.22 + (i % 3) * 0.08,
      speed: 0.0012 + (i % 5) * 0.0003,
      size: 2 + (i % 4),
      hue: 200 + (i % 6) * 18,
    }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w * 0.5
      const cy = h * 0.52
      const base = Math.min(w, h)

      ctx.clearRect(0, 0, w, h)

      const glow = ctx.createRadialGradient(cx, cy, base * 0.05, cx, cy, base * 0.55)
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
      glow.addColorStop(0.45, 'rgba(99, 102, 241, 0.12)')
      glow.addColorStop(1, 'rgba(15, 23, 42, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      for (const node of nodes) {
        node.angle += node.speed
        const r = base * node.radius
        const x = cx + Math.cos(node.angle) * r
        const y = cy + Math.sin(node.angle) * r * 0.42

        ctx.beginPath()
        ctx.arc(x, y, node.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${node.hue}, 85%, 68%, 0.9)`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, node.size * 3.2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${node.hue}, 90%, 60%, 0.12)`
        ctx.fill()
      }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)'
      ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        const rr = base * (0.18 + i * 0.1)
        ctx.beginPath()
        ctx.ellipse(cx, cy, rr, rr * 0.38, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      frame++
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      className={['vip-orbit-canvas', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
