'use client'

import { useEffect, useRef, useState } from 'react'

export default function VideoTour({ video, poster, descricao }: { video: string; poster: string; descricao: string }) {
  const referencia = useRef<HTMLVideoElement>(null)
  const [tocando, setTocando] = useState(false)

  // Sem autoPlay no HTML: quem pediu menos movimento no sistema fica so com o poster.
  useEffect(() => {
    const elemento = referencia.current
    if (!elemento || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // autoplay no elemento sobrevive a um recarregamento da midia; play() sozinho nao.
    // Navegador pode recusar o autoplay; o botao continua valendo.
    elemento.autoplay = true
    elemento.play().catch(() => {})
  }, [])

  function alternar() {
    const elemento = referencia.current
    if (!elemento) return
    if (elemento.paused) {
      elemento.play().catch(() => {})
    } else {
      // Sem isso o autoplay religa o video se a midia recarregar.
      elemento.autoplay = false
      elemento.pause()
    }
  }

  return (
    <>
      <video
        ref={referencia}
        src={video}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEmptied={(evento) => setTocando(!evento.currentTarget.paused)}
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <p className="sr-only">{descricao}</p>
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? 'Pausar vídeo' : 'Reproduzir vídeo'}
        className="absolute bottom-5 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        {tocando ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
    </>
  )
}
