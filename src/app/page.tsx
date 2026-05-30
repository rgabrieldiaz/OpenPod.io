'use client'

import { useBalance } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { useMonadProvider } from '../hooks/useMonadProvider'
import { CountdownTimer } from '../components/CountdownTimer'
import { MediaCard } from '../components/MediaCard'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [customEndTime, setCustomEndTime] = useState<number | undefined>(undefined)
  
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
    resolveCompetition,
    claimRewards,
    useCompetitionDetails,
    useUserVoteSelection,
    useHasClaimedReward,
    isVoting,
  } = useMonadProvider()

  // On-chain competition ID
  const competitionId = 1n

  // Fetch real-time on-chain competition state if available
  const { details: compDetails, refetch: refetchCompDetails } = useCompetitionDetails(competitionId)
  const { voterSelection, refetch: refetchVoteSelection } = useUserVoteSelection(competitionId, address)
  const { hasClaimed, refetch: refetchClaimed } = useHasClaimedReward(competitionId, address)

  const totalPoolNumber = compDetails ? Number(formatUnits(compDetails.totalPool, 18)) : 1420.5

  const [faucetLoading, setFaucetLoading] = useState(false)
  const [faucetResult, setFaucetResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  
  // Voting status tracker
  const [voteResult, setVoteResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [resolveResult, setResolveResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  // Real-time lifecycle states
  const [isExpired, setIsExpired] = useState(false)
  const [txCount, setTxCount] = useState(248)

  // Fetch balance for connected account
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
  })

  // Mock candidates / projects matching OpenPodio.t.sol test addresses with Prediction Market odds
  const projects = [
    {
      title: 'Neon Horizons',
      author: 'Pixel Forge Studios',
      description: 'Un cortometraje cyberpunk que retrata la lucha de las identidades digitales en la red de consenso paralelo.',
      type: 'video' as const,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      candidateAddress: '0x4444444444444444444444444444444444444444' as `0x${string}`,
      odds: 'Multiplicador: 2.1x',
      highlightOdds: false,
    },
    {
      title: 'Parallel Pulse',
      author: 'EVM Orchestra',
      description: 'Una composición de música synthwave electrónica inspirada en la velocidad asíncrona de las transacciones paralelas.',
      type: 'audio' as const,
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      candidateAddress: '0x5555555555555555555555555555555555555555' as `0x${string}`,
      odds: 'Multiplicador: 5.4x',
      highlightOdds: true, // Marcado como Underdog con mayor pago
    },
    {
      title: 'Monad Scaling Engine',
      author: 'Devnads Core Team',
      description: 'Una presentación técnica explicativa sobre la optimización de las bases de datos de estado paralelo y los carriles de ejecución criptográfica.',
      type: 'video' as const,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      candidateAddress: '0x6666666666666666666666666666666666666666' as `0x${string}`,
      odds: 'Multiplicador: 1.5x',
      highlightOdds: false,
    },
  ]

  // Setup mount initialization
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync customEndTime from contract or fallback timer
  useEffect(() => {
    if (!mounted) return
    if (compDetails && compDetails.endTime > 0n) {
      setCustomEndTime(Number(compDetails.endTime))
    } else {
      // Setup active state: current time + 4 minutes and 32 seconds fallback
      setCustomEndTime(Math.floor(Date.now() / 1000) + 4 * 60 + 32)
    }
  }, [mounted, compDetails])

  // Timer status loop
  useEffect(() => {
    if (!customEndTime) return
    const checkExpiry = () => {
      const now = Math.floor(Date.now() / 1000)
      if (now >= customEndTime) {
        setIsExpired(true)
      } else {
        setIsExpired(false)
      }
    }
    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [customEndTime])

  // Increments simulated txCount count dynamically when active (Durante)
  useEffect(() => {
    if (isExpired) return
    const interval = setInterval(() => {
      setTxCount((prev) => prev + Math.floor(Math.random() * 3) + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [isExpired])

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
          message: `¡Se ha solicitado con éxito 1 MONAD!`,
          txHash: data.txHash,
        })
        // Refetch balance after short delay
        setTimeout(() => refetchBalance(), 3000)
      } else {
        setFaucetResult({
          success: false,
          message: data.message || 'La solicitud al faucet falló. Es posible que tengas un límite de frecuencia activo o que el faucet no tenga fondos.',
        })
      }
    } catch (err: any) {
      setFaucetResult({
        success: false,
        message: err.message || 'Ocurrió un error al conectar con la API del faucet.',
      })
    } finally {
      setFaucetLoading(false)
    }
  }

  const handleVote = async (candidate: `0x${string}`, title: string) => {
    // If not connected, trigger wallet connection seamlessly
    if (!isConnected) {
      connectWallet()
      return
    }
    // If on wrong network, trigger network switch automatically
    if (isWrongNetwork) {
      switchNetwork()
      return
    }

    try {
      const hash = await voteInCompetition(competitionId, candidate)
      setVoteResult({
        success: true,
        message: `¡Votado con éxito por ${title}!`,
        txHash: hash,
      })
      // Refetch balance and competition details after a successful vote
      setTimeout(() => {
        refetchBalance()
        refetchCompDetails()
        refetchVoteSelection()
      }, 2000)
    } catch (err: any) {
      setVoteResult({
        success: false,
        message: err.shortMessage || err.message || 'Transacción rechazada o fallida.',
      })
    }
  }

  const handleResolve = async () => {
    setResolveResult(null)
    setIsResolving(true)
    try {
      const hash = await resolveCompetition(competitionId)
      setResolveResult({
        success: true,
        message: '¡Competencia resuelta con éxito en Monad!',
        txHash: hash,
      })
      setTimeout(() => {
        refetchCompDetails()
      }, 2000)
    } catch (err: any) {
      setResolveResult({
        success: false,
        message: err.shortMessage || err.message || 'Error al resolver la competencia.',
      })
    } finally {
      setIsResolving(false)
    }
  }

  const handleClaimRewards = async () => {
    setClaimResult(null)
    setIsClaiming(true)
    try {
      const hash = await claimRewards(competitionId)
      setClaimResult({
        success: true,
        message: '¡Recompensa reclamada con éxito!',
        txHash: hash,
      })
      setTimeout(() => {
        refetchBalance()
        refetchClaimed()
      }, 2000)
    } catch (err: any) {
      setClaimResult({
        success: false,
        message: err.shortMessage || err.message || 'Error al reclamar la recompensa.',
      })
    } finally {
      setIsClaiming(false)
    }
  }

  const getWinnerName = () => {
    if (!compDetails || !compDetails.resolved) return 'Pendiente de Resolución'
    const winnerAddr = compDetails.winner.toLowerCase()
    if (winnerAddr === '0x4444444444444444444444444444444444444444') return 'Neon Horizons'
    if (winnerAddr === '0x5555555555555555555555555555555555555555') return 'Parallel Pulse'
    if (winnerAddr === '0x6666666666666666666666666666666666666666') return 'Monad Scaling Engine'
    return `${compDetails.winner.slice(0, 6)}...${compDetails.winner.slice(-4)}`
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Cargando OpenPod.io...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-100 selection:bg-[#836EFD]/30 selection:text-purple-200">
      {/* Background blobs */}
      <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-purple-900/5 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-[30%] -right-[10%] h-[70%] w-[70%] rounded-full bg-violet-800/5 blur-[130px] pointer-events-none" />

      {/* Main Layout Container */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:py-12 flex flex-col min-h-screen justify-between gap-10">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-[#836EFD] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#836EFD]/20">
              <span className="font-black text-white text-lg">O</span>
              <div className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OpenPod.io</span>
              <span className="ml-2 rounded-full bg-[#836EFD]/10 px-2.5 py-0.5 text-xs font-semibold text-[#836EFD] border border-[#836EFD]/20">Plataforma de Predicciones Web3</span>
            </div>
          </div>

          <div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mozi Conectado</p>
                  <p className="text-sm font-semibold text-slate-200 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-medium border border-slate-700 transition duration-200 active:scale-95"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="relative group overflow-hidden rounded-lg bg-gradient-to-r from-[#836EFD] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#836EFD]/25 transition duration-200 hover:shadow-[#836EFD]/40 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {isConnecting ? 'Conectando...' : 'Conectar Billetera Mozi'}
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
                <h4 className="text-sm font-bold text-rose-300">Red no soportada detectada</h4>
                <p className="text-xs text-rose-400/80">Tu billetera está conectada a una red diferente. Cambia a Monad Testnet para predecir los resultados.</p>
              </div>
            </div>
            <button
              onClick={switchNetwork}
              className="w-full md:w-auto rounded-lg bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition duration-200 active:scale-95 whitespace-nowrap shadow-lg shadow-rose-500/20"
            >
              Cambiar a Monad Testnet
            </button>
          </div>
        )}

        {/* Dashboard Sections */}
        <div className="space-y-12">
          
          {/* Active Competition Header with Countdown Timer (00:04:32 active state) and Total Pool */}
          <section className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />
            
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                Competencia de Podcast Activa
              </h2>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Revisa los proyectos de los participantes simulados a continuación. ¡Vota por tu favorito para depositar la tarifa de entrada de 0.1 MONAD y participar en la distribución del pozo (80/20)!
              </p>
            </div>

            {/* Countdown timer & Total Pool wrapper */}
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 flex-shrink-0">
              {/* Highlighted Total Pool display in Violeta Eléctrico */}
              <div className="text-center sm:text-left sm:border-r border-slate-800 sm:pr-8 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Pozo Total</p>
                <p className="text-xl sm:text-2xl font-black text-[#836EFD] font-mono leading-none tracking-tight">
                  {totalPoolNumber.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD
                </p>
              </div>

              {/* Ticking millisecond timer */}
              <div className="flex-shrink-0">
                <CountdownTimer endTime={customEndTime} />
              </div>
            </div>
          </section>

          {/* Grid Panel: Participating Projects Media Cards */}
          <section className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
              <h3 className="text-lg font-bold text-white tracking-wide uppercase font-mono text-sm sm:text-base">
                // Proyectos Competidores
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
                  odds={project.odds}
                  highlightOdds={project.highlightOdds}
                  isExpired={isExpired}
                />
              ))}
            </div>
          </section>

          {/* OpenPod.io Reveal Section: Locked blind vote podiums */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/20 p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
              <div className="text-center md:text-left space-y-1.5">
                <h3 className="text-md font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 justify-center md:justify-start">
                  {!isExpired ? (
                    <svg className="w-4 h-4 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                  HUD de Revelación de OpenPod.io
                </h3>
                <p className="text-xs text-slate-400">
                  {!isExpired 
                    ? "Podio protegido por Voto Ciego. Se calculará on-chain al llegar a 00:00:00" 
                    : "Concurso finalizado. Revelando los resultados finales on-chain."}
                </p>
              </div>

              {/* Status Alert feedback */}
              {(resolveResult || claimResult) && (
                <div className={`text-xs px-3 py-1.5 rounded border ${
                  (resolveResult?.success || claimResult?.success)
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {resolveResult?.message || claimResult?.message}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  rank: '1° Puesto (Ganador)',
                  locked: `[ ? ] RECOMPENSA ESTIMADA: ${(totalPoolNumber * 0.8).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD (80% para el Creador)`,
                  revealed: compDetails?.resolved
                    ? `🏆 GANADOR: ${getWinnerName()} (${(totalPoolNumber * 0.8).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD)`
                    : `⌛ ESPERANDO RESOLUCIÓN... (Recompensa: ${(totalPoolNumber * 0.8).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD)`,
                  subtext: 'Premio directo al Creador del Proyecto'
                },
                {
                  rank: '2° Puesto',
                  locked: `DISTRIBUCIÓN DEL POZO: ${(totalPoolNumber * 0.2).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD (20% para Votantes Ganadores)`,
                  revealed: compDetails?.resolved
                    ? `🔥 REPARTO DEL POZO: ${(totalPoolNumber * 0.2).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD entre votantes`
                    : `⌛ ESPERANDO RESOLUCIÓN... (Pozo Votantes: ${(totalPoolNumber * 0.2).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD)`,
                  subtext: 'Reclamable por votantes que acertaron la predicción'
                },
                {
                  rank: '3° Puesto',
                  locked: `DISTRIBUCIÓN DEL POZO: ${(totalPoolNumber * 0.2).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MONAD (20% para Votantes Ganadores)`,
                  revealed: compDetails?.resolved
                    ? `✨ POZO RECLAMABLE: Reparto de recompensas Web3`
                    : `⌛ ESPERANDO RESOLUCIÓN...`,
                  subtext: 'Distribución del pozo de predicciones'
                }
              ].map((pod, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl bg-slate-950/60 border border-slate-900 p-5 flex items-center justify-between group relative overflow-hidden h-[105px]"
                >
                  <div className="space-y-1 z-10 w-[75%]">
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase">{pod.rank}</p>
                    <div className="relative h-10 w-full">
                      <div className={`absolute inset-0 transition-all duration-700 flex items-center ${isExpired ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-300 tracking-tight leading-snug">
                          {pod.locked}
                        </p>
                      </div>
                      <div className={`absolute inset-0 transition-all duration-700 flex items-center ${isExpired ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <p className="text-xs sm:text-sm font-extrabold text-emerald-400 tracking-tight leading-snug">
                          {pod.revealed}
                        </p>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{pod.subtext}</p>
                  </div>
                  
                  {/* Lock icon with active ping pulse or unlock check animation */}
                  <div className="relative h-10 w-10 shrink-0 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center z-10 ml-3 transition-all duration-500">
                    {!isExpired ? (
                      <>
                        <span className="absolute inset-0 rounded-full bg-[#836EFD]/25 animate-ping" />
                        <svg className="w-4 h-4 text-[#836EFD] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
                        <svg className="w-4 h-4 text-emerald-400 relative z-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </>
                    )}
                  </div>
                  
                  {/* Subtle hover effect background */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Resolve and Claim Actions Panel */}
            {isExpired && isConnected && (
              <div className="mt-6 pt-6 border-t border-slate-800/40 flex flex-col items-center justify-between gap-4 sm:flex-row bg-slate-950/40 p-5 rounded-2xl border border-slate-900/60 animate-fadeIn">
                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Panel de Recompensas de OpenPod.io
                  </h4>
                  <p className="text-xs text-slate-400">
                    {!compDetails?.resolved
                      ? "La votación ha terminado. Ejecuta la resolución on-chain para calcular el ganador y distribuir el pozo."
                      : voterSelection?.toLowerCase() === compDetails.winner.toLowerCase()
                        ? (hasClaimed 
                            ? "¡Felicidades! Has reclamado con éxito tu porción del pozo del 20%."
                            : "¡Felicidades! Tu predicción fue correcta. Reclama tu porción del pozo ahora.")
                        : "El concurso ha sido resuelto. Esta vez tu predicción no resultó ganadora."}
                  </p>
                </div>

                <div className="w-full sm:w-auto flex flex-col gap-3">
                  {/* Resolve Button */}
                  {!compDetails?.resolved && (
                    <button
                      onClick={handleResolve}
                      disabled={isResolving}
                      className="rounded-xl bg-gradient-to-r from-[#836EFD] to-indigo-600 hover:from-[#836EFD]/95 hover:to-indigo-600/95 py-2.5 px-5 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25"
                    >
                      {isResolving ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Resolviendo en Monad...</span>
                        </>
                      ) : (
                        <span>Resolver Concurso On-Chain</span>
                      )}
                    </button>
                  )}

                  {/* Claim Rewards Button */}
                  {compDetails?.resolved && voterSelection?.toLowerCase() === compDetails.winner.toLowerCase() && !hasClaimed && (
                    <button
                      onClick={handleClaimRewards}
                      disabled={isClaiming}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-2.5 px-5 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isClaiming ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Reclamando Ganancias...</span>
                        </>
                      ) : (
                        <span>Reclamar Mis Ganancias (20% Pool Share)</span>
                      )}
                    </button>
                  )}

                  {/* Already Claimed State */}
                  {compDetails?.resolved && voterSelection?.toLowerCase() === compDetails.winner.toLowerCase() && hasClaimed && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Recompensa Reclamada
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Faucet Support Area */}
          {isConnected && !isWrongNetwork && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-md font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#836EFD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Monad Testnet Faucet Portal
                </h4>
                <p className="text-xs text-slate-400 max-w-xl">
                  ¿Necesitas tokens MONAD de prueba para votar o probar la velocidad de las transacciones? Solicita fondos de inmediato a través del portal de faucet.
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="text-center sm:text-right pr-4 border-slate-800 sm:border-r">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tu Saldo</p>
                  <p className="text-md font-bold text-slate-200 font-mono">
                    {balanceData ? `${Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}` : 'Cargando...'}
                  </p>
                </div>

                <button
                  onClick={handleRequestFaucet}
                  disabled={faucetLoading}
                  className="rounded-xl bg-[#836EFD]/10 border border-[#836EFD]/30 hover:bg-[#836EFD]/20 px-5 py-3 text-xs font-bold text-[#836EFD] transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {faucetLoading ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#836EFD] border-t-transparent" />
                      <span>Solicitando 1 MONAD...</span>
                    </>
                  ) : (
                    <span>Solicitar 1 MONAD</span>
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
                        Tx Faucet: <a 
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

          {/* Live Transaction Feed marquee */}
          <section className="rounded-2xl border border-slate-900 bg-slate-950/60 py-3.5 px-6 overflow-hidden relative">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes marquee {
                0% { transform: translateX(50%); }
                100% { transform: translateX(-100%); }
              }
              .animate-marquee {
                animation: marquee 25s linear infinite;
              }
            `}} />

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-[#836EFD] font-black uppercase whitespace-nowrap flex items-center gap-1.5 shrink-0 bg-slate-950 pr-4 z-10 relative">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Feed de Votos en Vivo ({txCount} tx):
              </span>
              <div className="w-full overflow-hidden relative h-5 flex items-center">
                <div className="absolute whitespace-nowrap flex gap-12 animate-marquee text-slate-500 text-[10px] font-bold">
                  <span>0x12a3...votó por Neon Horizons (0.1 MONAD)</span>
                  <span>•</span>
                  <span>0xf43b...votó por Parallel Pulse (0.1 MONAD)</span>
                  <span>•</span>
                  <span>0x99e2...votó por Parallel Pulse (0.1 MONAD)</span>
                  <span>•</span>
                  <span>0x3a5f...votó por Monad Scaling Engine (0.1 MONAD)</span>
                  <span>•</span>
                  <span>0x7e8c...votó por Neon Horizons (0.1 MONAD)</span>
                  <span>•</span>
                  <span>0x6b2d...votó por Parallel Pulse (0.1 MONAD)</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/40 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OpenPod.io. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Documentación</a>
            <a href="https://faucet.monad.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Faucet Oficial</a>
            <a href="https://testnet.monadvision.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">MonadVision</a>
          </div>
        </footer>

      </main>
    </div>
  )
}
