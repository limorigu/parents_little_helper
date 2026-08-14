import { useRef, useState } from 'react'

interface RepositionControlProps {
  mediaUrl: string
  mediaType: 'photo' | 'video'
  focalX: number
  focalY: number
  onChange: (focalX: number, focalY: number) => void
  heightClassName?: string
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * "Grab the photo and slide it" reposition UI — shown wherever a photo/video
 * is cropped to a fixed frame with `object-cover`. Dragging inside the frame
 * pans the focal point (persisted as `focalX`/`focalY`, 0-100%) so whichever
 * part of the image matters most stays visible everywhere that photo is
 * displayed, not just in this preview.
 */
export function RepositionControl({
  mediaUrl,
  mediaType,
  focalX,
  focalY,
  onChange,
  heightClassName = 'h-64',
}: RepositionControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; focalX: number; focalY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, focalX, focalY }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const rect = containerRef.current?.getBoundingClientRect()
    if (!drag || !rect) return
    // Dragging the photo left/up should reveal more of its right/bottom —
    // i.e. the visible-window anchor (object-position) moves the opposite
    // way from the drag, same as panning a larger image inside a viewport.
    const nextX = clamp(drag.focalX - ((e.clientX - drag.startX) / rect.width) * 100, 0, 100)
    const nextY = clamp(drag.focalY - ((e.clientY - drag.startY) / rect.height) * 100, 0, 100)
    onChange(Math.round(nextX), Math.round(nextY))
  }

  function endDrag() {
    dragRef.current = null
    setDragging(false)
  }

  const isCentered = focalX === 50 && focalY === 50

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        style={{ touchAction: 'none' }}
        className={`relative w-full ${heightClassName} rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none`}
      >
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            muted
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Drag to reposition"
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 px-3 py-2 pointer-events-none">
          {/* bg-black/50 + text-white is an overlay on top of the user's own photo, not
              a themed surface, so it's intentionally exempt from the palette-token rule. */}
          <p className="inline-block bg-black/50 text-white text-[11px] font-medium rounded-md px-1.5 py-0.5">
            {dragging ? 'Repositioning…' : 'Drag to reposition'}
          </p>
        </div>
      </div>
      {!isCentered && (
        <button
          type="button"
          onClick={() => onChange(50, 50)}
          className="text-xs text-stone-400 hover:text-stone-600 underline"
        >
          Reset to center
        </button>
      )}
    </div>
  )
}
