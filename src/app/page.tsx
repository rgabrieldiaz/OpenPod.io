'use client'

import { useBalance, usePublicClient } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { useMonadProvider } from '../hooks/useMonadProvider'
import { CountdownTimer } from '../components/CountdownTimer'
import { MediaCard } from '../components/MediaCard'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [customEndTime, setCustomEndTime] = useState<number | undefined>(undefined)
  const publicClient = usePublicClient()
  
  // Custom hook managing Mozi Wallet and Monad Testnet connections
  const {
    address,
    isConnected,
    isConnecting,
    connectError,
    isWrongNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    createConcurso,
    registerParticipant,
    startVoting,
    voteInCompetition,
    resolveCompetition,
    claimRewards,
    useCompetitionCount,
    useLatestCompetitionId,
    useCompetitionDetails,
    useCandidates,
    useCandidatesMetadata,
    useUserVoteSelection,
    useHasClaimedReward,
    isVoting,
  } = useMonadProvider()

  // Find current/latest competition ID
  const { count: compCount, refetch: refetchCompCount } = useCompetitionCount()
  const { latestId, refetch: refetchLatestId } = useLatestCompetitionId()
  const [selectedCompId, setSelectedCompId] = useState<bigint | null>(null)
  const [searchPin, setSearchPin] = useState('')
  const [showLanding, setShowLanding] = useState(true)

  useEffect(() => {
    if (latestId && selectedCompId === null) {
      setSelectedCompId(latestId)
    }
  }, [latestId, selectedCompId])

  const currentCompId = selectedCompId || latestId || 0n

  const handleLoadPin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchPin) return
    try {
      const pin = BigInt(searchPin)
      if (pin <= 0n) return
      setSelectedCompId(pin)
      setShowLanding(false)
      setSearchPin('')
    } catch {
      // ignore
    }
  }

  // Fetch real-time on-chain competition state if available
  const { details: compDetails, refetch: refetchCompDetails } = useCompetitionDetails(currentCompId)
  const { candidates, refetch: refetchCandidates } = useCandidates(currentCompId)
  const { metadata: candidatesMetadata, refetch: refetchCandidatesMetadata } = useCandidatesMetadata(currentCompId, candidates)
  const { voterSelection, refetch: refetchVoteSelection } = useUserVoteSelection(currentCompId, address)
  const { hasClaimed, refetch: refetchClaimed } = useHasClaimedReward(currentCompId, address)

  // Map dynamic candidates registered on-chain
  const projects = (candidates || []).map((addr, index) => {
    const nameResult = candidatesMetadata?.[index * 3]
    const creatorResult = candidatesMetadata?.[index * 3 + 1]
    const uriResult = candidatesMetadata?.[index * 3 + 2]

    const title = (nameResult?.result as unknown as string) || `Proyecto #${index + 1}`
    const author = (creatorResult?.result as unknown as string) || `Creador ${addr.slice(0, 6)}`
    const src = (uriResult?.result as unknown as string) || ''

    // Assign prediction market odds
    let odds = 'Multiplicador: 2.0x'
    let highlightOdds = false
    if (index === 0) {
      odds = 'Multiplicador: 2.1x'
    } else if (index === 1) {
      odds = 'Multiplicador: 5.4x'
      highlightOdds = true
    } else if (index === 2) {
      odds = 'Multiplicador: 1.5x'
    }

    return {
      title,
      author,
      description: `Un proyecto multimedia innovador registrado on-chain por la wallet ${addr.slice(0, 6)}...${addr.slice(-4)}.`,
      src,
      candidateAddress: addr,
      odds,
      highlightOdds,
    }
  })

  const totalPoolNumber = compDetails ? Number(formatUnits(compDetails.totalPool, 18)) : 0.0
  const doesCompExist = compDetails && compDetails.id > 0n;

  const [faucetLoading, setFaucetLoading] = useState(false)
  const [faucetResult, setFaucetResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  
  // Voting status tracker
  const [voteResult, setVoteResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [resolveResult, setResolveResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  // Form States
  const [concursoTitle, setConcursoTitle] = useState('')
  const [concursoDescription, setConcursoDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)

  const [projectName, setProjectName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [candidateWallet, setCandidateWallet] = useState('')
  const [mediaType, setMediaType] = useState('youtube')
  const [postulateLoading, setPostulateLoading] = useState(false)
  const [postulateResult, setPostulateResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)

  // Default candidate wallet to logged in address
  useEffect(() => {
    if (address) {
      setCandidateWallet(address)
    }
  }, [address])

  const [votingDuration, setVotingDuration] = useState('10') // default 10 mins
  const [startVotingLoading, setStartVotingLoading] = useState(false)
  const [startVotingResult, setStartVotingResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null)

  // Real-time lifecycle states
  const [isExpired, setIsExpired] = useState(false)
  const [txCount, setTxCount] = useState(12)

  // Fetch balance for connected account
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
  })

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
      setCustomEndTime(undefined)
    }
  }, [mounted, compDetails])

  // Timer status loop
  useEffect(() => {
    if (!customEndTime) {
      setIsExpired(false)
      return
    }
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

  // Increments simulated txCount count dynamically when active
  useEffect(() => {
    if (isExpired || (compDetails && compDetails.state !== 1)) return
    const interval = setInterval(() => {
      setTxCount((prev) => prev + Math.floor(Math.random() * 2) + 1)
    }, 4000)
    return () => clearInterval(interval)
  }, [isExpired, compDetails])

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
        setTimeout(() => refetchBalance(), 3000)
      } else {
        setFaucetResult({
          success: false,
          message: data.message || 'La solicitud al faucet falló. Es posible que tengas un límite de frecuencia activo.',
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

  const handleCreateConcurso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!concursoTitle) return
    setCreateLoading(true)
    setCreateResult(null)
    try {
      const hash = await createConcurso(concursoTitle, concursoDescription)
      setCreateResult({
        success: true,
        message: '¡Petición de creación enviada! Esperando confirmación en blockchain...',
        txHash: hash,
      })
      setConcursoTitle('')
      setConcursoDescription('')
      
      // Wait for confirmation on the blockchain
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      
      setCreateResult({
        success: true,
        message: '¡Concurso creado y confirmado con éxito!',
        txHash: hash,
      })

      // Fetch the generated 6-digit PIN from the contract
      const latestResult = await refetchLatestId()
      const newPin = latestResult.data as bigint | undefined
      if (newPin) {
        setSelectedCompId(newPin)
        setShowLanding(false)
        refetchCompDetails()
        refetchCandidates()
      }
      refetchCompCount()
    } catch (err: any) {
      setCreateResult({
        success: false,
        message: err.shortMessage || err.message || 'Error al crear el concurso.',
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handlePostulateContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName || !creatorName || !mediaUrl || !candidateWallet) return
    if (!candidateWallet.startsWith('0x')) {
      setPostulateResult({
        success: false,
        message: 'La dirección de la wallet del competidor debe comenzar con 0x y ser válida.',
      })
      return
    }
    setPostulateLoading(true)
    setPostulateResult(null)
    try {
      const fullMediaUrl = `${mediaType}::${mediaUrl}`
      const hash = await registerParticipant(
        currentCompId,
        candidateWallet as `0x${string}`,
        projectName,
        creatorName,
        fullMediaUrl
      )
      setPostulateResult({
        success: true,
        message: '¡Postulación enviada con éxito! Esperando confirmación...',
        txHash: hash,
      })
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setPostulateResult({
        success: true,
        message: '¡Postulación confirmada con éxito!',
        txHash: hash,
      })
      setProjectName('')
      setCreatorName('')
      setMediaUrl('')
      setCandidateWallet(address || '')
      setMediaType('youtube')
      
      refetchCandidates()
      refetchCandidatesMetadata()
    } catch (err: any) {
      setPostulateResult({
        success: false,
        message: err.shortMessage || err.message || 'Error al postular contenido.',
      })
    } finally {
      setPostulateLoading(false)
    }
  }

  const handleStartVoting = async (e: React.FormEvent) => {
    e.preventDefault()
    const duration = BigInt(votingDuration)
    if (duration <= 0n) return
    setStartVotingLoading(true)
    setStartVotingResult(null)
    try {
      const hash = await startVoting(currentCompId, duration)
      setStartVotingResult({
        success: true,
        message: '¡Periodo de votación iniciado! Esperando confirmación...',
        txHash: hash,
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setStartVotingResult({
        success: true,
        message: '¡Periodo de votación confirmado y activo!',
        txHash: hash,
      })

      refetchCompDetails()
    } catch (err: any) {
      setStartVotingResult({
        success: false,
        message: err.shortMessage || err.message || 'Error al iniciar la votación.',
      })
    } finally {
      setStartVotingLoading(false)
    }
  }

  const handleVote = async (candidate: `0x${string}`, title: string) => {
    if (!isConnected) {
      connectWallet()
      return
    }
    if (isWrongNetwork) {
      switchNetwork()
      return
    }

    try {
      const hash = await voteInCompetition(currentCompId, candidate)
      setVoteResult({
        success: true,
        message: `¡Voto enviado por ${title}! Esperando confirmación...`,
        txHash: hash,
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setVoteResult({
        success: true,
        message: `¡Votado con éxito por ${title}!`,
        txHash: hash,
      })

      refetchBalance()
      refetchCompDetails()
      refetchVoteSelection()
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
      const hash = await resolveCompetition(currentCompId)
      setResolveResult({
        success: true,
        message: '¡Resolución enviada! Esperando confirmación...',
        txHash: hash,
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setResolveResult({
        success: true,
        message: '¡Competencia resuelta con éxito en Monad!',
        txHash: hash,
      })

      refetchCompDetails()
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
      const hash = await claimRewards(currentCompId)
      setClaimResult({
        success: true,
        message: '¡Reclamación enviada! Esperando confirmación...',
        txHash: hash,
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      setClaimResult({
        success: true,
        message: '¡Recompensa reclamada con éxito!',
        txHash: hash,
      })

      refetchBalance()
      refetchClaimed()
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
    const winnerAddr = compDetails.winner.toLowerCase() as `0x${string}`
    const winningProject = projects.find(p => p.candidateAddress.toLowerCase() === winnerAddr)
    if (winningProject) return winningProject.title
    return `${winnerAddr.slice(0, 6)}...${winnerAddr.slice(-4)}`
  }

  const getCompStatus = (): 'upcoming' | 'active' | 'ended' => {
    if (!compDetails) return 'upcoming'
    if (compDetails.state === 0) return 'upcoming'
    if (compDetails.state === 1 && !isExpired) return 'active'
    return 'ended'
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
        <header className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800/40 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLanding(true)}
              className="flex items-center gap-3 text-left focus:outline-none hover:opacity-90 transition-opacity"
            >
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-[#836EFD] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#836EFD]/20">
                <span className="font-black text-white text-lg">O</span>
                <div className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent block">OpenPod.io</span>
              </div>
            </button>
          </div>

          {/* Conditionally show navigation controls outside landing page */}
          {!showLanding ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLanding(true)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition active:scale-95 shadow-sm"
              >
                <svg className="w-4.5 h-4.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Inicio</span>
              </button>

              <form onSubmit={handleLoadPin} className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1.5 pl-3">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">PIN CONCURSO:</span>
                <input
                  type="number"
                  placeholder="Ej. 123456"
                  value={searchPin}
                  onChange={(e) => setSearchPin(e.target.value)}
                  className="w-24 bg-transparent border-0 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:ring-0 p-0 text-center"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#836EFD]/10 hover:bg-[#836EFD]/20 border border-[#836EFD]/30 px-3.5 py-1.5 text-xs font-bold text-[#836EFD] transition active:scale-95 whitespace-nowrap"
                >
                  Cargar PIN
                </button>
              </form>
            </div>
          ) : null}

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
                <p className="text-xs text-rose-400/80">Tu billetera está conectada a una red diferente. Cambia a Monad Testnet para interactuar.</p>
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

        {/* Main Content Area */}
        {showLanding ? (
          // Onboarding Landing Page
          <div className="flex-grow flex flex-col justify-center py-6 md:py-10 space-y-10 animate-fadeIn">
            {/* Hero / Concept Explanation */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Salas de Competencia en Tiempo Real
              </h1>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                Crea torneos instantáneos para tus proyectos, podcasts, música o pitches. Postula contenido, vota con micro-predicciones y gana recompensas en la red ultra-veloz de Monad.
              </p>
            </div>

            {/* Split Grid */}
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto w-full px-2">
              
              {/* Left Column: Hostear un Concurso (Violet Theme) */}
              <div className="relative rounded-3xl border border-purple-500/20 bg-slate-900/10 p-6 md:p-8 space-y-6 flex flex-col justify-between overflow-hidden shadow-xl shadow-purple-500/5 group hover:border-purple-500/30 transition-all duration-300">
                <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none group-hover:bg-purple-500/15 transition-all duration-300" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white">Hostear un Concurso</h2>
                      <p className="text-xs text-purple-400/80 font-bold uppercase tracking-wider font-mono">Panel del Host</p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                    Crea una nueva sala de competencia en la blockchain. Podrás recibir postulaciones, iniciar la votación y resolver los resultados on-chain.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/40">
                  {isConnected ? (
                    <form onSubmit={handleCreateConcurso} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Concurso</label>
                        <input
                          type="text"
                          placeholder="Ej. Torneo de Pitches #1"
                          value={concursoTitle}
                          onChange={(e) => setConcursoTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] focus:ring-1 focus:ring-[#836EFD]/50 transition"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción del Concurso</label>
                        <textarea
                          placeholder="Describe el concurso, las reglas o el formato del contenido..."
                          value={concursoDescription}
                          onChange={(e) => setConcursoDescription(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] focus:ring-1 focus:ring-[#836EFD]/50 transition resize-none h-16"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={createLoading}
                        className="w-full rounded-xl bg-gradient-to-r from-[#836EFD] to-indigo-600 hover:from-[#836EFD]/95 hover:to-indigo-600/95 py-3 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25"
                      >
                        {createLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Creando Concurso...</span>
                          </>
                        ) : (
                          <span>Crear Sala de Concurso</span>
                        )}
                      </button>

                      <p className="text-[10px] text-center text-[#836EFD] font-mono font-bold">
                        Se generará un PIN único de 6 dígitos en la blockchain
                      </p>
                    </form>
                  ) : (
                    <div className="space-y-3 text-center py-2">
                      <p className="text-xs text-slate-500">Conecta tu billetera para registrar un concurso en la blockchain.</p>
                      <button
                        onClick={connectWallet}
                        className="w-full rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3 text-xs font-black text-white transition duration-200 active:scale-95 shadow-md shadow-[#836EFD]/20"
                      >
                        Conectar Billetera Mozi
                      </button>
                    </div>
                  )}

                  {createResult && (
                    <div className={`p-3 rounded-xl text-xs border ${
                      createResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {createResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Unirse a un Concurso (Cyan Theme) */}
              <div className="relative rounded-3xl border border-cyan-500/20 bg-slate-900/10 p-6 md:p-8 space-y-6 flex flex-col justify-between overflow-hidden shadow-xl shadow-cyan-500/5 group hover:border-cyan-500/30 transition-all duration-300">
                <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-300" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white">Unirse a un Concurso</h2>
                      <p className="text-xs text-cyan-400/80 font-bold uppercase tracking-wider font-mono">Panel del Votante / Creador</p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                    Ingresa el PIN numérico de un concurso creado para postular tus proyectos, escuchar o ver las propuestas de los participantes, y votar para ganar.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/40">
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    if (!searchPin) return
                    try {
                      const pin = BigInt(searchPin)
                      if (pin <= 0n) return
                      setSelectedCompId(pin)
                      setShowLanding(false) // Transition to dashboard
                      setSearchPin('')
                    } catch {
                      // ignore
                    }
                  }} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PIN del Concurso</label>
                      <input
                        type="number"
                        placeholder="Ej. 123456"
                        value={searchPin}
                        onChange={(e) => setSearchPin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-slate-100 font-mono font-extrabold text-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition tracking-widest"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3 text-xs font-black text-white transition duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <span>Ingresar a la Sala</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>

                    {latestId !== undefined && latestId > 0n && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompId(latestId)
                          setShowLanding(false)
                        }}
                        className="w-full text-center text-[10px] text-slate-500 hover:text-cyan-400 font-mono transition-colors"
                      >
                        O ingresar al último concurso activo: <span className="text-cyan-500 underline font-bold">PIN #{latestId.toString()}</span>
                      </button>
                    )}
                  </form>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="space-y-12">

          {/* State: Competition PIN does not exist */}
          {currentCompId > 0n && !doesCompExist && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/20 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white uppercase font-mono tracking-widest">
                El Concurso con PIN #{currentCompId.toString()} no existe
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                El código de concurso ingresado no corresponde a ninguna competencia registrada en la blockchain. Puedes ingresar otro PIN en la barra de búsqueda de arriba, o crear un nuevo concurso.
              </p>
              
              {isConnected ? (
                <div className="pt-4 max-w-lg mx-auto">
                  <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-900 space-y-4 text-left">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">// CREAR NUEVO CONCURSO</h4>
                    <form onSubmit={handleCreateConcurso} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Concurso</label>
                        <input
                          type="text"
                          placeholder="Ej. Mi Nuevo Concurso"
                          value={concursoTitle}
                          onChange={(e) => setConcursoTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                        <textarea
                          placeholder="Escribe una descripción para este concurso..."
                          value={concursoDescription}
                          onChange={(e) => setConcursoDescription(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition resize-none h-16"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="w-full rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-2.5 px-4 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#836EFD]/25"
                      >
                        {createLoading ? 'Creando...' : 'Crear'}
                      </button>
                    </form>
                    {createResult && (
                      <p className="text-xs text-emerald-400 mt-2">{createResult.message}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-4 text-xs text-slate-500">
                  Conecta tu billetera arriba para poder crear una nueva competencia.
                </div>
              )}
            </section>
          )}

          {/* State: No competitions exist at all yet */}
          {currentCompId === 0n && (
            <section className="bg-slate-900/10 border border-slate-800 bg-slate-950/40 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />
              <h3 className="text-lg font-bold text-white uppercase font-mono tracking-widest">// DEBES CREAR EL PRIMER CONCURSO</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                No se han registrado competencias en la plataforma. Conecta tu billetera y crea el primer concurso para comenzar.
              </p>

              {isConnected ? (
                <form onSubmit={handleCreateConcurso} className="max-w-lg mx-auto bg-slate-950/60 p-6 rounded-2xl border border-slate-900 space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Concurso</label>
                    <input
                      type="text"
                      placeholder="Ej. Concurso de Proyectos #1"
                      value={concursoTitle}
                      onChange={(e) => setConcursoTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#836EFD] transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Descripción</label>
                    <textarea
                      placeholder="Escribe una descripción..."
                      value={concursoDescription}
                      onChange={(e) => setConcursoDescription(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#836EFD] transition resize-none h-20"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25"
                  >
                    {createLoading ? 'Creando Concurso...' : 'Crear Concurso Principal'}
                  </button>
                  {createResult && (
                    <p className="text-xs text-emerald-400 mt-2">{createResult.message}</p>
                  )}
                </form>
              ) : (
                <button
                  onClick={connectWallet}
                  className="rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3 px-6 text-xs font-black text-white transition duration-200"
                >
                  Conectar Billetera Mozi
                </button>
              )}
            </section>
          )}
          
          {/* Dynamic Control Panel */}
          {isConnected && doesCompExist && compDetails && (
            <section className="bg-slate-900/10 border border-slate-800 bg-slate-950/40 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />
              
              <h3 className="text-md font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                PANEL DE CONTROL DE TORNEO (PIN #{currentCompId.toString()})
              </h3>

              {/* State A: Competition exists but has ended */}
              {compDetails.state === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-sm text-slate-300">
                    ℹ️ Esta competencia ha finalizado. Puedes crear una nueva competencia si lo deseas (recibirá el siguiente PIN disponible).
                  </div>

                  <form onSubmit={handleCreateConcurso} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Concurso</label>
                      <input
                        type="text"
                        placeholder="Ej. Concurso de Proyectos #2"
                        value={concursoTitle}
                        onChange={(e) => setConcursoTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#836EFD] focus:ring-1 focus:ring-[#836EFD]/50 transition"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</label>
                      <textarea
                        placeholder="Describe el nuevo concurso..."
                        value={concursoDescription}
                        onChange={(e) => setConcursoDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#836EFD] focus:ring-1 focus:ring-[#836EFD]/50 transition resize-none h-16"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="w-full rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/90 py-3.5 text-xs font-black text-white transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/25"
                    >
                      {createLoading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Creando Concurso...</span>
                        </>
                      ) : (
                        <span>Crear Nuevo Concurso</span>
                      )}
                    </button>
                  </form>

                  {createResult && (
                    <div className={`p-3 rounded-xl text-xs border ${
                      createResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {createResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* State B: Competition exists in Upcoming state */}
              {compDetails.state === 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left Column: Postulate Form */}
                  <div className="space-y-4 border-r border-slate-800/60 pr-0 md:pr-6">
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">// POSTULAR MI CONTENIDO</h4>
                    <p className="text-xs text-slate-400">Postula tu proyecto multimedia a este concurso (archivo .mp3, .wav, .mp4, o enlace de YouTube).</p>
                    
                    <form onSubmit={handlePostulateContent} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Wallet del Competidor</label>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={candidateWallet}
                          onChange={(e) => setCandidateWallet(e.target.value)}
                          disabled={address?.toLowerCase() !== compDetails.host.toLowerCase()}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                          required
                        />
                        <p className="text-[9px] text-slate-500">
                          {address?.toLowerCase() === compDetails.host.toLowerCase()
                            ? "✓ Como Host, puedes ingresar cualquier dirección de wallet para agregar competidores."
                            : "🔒 Solo puedes postular tu propio proyecto con tu wallet actual."}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Proyecto</label>
                        <input
                          type="text"
                          placeholder="Ej. Parallel Soundscapes"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Creador / Autor</label>
                        <input
                          type="text"
                          placeholder="Ej. DJ Monadist"
                          value={creatorName}
                          onChange={(e) => setCreatorName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Multimedia</label>
                        <select
                          value={mediaType}
                          onChange={(e) => setMediaType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                        >
                          <option value="youtube">Enlace de YouTube</option>
                          <option value="audio">Archivo de Audio (.mp3, .wav, .ogg, etc.)</option>
                          <option value="video">Archivo de Video (.mp4, .webm, etc.)</option>
                          <option value="image">Imagen (.png, .jpg, .gif, .webp, etc.)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">URL de Contenido (Obligatorio)</label>
                        <input
                          type="url"
                          placeholder="Ej. https://www.youtube.com/watch?v=... o .mp3/.mp4"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={postulateLoading}
                        className="w-full rounded-xl bg-[#836EFD] hover:bg-[#836EFD]/95 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#836EFD]/20"
                      >
                        {postulateLoading ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Registrando...</span>
                          </>
                        ) : (
                          <span>Postular mi Contenido</span>
                        )}
                      </button>
                    </form>

                    {postulateResult && (
                      <div className={`p-2.5 rounded-xl text-[11px] border ${
                        postulateResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {postulateResult.message}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Host Controls / Start Voting */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">// INICIAR PERIODO DE VOTACIÓN</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Solo el Host de este concurso ({compDetails.host.slice(0, 6)}...{compDetails.host.slice(-4)}) puede iniciar la fase de votación. 
                        Requiere al menos 2 candidatos postulados. (Registrados: {candidates?.length || 0})
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 space-y-4">
                      {address?.toLowerCase() === compDetails.host.toLowerCase() ? (
                        <form onSubmit={handleStartVoting} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Duración de la Votación (en minutos)</label>
                            <input
                              type="number"
                              min="1"
                              value={votingDuration}
                              onChange={(e) => setVotingDuration(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#836EFD] transition"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={startVotingLoading || (candidates?.length || 0) < 2}
                            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                          >
                            {startVotingLoading ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span>Iniciando Votación...</span>
                              </>
                            ) : (
                              <span>Iniciar Periodo de Votación</span>
                            )}
                          </button>
                        </form>
                      ) : (
                        <div className="text-xs text-slate-500 text-center py-4">
                          🔒 Esperando a que el host inicie el periodo de votación.
                        </div>
                      )}

                      {startVotingResult && (
                        <div className={`p-2.5 rounded-xl text-[11px] border ${
                          startVotingResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {startVotingResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* State C: Active competition */}
              {compDetails.state === 1 && (
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/25 text-sm text-cyan-300">
                  ⚡ La votación está en curso para el concurso **"{compDetails.title}"**. Revisa los competidores a continuación y emite tu voto predictor.
                </div>
              )}
            </section>
          )}

          {/* Active Competition Header with Countdown Timer and Total Pool */}
          {doesCompExist && compDetails && (
            <section className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />
              
              <div className="space-y-3 text-center md:text-left">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    Concurso #{compDetails.id.toString()}: {compDetails.title}
                  </h2>
                  <p className="text-[10px] text-[#836EFD] font-mono mt-0.5">
                    Organizado por: <span className="font-bold">{compDetails.host.slice(0, 6)}...{compDetails.host.slice(-4)}</span>
                  </p>
                </div>
                
                {compDetails.description && (
                  <div className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 leading-relaxed max-w-xl text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">Descripción del Torneo</span>
                    {compDetails.description}
                  </div>
                )}

                <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                  {compDetails.state === 0 
                    ? "Fase de postulación y registro. Agrega proyectos al concurso arriba."
                    : compDetails.state === 1
                      ? "Fase de votación activa. ¡Vota por tu favorito para depositar la tarifa de entrada de 0.1 MONAD y ganar tu parte del pozo!"
                      : "La competencia ha finalizado. Ve el podio revelado y reclama tus ganancias a continuación."}
                </p>
              </div>

              {/* Countdown timer & Total Pool wrapper */}
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 flex-shrink-0">
                {/* Localized finalization date */}
                <div className="text-center sm:text-right space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Finalización</p>
                  <p className="text-xs font-mono text-slate-300 font-bold whitespace-nowrap">
                    {compDetails.endTime > 0n 
                      ? new Date(Number(compDetails.endTime) * 1000).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Pendiente de inicio'}
                  </p>
                </div>

                {/* Highlighted Total Pool display */}
                <div className="text-center sm:text-left sm:border-l sm:border-r border-slate-800 sm:px-8 space-y-1">
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
          )}

          {/* Grid Panel: Participating Projects Media Cards */}
          {doesCompExist && (
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

              {projects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-3">
                  {projects.map((project, i) => (
                    <MediaCard
                      key={i}
                      title={project.title}
                      author={project.author}
                      description={project.description}
                      src={project.src}
                      candidateAddress={project.candidateAddress}
                      onVote={handleVote}
                      isVoting={isVoting}
                      isConnected={isConnected}
                      isWrongNetwork={isWrongNetwork}
                      odds={project.odds}
                      highlightOdds={project.highlightOdds}
                      status={getCompStatus()}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-900 bg-slate-950/40 p-12 text-center text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-semibold">Aún no hay creadores registrados en este concurso.</p>
                  {compDetails && compDetails.state === 0 && (
                    <p className="text-xs text-slate-600 mt-1">¡Utiliza el formulario de postulación de arriba para registrar el primer proyecto!</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* OpenPod.io Reveal Section: Locked blind vote podiums */}
          {doesCompExist && compDetails && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/20 p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#836EFD]/40 to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
                <div className="text-center md:text-left space-y-1.5">
                  <h3 className="text-md font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 justify-center md:justify-start">
                    {compDetails.state !== 2 ? (
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
                    {compDetails.state !== 2 
                      ? "Podio protegido por Voto Ciego. Se calculará on-chain al finalizar la cuenta regresiva." 
                      : "Concurso finalizado. Revelando los resultados de los ganadores on-chain."}
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
                        <div className={`absolute inset-0 transition-all duration-700 flex items-center ${compDetails.state === 2 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-300 tracking-tight leading-snug">
                            {pod.locked}
                          </p>
                        </div>
                        <div className={`absolute inset-0 transition-all duration-700 flex items-center ${compDetails.state === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                          <p className="text-xs sm:text-sm font-extrabold text-emerald-400 tracking-tight leading-snug">
                            {pod.revealed}
                          </p>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{pod.subtext}</p>
                    </div>
                    
                    {/* Lock icon */}
                    <div className="relative h-10 w-10 shrink-0 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center z-10 ml-3 transition-all duration-500">
                      {compDetails.state !== 2 ? (
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
              {compDetails.state === 2 && isConnected && (
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
          )}

          {/* Faucet Support Area */}
          {isConnected && !isWrongNetwork && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-md font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#836EFD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Portal Faucet de Monad Testnet
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
          {compDetails && compDetails.state === 1 && (
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
                    {projects.length > 0 ? (
                      <>
                        <span>0x12a3...votó por {projects[0]?.title || 'Candidato 1'} (0.1 MONAD)</span>
                        <span>•</span>
                        <span>0xf43b...votó por {projects[1]?.title || projects[0]?.title || 'Candidato'} (0.1 MONAD)</span>
                        <span>•</span>
                        <span>0x99e2...votó por {projects[1]?.title || 'Candidato'} (0.1 MONAD)</span>
                        <span>•</span>
                        <span>0x3a5f...votó por {projects[2]?.title || projects[0]?.title || 'Candidato'} (0.1 MONAD)</span>
                        <span>•</span>
                        <span>0x7e8c...votó por {projects[0]?.title || 'Candidato'} (0.1 MONAD)</span>
                      </>
                    ) : (
                      <span>Esperando los primeros votos del concurso...</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          </div>
        )}

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
