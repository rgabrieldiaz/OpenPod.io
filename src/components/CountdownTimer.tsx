'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  endTime: bigint | number | undefined
}

export function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    minutes: '00',
    seconds: '00',
    ms: '00',
    isEnded: true,
  })

  useEffect(() => {
    if (!endTime || endTime === 0 || endTime === 0n) return

    const endTimeMs = Number(endTime) * 1000

    const updateTimer = () => {
      const diff = endTimeMs - Date.now()

      if (diff <= 0) {
        setTimeLeft({
          minutes: '00',
          seconds: '00',
          ms: '00',
          isEnded: true,
        })
        return
      }

      const totalSeconds = Math.floor(diff / 1000)
      const minutesVal = Math.floor(totalSeconds / 60)
      const secondsVal = totalSeconds % 60
      const msVal = Math.floor((diff % 1000) / 10) // 2-digit milliseconds (00-99)

      setTimeLeft({
        minutes: String(minutesVal).padStart(2, '0'),
        seconds: String(secondsVal).padStart(2, '0'),
        ms: String(msVal).padStart(2, '0'),
        isEnded: false,
      })
    }

    // High frequency interval (every 33ms for smooth millisecond transition)
    const intervalId = setInterval(updateTimer, 33)
    updateTimer() // Initial run

    return () => clearInterval(intervalId)
  }, [endTime])

  return (
    <div className="relative inline-flex items-center justify-center p-0.5 rounded-2xl bg-gradient-to-r from-purple-600/30 via-cyan-500/30 to-purple-600/30 shadow-lg shadow-purple-900/10">
      <div className="px-6 py-4 rounded-[14px] bg-slate-950/90 backdrop-blur-md flex items-center gap-4">
        {/* Glow behind timer */}
        <div className="absolute inset-0 rounded-2xl bg-purple-500/5 blur-xl pointer-events-none" />

        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            Tiempo Restante
          </span>
          
          <div className="flex items-baseline font-mono text-3xl sm:text-4xl font-extrabold mt-1">
            <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
              {timeLeft.minutes}
            </span>
            <span className="text-purple-500/80 mx-1 animate-pulse">:</span>
            
            <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
              {timeLeft.seconds}
            </span>
            <span className="text-purple-500/80 mx-1 animate-pulse">:</span>
            
            <span className="text-cyan-400 font-medium text-2xl sm:text-3xl w-[2.2ch] inline-block">
              {timeLeft.ms}
            </span>
          </div>
        </div>

        {/* Pulsing indicator */}
        <div className="flex items-center gap-1.5 self-end pb-2 pl-2 border-l border-slate-800/80">
          <span className={`h-2 w-2 rounded-full ${timeLeft.isEnded ? 'bg-rose-500' : 'bg-cyan-500 animate-ping'} duration-1000`} />
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
            {timeLeft.isEnded ? 'FINALIZADO' : 'EN VIVO'}
          </span>
        </div>
      </div>
    </div>
  )
}
