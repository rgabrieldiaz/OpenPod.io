'use client'

import { useState, useEffect } from 'react'

export function RacingTrackDashboard() {
  // Simulate progress percentages of 3 parallel Monad execution threads (0-100)
  const [pipelineState, setPipelineState] = useState([
    { name: 'Queue Alpha (Parallel Executor)', progress: 45, tps: 9820, status: 'EXECUTING', color: 'from-purple-600 to-indigo-400' },
    { name: 'Queue Beta (MonadDB State Storage)', progress: 62, tps: 9940, status: 'COMMITTING', color: 'from-fuchsia-600 to-pink-400' },
    { name: 'Queue Gamma (BFT Consensus proposer)', progress: 38, tps: 9780, status: 'PROPOSING', color: 'from-cyan-500 to-teal-400' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setPipelineState((prev) =>
        prev.map((pipeline) => {
          // Fluctuates progress dynamically
          const delta = Math.floor(Math.random() * 21) - 10 // -10% to +10%
          let nextProgress = pipeline.progress + delta
          if (nextProgress < 10) nextProgress = 20
          if (nextProgress > 95) nextProgress = 80

          // Fluctuates TPS near Monad's 10,000 TPS limit
          const tpsDelta = Math.floor(Math.random() * 101) - 50 // -50 to +50
          let nextTps = pipeline.tps + tpsDelta
          if (nextTps > 10000) nextTps = 9990
          if (nextTps < 9500) nextTps = 9600

          return {
            ...pipeline,
            progress: nextProgress,
            tps: nextTps,
          }
        })
      )
    }, 1200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-xl p-6 shadow-2xl space-y-6">
      
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-md font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Monad Parallel Execution Engine HUD
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Real-time pipeline throughput metrics (Blind Voting state protected by cryptographical mapping)
          </p>
        </div>
        
        {/* System Metric Summary */}
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Network Speed</p>
            <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">~10,000 TPS</p>
          </div>
          <div className="text-right pl-4 border-l border-slate-800">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Consensus Finality</p>
            <p className="text-xs font-mono font-bold text-purple-400 mt-0.5">Sub-Second</p>
          </div>
        </div>
      </div>

      {/* Parallel Racing Tracks */}
      <div className="space-y-5">
        {pipelineState.map((pipeline, index) => (
          <div key={index} className="grid grid-cols-12 items-center gap-4">
            
            {/* Lane Metadata */}
            <div className="col-span-12 sm:col-span-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono tracking-tight">
                  {pipeline.name}
                </span>
                <span className="sm:hidden text-[10px] font-mono font-bold text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded">
                  {pipeline.tps} TPS
                </span>
              </div>
              <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-purple-500 animate-pulse" />
                Status: <span className="font-bold text-slate-400">{pipeline.status}</span>
              </p>
            </div>

            {/* Lane Visual Track */}
            <div className="col-span-10 sm:col-span-6 relative">
              {/* Outer Track Bar */}
              <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-900 overflow-hidden relative">
                {/* Glowing runner bar */}
                <div
                  className={`h-full bg-gradient-to-r ${pipeline.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${pipeline.progress}%` }}
                />
              </div>

              {/* Glowing dot moving along progress */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all duration-1000 ease-out pointer-events-none"
                style={{ left: `calc(${pipeline.progress}% - 7px)` }}
              />
            </div>

            {/* Lane Metric */}
            <div className="hidden sm:block col-span-2 text-right">
              <span className="text-xs font-mono font-black text-cyan-400 bg-slate-950/80 border border-slate-900/50 px-2.5 py-1 rounded-lg">
                {pipeline.tps} TPS
              </span>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}
