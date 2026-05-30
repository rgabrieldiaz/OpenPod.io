'use client'

import { useBalance } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { useMonadProvider } from '../hooks/useMonadProvider'
import { CountdownTimer } from '../components/CountdownTimer'
import { MediaCard } from '../components/MediaCard'
import { RacingTrackDashboard } from '../components/RacingTrackDashboard'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  
  // Custom hook managing Mozi Wallet and Monad Testnet connections
  const {
    address,
    isConnected,
    isConnecting,
    connectError,
    isWrongNetwork,
    chain,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    voteInCompetition,
    readCompetitionEndTime,
    isVoting,
  } = useMonadProvider()

  const [faucetLoading, setFaucetLoading] = useState(false)
  const [faucetResult, setFaucetResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  
  // Voting status tracker
  const [voteResult, setVoteResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)

  // Fetch balance for connected account
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
  })

  // Read competition endTime dynamically using our custom hook helper
  const competitionId = 1n
  const { endTime: compEndTime } = readCompetitionEndTime(competitionId)

  // Mock candidates / projects matching OpenPodio.t.sol test addresses
  const projects = [
    {
      title: 'Neon Horizons',
      author: 'Pixel Forge Studios',
      description: 'A cyberpunk short film depicting the struggle of digital identities in the parallel consensus grid.',
      type: 'video' as const,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      candidateAddress: '0x4444444444444444444444444444444444444444' as `0x${string}`,
    },
    {
      title: 'Parallel Pulse',
      author: 'EVM Orchestra',
      description: 'An electronic synthwave musical composition inspired by the asynchronous speed of parallel transactions.',
      type: 'audio' as const,
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      candidateAddress: '0x5555555555555555555555555555555555555555' as `0x${string}`,
    },
    {
      title: 'Monad Scaling Engine',
      author: 'Devnads Core Team',
      description: 'A technical pitch walkthrough explaining the optimization of parallel state databases and cryptographic execution lanes.',
      type: 'video' as const,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      candidateAddress: '0x6666666666666666666666666666666666666666' as `0x${string}`,
    },
  ]

  // Prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRequestFaucet = async () => {
    if (!address) return
    setFaucetLoading(true)
    setFaucetResult(null)
    try {
      const response = await fetch('https://agents.devnads.com/v1/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId: 10143,
          address: address,
        }),
      })

      const data = await response.json()
      if (response.ok && data.txHash) {
        setFaucetResult({
          success: true,
          message: `Successfully requested 1 MONAD!`,
          txHash: data.txHash,
        })
        // Refetch balance after short delay
        setTimeout(() => refetchBalance(), 3000)
      } else {
        setFaucetResult({
          success: false,
          message: data.message || 'Faucet request failed. You might be rate-limited or the faucet may be dry.',
        })
      }
    } catch (err: any) {
      setFaucetResult({
        success: false,
        message: err.message || 'An error occurred while connecting to the faucet API.',
      })
    } finally {
      setFaucetLoading(false)
    }
  }

  const handleVote = async (candidate: `0x${string}`, title: string) => {
    setVoteResult(null)
    try {
      const hash = await voteInCompetition(competitionId, candidate)
      setVoteResult({
        success: true,
        message: `Voted successfully for ${title}!`,
        txHash: hash,
      })
      // Refetch balance
      setTimeout(() => refetchBalance(), 2000)
    } catch (err: any) {
      setVoteResult({
        success: false,
        message: err.shortMessage || err.message || 'Transaction rejected or failed.',
      })
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Loading OpenPod...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-100 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background blobs */}
      <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-purple-900/5 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-[30%] -right-[10%] h-[70%] w-[70%] rounded-full bg-violet-800/5 blur-[130px] pointer-events-none" />

      {/* Main Layout Container */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:py-12 flex flex-col min-h-screen justify-between gap-12">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="font-black text-white text-lg">O</span>
              <div className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OpenPodio</span>
              <span className="ml-2 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">Web3 Prediction Hub</span>
            </div>
          </div>

          <div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mozi Connected</p>
                  <p className="text-sm font-semibold text-slate-200 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-medium border border-slate-700 transition duration-200 active:scale-95"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="relative group overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition duration-200 hover:shadow-purple-500/40 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {isConnecting ? 'Connecting...' : 'Connect Mozi Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Top Network Warning */}
        {isWrongNetwork && (
          <div className="rounded-2xl bg-rose-500/5 border border-rose-500/25 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-300">Unsupported Network Detected</h4>
                <p className="text-xs text-rose-400/80">Your wallet is connected to a different network. Switch to Monad Testnet to predict results.</p>
              </div>
            </div>
            <button
              onClick={switchNetwork}
              className="w-full md:w-auto rounded-lg bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition duration-200 active:scale-95 whitespace-nowrap shadow-lg shadow-rose-500/20"
            >
              Switch to Monad Testnet
            </button>
          </div>
        )}

        {/* Dashboard Sections */}
        <div className="space-y-10">
          
          {/* Top Panel: Racing Track Activity HUD */}
          <section>
            <RacingTrackDashboard />
          </section>

          {/* Middle Row: Title, Subtitle, and High-Priority Countdown Timer */}
          <section className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                Active Podcast Competition
              </h2>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Review the simulated participant projects below. Vote for your favorite to deposit the 0.1 MONAD racing fee and enter the 80/20 reward pool split!
              </p>
            </div>

            {/* Countdown timer with sub-second ticking visual */}
            <div className="flex-shrink-0">
              <CountdownTimer endTime={compEndTime || 1779999999n} />
            </div>
          </section>

          {/* Grid Panel: Participating Projects Media Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-bold text-white tracking-wide uppercase font-mono">
                // Competitor Submissions
              </h3>
              {voteResult && (
                <div className={`text-xs px-3 py-1 rounded border ${
                  voteResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {voteResult.message}
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {projects.map((project, i) => (
                <MediaCard
                  key={i}
                  title={project.title}
                  author={project.author}
                  description={project.description}
                  type={project.type}
                  src={project.src}
                  candidateAddress={project.candidateAddress}
                  onVote={handleVote}
                  isVoting={isVoting}
                  isConnected={isConnected}
                  isWrongNetwork={isWrongNetwork}
                />
              ))}
            </div>
          </section>

          {/* Faucet Support Area */}
          {isConnected && !isWrongNetwork && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-md font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Monad Testnet Faucet Portal
                </h4>
                <p className="text-xs text-slate-400 max-w-xl">
                  Need testnet MONAD tokens to vote or test transaction speeds? Request funds immediately via the devnads faucet hook.
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="text-center sm:text-right pr-4 border-slate-800 sm:border-r">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Your Balance</p>
                  <p className="text-md font-bold text-slate-200 font-mono">
                    {balanceData ? `${Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}` : 'Loading...'}
                  </p>
                </div>

                <button
                  onClick={handleRequestFaucet}
                  disabled={faucetLoading}
                  className="rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 px-5 py-3 text-xs font-bold text-purple-400 transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {faucetLoading ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                      <span>Requesting 1 MONAD...</span>
                    </>
                  ) : (
                    <span>Request 1 MONAD</span>
                  )}
                </button>
              </div>

              {faucetResult && (
                <div className="w-full md:w-auto">
                  <div className={`p-3 rounded-lg text-xs border ${
                    faucetResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <p className="font-semibold">{faucetResult.message}</p>
                    {faucetResult.txHash && (
                      <p className="mt-1 font-mono break-all opacity-85">
                        Faucet Tx: <a 
                          href={`https://testnet.monadscan.com/tx/${faucetResult.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-emerald-300"
                        >
                          {faucetResult.txHash.slice(0, 10)}...{faucetResult.txHash.slice(-10)}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/40 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OpenPodio. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Docs</a>
            <a href="https://faucet.monad.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Official Faucet</a>
            <a href="https://testnet.monadvision.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">MonadVision</a>
          </div>
        </footer>

      </main>
    </div>
  )
}
