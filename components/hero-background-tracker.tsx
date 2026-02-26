'use client'

import { useEffect } from 'react'

export function HeroBackgroundTracker() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>('.hero-spotlight')
    const background = document.querySelector<HTMLElement>('.hero-background')

    if (!section || !background) return

    const handleMouseMove = (event: MouseEvent) => {
      background.style.setProperty('--x', `${event.clientX}px`)
      background.style.setProperty('--y', `${event.clientY}px`)
    }

    section.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      section.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return null
}
