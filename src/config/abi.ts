export const openPodioAbi = [
  {
    "type": "function",
    "name": "VOTE_COST",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimReward",
    "inputs": [
      {
        "name": "_competitionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "competitions",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "mediaUri",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "endTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalPool",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "rewardPerVoter",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "resolved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createCompetition",
    "inputs": [
      {
        "name": "_id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "_mediaUri",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "_endTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_candidates",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCandidateVotes",
    "inputs": [
      {
        "name": "_competitionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_candidate",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasVoted",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "resolveCompetition",
    "inputs": [
      {
        "name": "_competitionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rewardClaimed",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      {
        "name": "_competitionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_candidate",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  }
] as const;
