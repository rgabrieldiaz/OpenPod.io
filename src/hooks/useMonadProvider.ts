'use client'

import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { openPodioAbi } from '../config/abi'
import { parseEther } from 'viem'
import { useState, useEffect } from 'react'

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x356543d368819052604081206007015460ff1680') as `0x${string}`
const MONAD_TESTNET_CHAIN_ID = 10143

export function useMonadProvider() {
  const { address, isConnected, chain, chainId } = useAccount()
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [isWrongNetwork, setIsWrongNetwork] = useState(false)

  // Track wrong network state
  useEffect(() => {
    if (isConnected && chainId !== MONAD_TESTNET_CHAIN_ID) {
      setIsWrongNetwork(true)
    } else {
      setIsWrongNetwork(false)
    }
  }, [isConnected, chainId])

  const connectWallet = () => {
    // Standard injected connector detects EIP-1193 providers like Mozi Wallet
    const injectedConnector = connectors.find((c) => c.id === 'injected') || injected()
    connect({ connector: injectedConnector })
  }

  const disconnectWallet = () => {
    disconnect()
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })
  }

  // Contract Write hook for transactions
  const { writeContractAsync, data: txHash, isPending: isWritePending, reset: resetWrite } = useWriteContract()

  // Wait for Tx Receipt with 1 confirmation (highly responsive on Monad's sub-second finality)
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  })

  // Expose createConcurso function
  const createConcurso = async (title: string, description: string) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()

    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'createConcurso',
      args: [title, description],
    })
  }

  // Expose registerParticipant function
  const registerParticipant = async (
    competitionId: bigint,
    candidateAddress: `0x${string}`,
    projectName: string,
    creatorName: string,
    mediaUrl: string
  ) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()

    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'registerParticipant',
      args: [competitionId, candidateAddress, projectName, creatorName, mediaUrl],
    })
  }

  // Expose startVoting function
  const startVoting = async (competitionId: bigint, durationInMinutes: bigint) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()

    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'startVoting',
      args: [competitionId, durationInMinutes],
    })
  }

  // Expose vote function
  const voteInCompetition = async (competitionId: bigint, candidateAddress: `0x${string}`) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()
    
    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'vote',
      args: [competitionId, candidateAddress],
      value: parseEther('0.1'),
    })
  }

  // Expose resolve function
  const resolveCompetition = async (competitionId: bigint) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()
    
    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'resolveCompetition',
      args: [competitionId],
    })
  }

  // Expose claimRewards function
  const claimRewards = async (competitionId: bigint) => {
    if (!isConnected) throw new Error('Wallet not connected')
    if (isWrongNetwork) throw new Error('Wrong network. Please switch to Monad Testnet.')

    resetWrite()
    
    return await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'claimRewards',
      args: [competitionId],
    })
  }

  // Hook for reading the current competition count
  const useCompetitionCount = () => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'competitionCount',
    })

    return {
      count: data as bigint | undefined,
      isLoading,
      refetch,
    }
  }

  // Hook for reading the latest competition ID (PIN)
  const useLatestCompetitionId = () => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'latestCompetitionId',
    })

    return {
      latestId: data as bigint | undefined,
      isLoading,
      refetch,
    }
  }

  // Hook for reading competition details
  const useCompetitionDetails = (competitionId: bigint) => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'competitions',
      args: [competitionId],
    })

    // competitions returns: [id, title, description, host, endTime, totalPool, winner, rewardPerVoter, resolved, state]
    const details = data ? {
      id: (data as any)[0] as bigint,
      title: (data as any)[1] as string,
      description: (data as any)[2] as string,
      host: (data as any)[3] as string,
      endTime: (data as any)[4] as bigint,
      totalPool: (data as any)[5] as bigint,
      winner: (data as any)[6] as string,
      rewardPerVoter: (data as any)[7] as bigint,
      resolved: (data as any)[8] as boolean,
      state: (data as any)[9] as number, // 0 = Upcoming, 1 = Active, 2 = Ended
    } : undefined

    return {
      details,
      isLoading,
      refetch,
    }
  }

  // Hook for reading candidates addresses
  const useCandidates = (competitionId: bigint) => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'getCandidates',
      args: [competitionId],
    })

    return {
      candidates: data as `0x${string}`[] | undefined,
      isLoading,
      refetch,
    }
  }

  // Hook for reading candidate names, creators, and media urls
  const useCandidatesMetadata = (competitionId: bigint, candidateAddresses: `0x${string}`[] | undefined) => {
    const { data, isLoading, refetch } = useReadContracts({
      contracts: (candidateAddresses || []).flatMap((addr) => [
        {
          address: CONTRACT_ADDRESS,
          abi: openPodioAbi,
          functionName: 'candidateProjectName',
          args: [competitionId, addr],
        },
        {
          address: CONTRACT_ADDRESS,
          abi: openPodioAbi,
          functionName: 'candidateCreatorName',
          args: [competitionId, addr],
        },
        {
          address: CONTRACT_ADDRESS,
          abi: openPodioAbi,
          functionName: 'candidateMediaUri',
          args: [competitionId, addr],
        },
      ]),
    })

    return {
      metadata: data,
      isLoading,
      refetch,
    }
  }

  // Hook for reading user vote selection
  const useUserVoteSelection = (competitionId: bigint, userAddress?: `0x${string}`) => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'voterSelection',
      args: [competitionId, userAddress || '0x0000000000000000000000000000000000000000'],
      query: {
        enabled: !!userAddress,
      }
    })

    return {
      voterSelection: data as `0x${string}` | undefined,
      isLoading,
      refetch,
    }
  }

  // Hook for reading if user has claimed reward
  const useHasClaimedReward = (competitionId: bigint, userAddress?: `0x${string}`) => {
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'rewardClaimed',
      args: [competitionId, userAddress || '0x0000000000000000000000000000000000000000'],
      query: {
        enabled: !!userAddress,
      }
    })

    return {
      hasClaimed: data as boolean | undefined,
      isLoading,
      refetch,
    }
  }

  return {
    // Connection States
    address,
    isConnected,
    isConnecting,
    connectError,
    isWrongNetwork,
    chain,
    
    // Core Functions
    connectWallet,
    disconnectWallet,
    switchNetwork: handleSwitchNetwork,
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

    // Loading states optimized for Monad
    isVoting: isWritePending || isTxConfirming,
    isTxSuccess,
    txHash,
  }
}
