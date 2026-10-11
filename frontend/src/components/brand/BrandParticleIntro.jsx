import { useCallback, useEffect, useRef, useState } from 'react'
import SkilloraLogo from './SkilloraLogo.jsx'
import './BrandParticleIntro.css'

const FORMATION_MS = 1650
const GNANEX_LOGO = '/gnanex-logo-dark.png'

function ParticleFormation({ settled }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = canvas?.parentElement
    const context = canvas?.getContext?.('2d', { alpha: true })
    if (!canvas || !stage || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFallback(true)
      return undefined
    }

    let cancelled = false
    let initialized = false
    let targets = []
    const logo = new Image()

    const draw = (timestamp) => {
      if (cancelled) return
      const bounds = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, bounds.width)
      const height = Math.max(1, bounds.height)
      const pixelWidth = Math.round(width * dpr)
      const pixelHeight = Math.round(height * dpr)

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)

      if (!targets.length) {
        frameRef.current = requestAnimationFrame(draw)
        return
      }

      const logoWidth = Math.min(width * 0.82, 440)
      const scale = logoWidth / logo.width
      const left = (width - logoWidth) / 2
      const top = height * 0.43 - (logo.height * scale) / 2
      const elapsed = Math.min(timestamp - startTime, FORMATION_MS)
      const progress = Math.min(1, elapsed / FORMATION_MS)

      targets.forEach((particle, index) => {
        const angle = index * 2.399963229728653
        const ring = 1 + (index % 13) * 0.035
        const originX = width / 2 + Math.cos(angle) * (logoWidth * 0.57 * ring)
        const originY = height * 0.43 + Math.sin(angle) * (logo.height * scale * 1.15 * ring)
        const delay = (index % 9) * 0.018
        const particleProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        const particleEase = 1 - (1 - particleProgress) ** 3
        const x = originX + (left + particle.x * scale - originX) * particleEase
        const y = originY + (top + particle.y * scale - originY) * particleEase
        const radius = Math.max(0.75, scale * 1.05)

        context.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.a})`
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      })

      if (elapsed < FORMATION_MS) {
        frameRef.current = requestAnimationFrame(draw)
      }
    }

    let startTime = 0
    const handleImageLoad = () => {
      if (initialized || cancelled) return
      initialized = true
      try {
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = logo.naturalWidth
        maskCanvas.height = logo.naturalHeight
        const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
        if (!maskContext) throw new Error('Canvas context unavailable')
        maskContext.drawImage(logo, 0, 0)
        const pixels = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
        const samples = []

        for (let y = 1; y < maskCanvas.height; y += 2) {
          for (let x = 1; x < maskCanvas.width; x += 2) {
            const offset = (y * maskCanvas.width + x) * 4
            if (pixels[offset + 3] > 96) {
              samples.push({
                x,
                y,
                r: pixels[offset],
                g: pixels[offset + 1],
                b: pixels[offset + 2],
                a: pixels[offset + 3] / 255,
              })
            }
          }
        }

        const limit = window.innerWidth < 600 ? 430 : 760
        const stride = Math.max(1, Math.ceil(samples.length / limit))
        targets = samples.filter((_, index) => index % stride === 0)
        if (!targets.length) {
          setFallback(true)
          return
        }
        startTime = performance.now()
        frameRef.current = requestAnimationFrame(draw)
      } catch {
        setFallback(true)
      }
    }

    logo.addEventListener('load', handleImageLoad)
    logo.addEventListener('error', () => setFallback(true), { once: true })
    logo.src = GNANEX_LOGO
    logo.decode().then(handleImageLoad).catch(() => setFallback(true))

    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
      logo.removeEventListener('load', handleImageLoad)
    }
  }, [])

  return (
    <div className={`particle-logo ${settled ? 'is-settled' : ''} ${fallback ? 'has-fallback' : ''}`}>
      <canvas ref={canvasRef} className="particle-logo__canvas" aria-hidden="true" />
      <img className="particle-logo__image" src={GNANEX_LOGO} alt="GNANEX" />
    </div>
  )
}

export function BrandParticleIntro({ onComplete }) {
  const [phase, setPhase] = useState('forming')
  const [showOrganizedBy, setShowOrganizedBy] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const timersRef = useRef([])
  const finish = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setIsLeaving(true)
    timersRef.current.push(setTimeout(onComplete, 280))
  }, [onComplete])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const times = reducedMotion
      ? [260, 520, 850, 1250, 1650]
      : [1750, 2050, 2700, 3150, 3800, 4300]
    const actions = reducedMotion
      ? [() => setPhase('settled'), () => setShowOrganizedBy(true), () => setPhase('departing'), () => setPhase('skillora'), () => finish()]
      : [() => setPhase('settled'), () => setShowOrganizedBy(true), () => setPhase('departing'), () => setPhase('skillora'), () => setShowOrganizedBy(false), () => finish()]

    times.forEach((time, index) => {
      timersRef.current.push(setTimeout(actions[index], time))
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      timersRef.current.forEach(clearTimeout)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [finish])

  if (phase === 'complete') return null

  return (
    <div className={`brand-particle-intro ${isLeaving ? 'is-leaving' : ''}`} role="dialog" aria-label="Introducing SkillOra">
      <div className="brand-particle-intro__grain" aria-hidden="true" />
      <div className="brand-particle-intro__stage">
        <div className={`brand-particle-intro__gnanex ${phase === 'departing' || phase === 'skillora' ? 'is-departing' : ''}`}>
          <ParticleFormation settled={phase !== 'forming'} />
          <p className={`brand-particle-intro__credit ${showOrganizedBy ? 'is-visible' : ''}`}>
            <span>Organized by</span> <strong>GNANEX</strong>
          </p>
        </div>
        <div className={`brand-particle-intro__skillora ${phase === 'skillora' ? 'is-visible' : ''}`}>
          <SkilloraLogo variant="full" orientation="vertical" size="lg" theme="dark" />
          <p className={`brand-particle-intro__tagline ${phase === 'skillora' ? 'is-visible' : ''}`}>Set. Plan. Act. Track. Grow.</p>
        </div>
      </div>
      <button className="brand-particle-intro__skip" type="button" onClick={finish}>
        Skip intro
      </button>
    </div>
  )
}

export default BrandParticleIntro