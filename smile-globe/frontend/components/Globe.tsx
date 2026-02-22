'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const ReactGlobe = dynamic(() => import('react-globe.gl'), { ssr: false })

export type SmilePhoto = {
  flickr_id: string
  url_medium: string
  photo_page_url: string
  lat: number
  lon: number
  emotion_happy_prob: number
  taken_date: string
}

type Props = {
  photos: SmilePhoto[]
  onSelect: (photo: SmilePhoto) => void
}

export default function Globe({ photos, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactGlobe
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={photos}
        pointLat="lat"
        pointLng="lon"
        pointColor={() => '#FFD700'}
        pointRadius={0.5}
        pointAltitude={0.01}
        pointLabel={(d) => {
          const p = d as SmilePhoto
          return `<div style="background:rgba(0,0,0,0.7);color:white;padding:6px 10px;border-radius:6px;font-size:13px;">
            😊 ${(p.emotion_happy_prob * 100).toFixed(0)}%<br/>
            ${p.taken_date}
          </div>`
        }}
        onPointClick={(point) => onSelect(point as SmilePhoto)}
      />
    </div>
  )
}
