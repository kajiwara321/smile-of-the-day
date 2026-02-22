'use client'

import type { SmilePhoto } from './Globe'

type Props = {
  photo: SmilePhoto
  onClose: () => void
}

export default function PhotoPopup({ photo, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e',
          borderRadius: 16,
          padding: '24px',
          maxWidth: 420,
          width: '90%',
          color: 'white',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 22,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          aria-label="閉じる"
        >
          ×
        </button>

        <img
          src={photo.url_medium}
          alt="Smile photo"
          style={{
            width: '100%',
            borderRadius: 10,
            display: 'block',
            marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 32 }}>😊</span>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>
              {(photo.emotion_happy_prob * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>happiness score</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#ccc', marginBottom: 6 }}>
          📍 {photo.lat.toFixed(4)}, {photo.lon.toFixed(4)}
        </div>
        <div style={{ fontSize: 13, color: '#ccc', marginBottom: 16 }}>
          📅 {photo.taken_date}
        </div>

        <a
          href={photo.photo_page_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            background: '#0063dc',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Flickrで見る →
        </a>
      </div>
    </div>
  )
}
