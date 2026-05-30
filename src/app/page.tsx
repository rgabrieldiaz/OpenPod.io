'use client'

import { useBalance } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { useMonadProvider } from '../hooks/useMonadProvider'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  
  // Custom hook containing EIP-1193 connector and Monad Testnet specifications
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
    txHash,
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
  const { endTime: compEndTime, isLoading: isEndTimeLoading } = readCompetitionEndTime(competitionId)

  // Mock candidates for the demo podcast competition
  const candidateA = '0x4444444444444444444444444444444444444444' as `0x${string}`
  const candidateB = '0x5555555555555555555555555555555555555555' as `0x${string}`

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

  const handleVote = async (candidate: `0x${string}`, name: string) => {
    setVoteResult(null)
    try {
      const hash = await voteInCompetition(competitionId, candidate)
      setVoteResult({
        success: true,
        message: `Voted successfully for ${name}!`,
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

  // Format the end date for display
  const getFormattedEndTime = () => {
    if (isEndTimeLoading) return 'Loading...'
    if (!compEndTime || compEndTime === 0n) return 'Date not set (Competition not created in contract)'
    const date = new Date(Number(compEndTime) * 1000)
    return date.toLocaleString()
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
      {/* Decorative Background Elements */}
      <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-purple-900/10 blur-[150px]" />
      <div className="absolute -bottom-[30%] -right-[10%] h-[70%] w-[70%] rounded-full bg-violet-800/10 blur-[130px]" />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12 md:py-20 flex flex-col min-h-screen justify-between">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="font-black text-white text-lg">O</span>
              <div className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OpenPod.io</span>
              <span className="ml-2 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">Monad Testnet</span>
            </div>
          </div>

          <div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-slate-400">Connected wallet</p>
                  <p className="text-sm font-semibold text-slate-200">
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
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="my-12">
          {/* Wrong Network Alert Banner */}
          {isWrongNetwork && (
            <div className="mb-8 rounded-xl bg-rose-500/10 border border-rose-500/20 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-300">Wrong Network Configured</h4>
                  <p className="text-xs text-rose-400/80">Please switch your wallet to Monad Testnet (Chain ID 10143) to vote and claim rewards.</p>
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

          <div className="grid gap-10 md:grid-cols-12 items-start">
            {/* Left Column - Hero */}
            <div className="md:col-span-7 space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
                Decentralized <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  Podcasting
                </span> on Monad
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                OpenPod is the next-generation audio publishing and monetization platform. Leveraging Monad's parallel EVM technology, enjoy sub-second consensus and near-zero fees for micro-transactions, content ownership, and listener rewards.
              </p>

              {/* Dynamic Interactive Podcast Competition Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">Podcast Battle #1</span>
                    <h3 className="text-lg font-bold text-white mt-1.5">Monad Founders vs. Parallel EVM Innovators</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">Media URI: ipfs://QmOpenPodPodcastEpisode1</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Time Remaining</p>
                    <p className="text-xs font-semibold text-purple-400 font-mono mt-1">
                      {getFormattedEndTime()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Cast your vote (Requires 0.1 MONAD)</span>
                    <span className="font-semibold text-purple-400">Pool Accumulates Payouts</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleVote(candidateA, 'Monad Founders')}
                      disabled={!isConnected || isWrongNetwork || isVoting}
                      className="rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/30 p-3 text-center transition duration-200 active:scale-95 disabled:opacity-50"
                    >
                      <p className="text-xs font-bold text-slate-200">Monad Founders</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">0x4444...4444</p>
                    </button>
                    <button
                      onClick={() => handleVote(candidateB, 'Parallel EVM Innovators')}
                      disabled={!isConnected || isWrongNetwork || isVoting}
                      className="rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/30 p-3 text-center transition duration-200 active:scale-95 disabled:opacity-50"
                    >
                      <p className="text-xs font-bold text-slate-200">EVM Innovators</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">0x5555...5555</p>
                    </button>
                  </div>

                  {voteResult && (
                    <div className={`p-3 rounded-lg text-xs border mt-2 ${
                      voteResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      <p className="font-semibold">{voteResult.message}</p>
                      {voteResult.txHash && (
                        <p className="mt-1 font-mono break-all opacity-85">
                          Tx Receipt: <a 
                            href={`https://testnet.monadscan.com/tx/${voteResult.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-emerald-300"
                          >
                            {voteResult.txHash}
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Web3 Portal Card */}
            <div className="md:col-span-5">
              <div className="relative group rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 p-6 md:p-8 overflow-hidden shadow-2xl transition duration-300 hover:border-purple-500/20">
                {/* Card glowing borders */}
                <div className="absolute top-0 right-0 h-[1px] w-[50%] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                <div className="absolute bottom-0 left-0 h-[1px] w-[50%] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                  DApp Network Portal
                </h2>

                {!isConnected ? (
                  <div className="space-y-6 py-4">
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="font-semibold text-slate-200">Wallet Disconnected</p>
                      <p className="text-sm text-slate-400">Connect your Mozi Wallet or browser extension to interact with the Monad Testnet.</p>
                    </div>

                    <button
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="w-full relative group overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting Wallet...' : 'Connect Wallet'}
                    </button>
                    {connectError && (
                      <p className="text-xs text-rose-500 text-center mt-2 bg-rose-500/10 py-2 px-3 rounded-lg border border-rose-500/20">
                        {connectError.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats / Parameters */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                        <span className="text-sm text-slate-400 font-medium">Connected Address</span>
                        <span className="text-sm font-mono font-bold text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {address?.slice(0, 6)}...{address?.slice(-6)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                        <span className="text-sm text-slate-400 font-medium">Network</span>
                        <span className="text-sm font-bold text-purple-400">
                          {chain?.name || 'Monad Testnet'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                        <span className="text-sm text-slate-400 font-medium">Chain ID</span>
                        <span className="text-sm font-mono text-slate-200">{chain?.id || 10143}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-400 font-medium">Balance</span>
                        <span className="text-sm font-bold text-slate-200">
                          {balanceData ? `${Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}` : 'Loading...'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Faucet Section */}
                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Monad Testnet Faucet
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Need funds to test transactions? Request 1 testnet MONAD token directly using our integrated devnads faucet.
                      </p>

                      <button
                        onClick={handleRequestFaucet}
                        disabled={faucetLoading}
                        className="w-full rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/25 px-4 py-2.5 text-xs font-bold text-purple-400 transition duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {faucetLoading ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                            <span>Requesting MONAD...</span>
                          </>
                        ) : (
                          <span>Request 1 MONAD</span>
                        )}
                      </button>

                      {faucetResult && (
                        <div className={`p-3 rounded-lg text-xs border ${
                          faucetResult.success 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          <p className="font-semibold">{faucetResult.message}</p>
                          {faucetResult.txHash && (
                            <p className="mt-1 font-mono break-all opacity-85">
                              Tx: <a 
                                href={`https://testnet.monadscan.com/tx/${faucetResult.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-emerald-300"
                              >
                                {faucetResult.txHash}
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OpenPod.io. All rights reserved.</p>
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
