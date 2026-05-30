'use client'

import { useState, useRef } from 'react'

interface MediaCardProps {
  title: string
  author: string
  description: string
  src: string
  candidateAddress: `0x${string}`
  onVote: (candidate: `0x${string}`, name: string) => Promise<void>
  isVoting: boolean
  isConnected: boolean
  isWrongNetwork: boolean
  odds?: string
  highlightOdds?: boolean
  status?: 'upcoming' | 'active' | 'ended'
}

function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?theme=dark&color=white`;
  }
  return null;
}

function detectMediaType(url: string): 'youtube' | 'video' | 'audio' | 'image' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.match(/\.(mp4|mov|webm)($|\?)/)) {
    return 'video';
  }
  if (lowerUrl.match(/\.(mp3|wav|ogg|m4a)($|\?)/)) {
    return 'audio';
  }
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/)) {
    return 'image';
  }
  // Fallbacks based on typical content
  if (lowerUrl.startsWith('data:image/') || lowerUrl.includes('images/')) {
    return 'image';
  }
  return 'unknown';
}

export function MediaCard({
  title,
  author,
  description,
  src,
  candidateAddress,
  onVote,
  isVoting,
  isConnected,
  isWrongNetwork,
  odds,
  highlightOdds,
  status = 'active',
}: MediaCardProps) {
  const mediaType = detectMediaType(src);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 shadow-2xl flex flex-col justify-between h-full group hover:border-purple-500/20 transition-all duration-300">
      
      {/* Decorative neon corner glow on hover */}
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-purple-500/0 group-hover:bg-purple-500/10 blur-xl transition-all duration-300 pointer-events-none" />

      <div className="space-y-4">
        {/* Media Embed Area */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800/80">
          {mediaType === 'youtube' && (() => {
            const embedUrl = getYouTubeEmbedUrl(src);
            return embedUrl ? (
              <iframe
                src={embedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full rounded-lg border-0"
              />
            ) : (
              <div className="text-xs text-rose-400 p-4">URL de YouTube Inválida</div>
            );
          })()}

          {mediaType === 'video' && (
            <video
              src={src}
              className="w-full h-full object-cover rounded-lg"
              controls
            />
          )}

          {mediaType === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900">
              {/* Visual Audio Cover */}
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-[#836EFD] to-cyan-500 flex items-center justify-center shadow-lg animate-[spin_8s_linear_infinite] mb-3">
                <div className="h-6 w-6 rounded-full bg-slate-950 border-2 border-white/20" />
              </div>
              
              <audio
                src={src}
                className="w-full max-w-[220px] h-8 opacity-80 hover:opacity-100 transition-opacity"
                controls
              />
              
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                Reproductor de Audio
              </span>
            </div>
          )}

          {mediaType === 'image' && (
            <div className="relative w-full h-full overflow-hidden group/image">
              <img
                src={src}
                alt={title}
                className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-semibold text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                  Vista Ampliada
                </span>
              </div>
            </div>
          )}

          {mediaType === 'unknown' && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-xs font-mono break-all px-4">{src}</p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-[10px] text-[#836EFD] underline font-bold"
              >
                Abrir enlace externo
              </a>
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-purple-400 transition-colors duration-200 line-clamp-1">
              {title}
            </h3>
            <span className="rounded-full bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase">
              {mediaType === 'youtube' ? 'YouTube' : mediaType}
            </span>
          </div>
          <p className="text-xs text-purple-400/90 font-medium">Por {author}</p>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Vote / Prediction Interaction Panel */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Creador del Proyecto</span>
          <span className="font-bold">{candidateAddress.slice(0, 6)}...{candidateAddress.slice(-4)}</span>
        </div>

        {odds && (
          <div className={`w-full py-1.5 px-3 rounded-lg text-center text-[11px] font-black font-mono border ${
            highlightOdds
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {odds} {highlightOdds && '🔥 Underdog'}
          </div>
        )}

        {status === 'active' ? (
          <button
            onClick={() => onVote(candidateAddress, title)}
            disabled={isVoting}
            className="w-full relative overflow-hidden rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25 hover:shadow-[#836EFD]/40 border border-[#836EFD]/40"
          >
            {isVoting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Confirmando en Monad...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Predecir y Votar (0.1 MONAD)</span>
              </>
            )}
          </button>
        ) : status === 'upcoming' ? (
          <div className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-900 text-center text-xs font-bold text-slate-400 font-mono">
            ⌛ ESPERANDO INICIO DE VOTACIÓN
          </div>
        ) : (
          <div className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-900 text-center text-xs font-bold text-slate-500 font-mono">
            🔒 VOTACIÓN COMPLETADA
          </div>
        )}
      </div>

    </div>
  )
}
