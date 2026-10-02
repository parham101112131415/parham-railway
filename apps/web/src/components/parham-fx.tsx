import { useEffect } from 'react'
import './parham-fx.css'

/* UI sounds: Kenney "Interface Sounds" (CC0) — stanng mapping.
   Served from /sfx/ (public/statics/sfx in this repo). */
const SFX_BASE = '/sfx/'
const SFX_FILES = ['click', 'close', 'error', 'notify', 'open', 'success', 'toggle'] as const
type SfxName = (typeof SFX_FILES)[number]

const MUTE_KEY = 'px-mute'

let audioCtx: AudioContext | null = null

function isSoundOn(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) !== '1'
  } catch {
    return true
  }
}

function playSfx(name: SfxName, vol = 0.4): void {
  if (!isSoundOn()) return
  try {
    const a = new Audio(`${SFX_BASE}${name}.ogg`)
    a.volume = vol
    const p = a.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* ignore */
  }
}

/* Subtle tactile blip on real taps (stanng params) — never on scroll touches. */
function blip(soft: boolean): void {
  if (!isSoundOn()) return
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const t = audioCtx.currentTime + 0.01
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(soft ? 520 : 760, t)
    o.frequency.exponentialRampToValueAtTime(soft ? 390 : 1180, t + 0.055)
    g.gain.setValueAtTime(soft ? 0.028 : 0.045, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075)
    o.connect(g)
    g.connect(audioCtx.destination)
    o.start(t)
    o.stop(t + 0.08)
  } catch {
    /* ignore */
  }
}

const REDUCED = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type TapState = { x: number; y: number; t: number; el: Element; moved: boolean }
const taps = new Map<number, TapState>()

function closestInteractive(target: EventTarget | null): Element | null {
  if (!(target instanceof Element) || typeof target.closest !== 'function') return null
  return target.closest('button, a, [role="button"], [role="tab"], [role="menuitem"], [role="option"], summary, input[type="checkbox"], input[type="radio"], select')
}

function spawnRipple(el: Element, x: number, y: number): void {
  const rect = el.getBoundingClientRect()
  const s = Math.max(rect.width, rect.height) * 1.2
  for (let i = 0; i < 2; i++) {
    const span = document.createElement('span')
    span.className = `px-ripple${i ? ' px-r2' : ''}`
    span.style.width = span.style.height = `${s}px`
    span.style.left = `${x - s / 2}px`
    span.style.top = `${y - s / 2}px`
    el.appendChild(span)
    span.addEventListener('animationend', () => span.remove(), { once: true })
  }
  for (let i = 0; i < 9; i++) {
    const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.5
    const d = 28 + Math.random() * 42
    const spark = document.createElement('span')
    spark.className = 'px-spark'
    spark.style.left = `${x}px`
    spark.style.top = `${y}px`
    spark.style.setProperty('--dx', `${Math.cos(a) * d}px`)
    spark.style.setProperty('--dy', `${Math.sin(a) * d}px`)
    el.appendChild(spark)
    spark.addEventListener('animationend', () => spark.remove(), { once: true })
  }
}

function ensureRippleScope(el: Element): void {
  if (el instanceof HTMLElement && !el.classList.contains('px-needs-ripple')) {
    el.classList.add('px-needs-ripple')
  }
}

function toastKind(toast: Element): SfxName | null {
  const t = toast.getAttribute('data-type')
  if (t === 'success') return 'success'
  if (t === 'error' || t === 'warning') return 'error'
  if (t === 'info' || t === 'loading' || t === 'default' || t === null) return 'notify'
  return 'notify'
}

export default function ParhamFx() {
  useEffect(() => {
    const reduced = REDUCED()

    /* ── bubbles canvas ── */
    const canvas = document.createElement('canvas')
    canvas.id = 'px-bubbles'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)
    let raf = 0
    let running = true
    const startBubbles = (): void => {
      if (reduced) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let W = 0
      let H = 0
      const resize = (): void => {
        W = canvas.width = window.innerWidth
        H = canvas.height = window.innerHeight
      }
      resize()
      window.addEventListener('resize', resize)
      const N = Math.min(26, window.innerWidth < 700 ? 14 : 26)
      const bubbles = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.5 + Math.random() * 4.5,
        s: 0.15 + Math.random() * 0.55,
        red: Math.random() < 0.5,
        a: 0.05 + Math.random() * 0.17,
        d: Math.random() * Math.PI * 2,
      }))
      const loop = (): void => {
        if (!running) return
        ctx.clearRect(0, 0, W, H)
        for (const b of bubbles) {
          b.y -= b.s
          b.d += 0.01
          b.x += Math.sin(b.d) * 0.3
          if (b.y < -12) {
            b.y = H + 12
            b.x = Math.random() * W
          }
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r, 0, 6.283)
          ctx.fillStyle = b.red ? `rgba(239,68,68,${b.a})` : `rgba(255,255,255,${b.a * 0.5})`
          ctx.shadowColor = 'rgba(239,68,68,.45)'
          ctx.shadowBlur = 6
          ctx.fill()
          ctx.shadowBlur = 0
        }
        raf = requestAnimationFrame(loop)
      }
      const onVis = (): void => {
        if (document.hidden) {
          running = false
          cancelAnimationFrame(raf)
        } else {
          running = true
          loop()
        }
      }
      document.addEventListener('visibilitychange', onVis)
      loop()
      ;(canvas as any)._pxCleanup = () => {
        running = false
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        document.removeEventListener('visibilitychange', onVis)
      }
    }
    startBubbles()

    /* ── mute button ── */
    const mute = document.createElement('div')
    mute.className = 'px-mute'
    mute.setAttribute('role', 'button')
    mute.setAttribute('aria-label', 'Sound on/off')
    const syncMute = (): void => {
      mute.textContent = isSoundOn() ? '🔊' : '🔇'
    }
    syncMute()
    mute.addEventListener('click', e => {
      e.stopPropagation()
      const on = !isSoundOn()
      try {
        localStorage.setItem(MUTE_KEY, on ? '0' : '1')
      } catch {
        /* ignore */
      }
      syncMute()
      if (on) void playSfx('toggle', 0.3)
    })
    document.body.appendChild(mute)

    /* ── tap-verified feedback (silent on scroll) ── */
    const onDown = (e: PointerEvent): void => {
      if (e.isPrimary === false) return
      const el = closestInteractive(e.target)
      if (!el || el.classList.contains('px-mute')) return
      taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now(), el, moved: false })
      if (!reduced && el.classList.contains('button')) el.classList.add('px-press')
      if (el instanceof HTMLElement && (el.tagName === 'BUTTON' || el.classList.contains('button'))) ensureRippleScope(el)
    }
    const onMove = (e: PointerEvent): void => {
      const r = taps.get(e.pointerId)
      if (!r) return
      if (Math.abs(e.clientX - r.x) + Math.abs(e.clientY - r.y) > 12) {
        r.moved = true
        r.el.classList.remove('px-press')
      }
    }
    const onUp = (e: PointerEvent): void => {
      const r = taps.get(e.pointerId)
      if (!r) return
      taps.delete(e.pointerId)
      r.el.classList.remove('px-press')
      if (r.moved || Date.now() - r.t > 600) return
      const cb = e.target instanceof Element ? e.target.closest('input[type="checkbox"],input[type="radio"]') : null
      const sw = e.target instanceof Element ? e.target.closest('[role="switch"]') : null
      if (cb || sw) {
        playSfx('toggle', 0.3)
        return
      }
      blip(false)
      if (reduced) return
      const btn = r.el.closest('button, .button')
      if (btn) {
        try {
          if (navigator.vibrate) navigator.vibrate(8)
        } catch {
          /* ignore */
        }
        const rc = (btn as HTMLElement).getBoundingClientRect()
        const cx = (e.clientX || rc.left + rc.width / 2) - rc.left
        const cy = (e.clientY || rc.top + rc.height / 2) - rc.top
        ensureRippleScope(btn)
        spawnRipple(btn, cx, cy)
      }
    }
    const onCancel = (e: PointerEvent): void => {
      const r = taps.get(e.pointerId)
      if (r) {
        taps.delete(e.pointerId)
        r.el.classList.remove('px-press')
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onCancel, true)

    /* ── select/checkbox change → toggle sound ── */
    const onChange = (e: Event): void => {
      const t = e.target
      if (t instanceof Element && t.matches('input[type="checkbox"],input[type="radio"],select')) playSfx('toggle', 0.3)
    }
    document.addEventListener('change', onChange, true)

    /* ── dialogs (open/close) + sonner toasts (success/error/notify) ── */
    const seenDialogs = new WeakSet<Element>()
    const seenToasts = new WeakSet<Element>()
    const obs = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(n => {
          if (!(n instanceof Element)) return
          const dlg = n.matches('[role="dialog"],[role="alertdialog"]') ? n : n.querySelector('[role="dialog"],[role="alertdialog"]')
          if (dlg && !seenDialogs.has(dlg)) {
            seenDialogs.add(dlg)
            playSfx('open', 0.35)
          }
          const toasts = n.matches('[data-sonner-toast]') ? [n] : Array.from(n.querySelectorAll('[data-sonner-toast]'))
          for (const toast of toasts) {
            if (seenToasts.has(toast)) continue
            seenToasts.add(toast)
            const kind = toastKind(toast)
            if (kind) playSfx(kind, kind === 'notify' ? 0.35 : 0.4)
            if (!reduced) {
              const box = toast.closest('[data-sonner-toast]') ?? toast
              if (kind === 'error') {
                box.classList.add('px-shake')
                setTimeout(() => box.classList.remove('px-shake'), 500)
              }
            }
          }
        })
        m.removedNodes.forEach(n => {
          if (!(n instanceof Element)) return
          const dlg = n.matches('[role="dialog"],[role="alertdialog"]') ? n : n.querySelector('[role="dialog"],[role="alertdialog"]')
          if (dlg) playSfx('close', 0.4)
        })
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onCancel, true)
      document.removeEventListener('change', onChange, true)
      obs.disconnect()
      taps.clear()
      ;(canvas as any)._pxCleanup?.()
      canvas.remove()
      mute.remove()
    }
  }, [])

  return null
}
