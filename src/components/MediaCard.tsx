'use client'

import { useState, useRef } from 'react'

interface MediaCardProps {
  title: string
  author: string
  description: string
  type: 'video' | 'audio'
  src: string
  candidateAddress: `0x${string}`
  onVote: (candidate: `0x${string}`, name: string) => Promise<void>
  isVoting: boolean
  isConnected: boolean
  isWrongNetwork: boolean
  odds?: string
  highlightOdds?: boolean
}

export function MediaCard({
  title,
  author,
  description,
  type,
  src,
  candidateAddress,
  onVote,
  isVoting,
  isConnected,
  isWrongNetwork,
  odds,
  highlightOdds,
}: MediaCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    const media = type === 'video' ? videoRef.current : audioRef.current
    if (!media) return
    if (isPlaying) {
      media.pause()
      setIsPlaying(false)
    } else {
      media.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 shadow-2xl flex flex-col justify-between h-full group hover:border-purple-500/20 transition-all duration-300">
      
      {/* Decorative neon corner glow on hover */}
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-purple-500/0 group-hover:bg-purple-500/10 blur-xl transition-all duration-300 pointer-events-none" />

      <div className="space-y-4">
        {/* Media Embed Area */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800/80">
          
          {type === 'video' ? (
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-cover"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
              <audio
                ref={audioRef}
                src={src}
                className="hidden"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Pulsing Visualizer Waves */}
              <div className="flex items-end gap-1.5 h-12 mb-4">
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div
                    key={bar}
                    className={`w-1 rounded-full bg-gradient-to-t from-purple-500 to-cyan-400 transition-all ${
                      isPlaying 
                        ? 'animate-[pulse_1s_infinite]' 
                        : 'h-3'
                    }`}
                    style={{
                      animationDelay: isPlaying ? `${bar * 0.15}s` : undefined,
                      height: isPlaying ? undefined : '12px',
                    }}
                  />
                ))}
              </div>

              {/* Play/Pause custom HUD */}
              <button
                onClick={togglePlay}
                className="h-14 w-14 rounded-full bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-600 hover:text-white transition duration-200 shadow-lg active:scale-95 z-10"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3">
                {isPlaying ? 'Playing Audio' : 'Audio Track'}
              </span>
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-purple-400 transition-colors duration-200">
              {title}
            </h3>
            <span className="rounded-full bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {type === 'video' ? 'Video' : 'Audio'}
            </span>
          </div>
          <p className="text-xs text-purple-400/90 font-medium">By {author}</p>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Vote / Prediction Interaction Panel */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Candidate Creator</span>
          <span className="font-bold">{candidateAddress.slice(0, 6)}...{candidateAddress.slice(-4)}</span>
        </div>

        {odds && (
          <div className={`w-full py-1.5 px-3 rounded-lg text-center text-[11px] font-black font-mono border ${
            highlightOdds
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {odds} {highlightOdds && '🔥 UNDERDOG'}
          </div>
        )}

        <button
          onClick={() => onVote(candidateAddress, title)}
          disabled={isVoting}
          className="w-full relative overflow-hidden rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25 hover:shadow-[#836EFD]/40 border border-[#836EFD]/40"
        >
          {isVoting ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Confirming on Monad...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Predict & Vote (0.1 MONAD)</span>
            </>
          )}
        </button>
      </div>

    </div>
  )
}
