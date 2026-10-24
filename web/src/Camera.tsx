import { useEffect, useRef, useState } from 'react'

// getUserMedia needs a secure context (https or localhost). Elsewhere we fall back to the
// file input with `capture`, which opens the camera app on phones.
export const hasLiveCamera = () => !!navigator.mediaDevices?.getUserMedia

type Facing = 'user' | 'environment'

export function Camera({ onShot, onClose }: { onShot: (photo: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    setReady(false)
    setError('')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const v = videoRef.current
        if (!v) return
        v.srcObject = s
        return v.play().then(() => setReady(true))
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(
          e.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow it in your browser settings and try again.'
            : e.name === 'NotFoundError'
              ? 'No camera found on this device.'
              : `Could not open the camera: ${e.message}`
        )
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const snap = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    // Save what the user sees: the front camera preview is mirrored.
    if (facing === 'user') {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    c.toBlob((b) => b && onShot(b), 'image/jpeg', 0.9)
  }

  return (
    <div className="camera" onClick={onClose}>
      <div className="camera-box" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <p className="camera-error">{error}</p>
        ) : (
          <video ref={videoRef} className={facing === 'user' ? 'mirror' : ''} playsInline muted />
        )}
        <div className="camera-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={snap} disabled={!ready}>
            Snap
          </button>
          <button onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} title="Switch camera">
            Flip
          </button>
        </div>
      </div>
    </div>
  )
}
