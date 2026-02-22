'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { SmilePhoto } from '../components/Globe'
import PhotoPopup from '../components/PhotoPopup'

const Globe = dynamic(() => import('../components/Globe'), { ssr: false })

export default function Home() {
  const [photos, setPhotos] = useState<SmilePhoto[]>([])
  const [selected, setSelected] = useState<SmilePhoto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/smiles.json')
      .then((r) => r.json())
      .then((data: SmilePhoto[]) => {
        setPhotos(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          textAlign: 'center',
          color: 'white',
          pointerEvents: 'none',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
          😊 Smile of the Day
        </h1>
        {!loading && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#aaa' }}>
            {photos.length} smiles around the world — click a pin
          </p>
        )}
        {loading && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#aaa' }}>Loading...</p>
        )}
      </div>

      {!loading && (
        <Globe photos={photos} onSelect={setSelected} />
      )}

      {selected && (
        <PhotoPopup photo={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
