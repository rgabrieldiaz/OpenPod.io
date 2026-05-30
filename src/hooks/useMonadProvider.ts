'use client'

import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { openPodioAbi } from '../config/abi'
import { parseEther } from 'viem'
import { useState, useEffect } from 'react'

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x356543D368819052604081206007015460ff1680') as `0x${string}`
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

  // Contract Write hook for voting
  const { writeContractAsync, data: txHash, isPending: isVotingPending, reset: resetWrite } = useWriteContract()

  // Wait for Tx Receipt with 1 confirmation (highly responsive on Monad's sub-second finality)
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  })

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

  // Helper read hook generator (dynamic reading requires passing arguments, so we return functions or hooks)
  // To keep it simple, we expose a read utility for endTime of a competition
  const readCompetitionEndTime = (competitionId: bigint) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, isLoading, refetch } = useReadContract({
      address: CONTRACT_ADDRESS,
      abi: openPodioAbi,
      functionName: 'competitions',
      args: [competitionId],
    })

    // competitions returns: [id, title, mediaUri, endTime, totalPool, winner, rewardPerVoter, resolved]
    // endTime is at index 3
    const endTime = data ? (data as any)[3] as bigint : undefined

    return {
      endTime,
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
    voteInCompetition,
    readCompetitionEndTime,

    // Loading states optimized for Monad
    isVoting: isVotingPending || isTxConfirming,
    isTxSuccess,
    txHash,
  }
}
