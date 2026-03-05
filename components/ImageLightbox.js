import { useState, useEffect, useRef, useCallback } from 'react'

export default function ImageLightbox() {
  const [image, setImage] = useState(null)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const open = (e) => { setImage(e.detail); setScale(1); setPos({ x: 0, y: 0 }) }
    window.addEventListener('thoverse:image', open)
    return () => window.removeEventListener('thoverse:image', open)
  }, [])

  useEffect(() => {
    if (!image) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [image])

  const close = () => { setImage(null); setScale(1); setPos({ x: 0, y: 0 }) }

  const onWheel = useCallback((e) => {
    e.preventDefault()
    setScale(s => Math.min(5, Math.max(0.5, s - e.deltaY * 0.001)))
  }, [])

  const onMouseDown = (e) => {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
  }

  const onMouseMove = (e) => {
    if (!dragging.current) return
    const nx = e.clientX - dragStart.current.x
    const ny = e.clientY - dragStart.current.y
    posRef.current = { x: nx, y: ny }
    setPos({ x: nx, y: ny })
  }

  const onMouseUp = () => { dragging.current = false }

  const onDoubleClick = () => { setScale(1); setPos({ x: 0, y: 0 }); posRef.current = { x: 0, y: 0 } }

  if (!image) return null

  const pct = Math.round(scale * 100)

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(8px)' }}
      onClick={close}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-all text-lg font-bold"
        >−</button>
        <span
          className="font-cyber text-sm text-white/60 w-14 text-center cursor-pointer hover:text-white transition-colors"
          onClick={onDoubleClick}
          title="Reset zoom"
        >{pct}%</span>
        <button
          onClick={() => setScale(s => Math.min(5, s + 0.25))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-all text-lg font-bold"
        >+</button>
      </div>

      {/* Close */}
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-all text-xl z-10"
        onClick={close}
      >×</button>

      {/* Image */}
      <img
        src={image.src}
        alt={image.alt}
        draggable={false}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
        onClick={e => e.stopPropagation()}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: dragging.current ? 'none' : 'transform 0.1s ease',
          cursor: scale > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'zoom-in',
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: '12px',
          boxShadow: '0 0 60px rgba(0,255,136,0.15)',
          userSelect: 'none',
        }}
      />

      {/* Caption */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        {image.alt && <p className="text-white/60 text-sm">{image.alt}</p>}
        <p className="text-white/25 text-xs">Scroll to zoom · Drag to pan · Double-click to reset · ESC to close</p>
      </div>
    </div>
  )
}
