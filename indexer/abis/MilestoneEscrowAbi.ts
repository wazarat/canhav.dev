// Generated from contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json — regenerate after contract changes.
export const MilestoneEscrowAbi = [
  {
    "type": "function",
    "name": "MAX_TRANCHES",
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
    "name": "claim",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "trancheIndex",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createEscrow",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "journeyHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "tranches",
        "type": "tuple[]",
        "internalType": "struct MilestoneEscrow.TrancheInput[]",
        "components": [
          {
            "name": "milestoneIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "unlockTime",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "escrows",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "journeyHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextEscrowId",
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
    "name": "tranche",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "trancheIndex",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct MilestoneEscrow.Tranche",
        "components": [
          {
            "name": "milestoneIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "claimed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "unlockTime",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "trancheCount",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "tranches",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct MilestoneEscrow.Tranche[]",
        "components": [
          {
            "name": "milestoneIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "claimed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "unlockTime",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "EscrowCreated",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "journeyHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrancheAdded",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "trancheIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "unlockTime",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrancheClaimed",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "trancheIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneIndexTooHigh",
    "inputs": [
      {
        "name": "milestoneIndex",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "MilestoneIndicesNotIncreasing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoTranches",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooManyTranches",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TrancheStillLocked",
    "inputs": [
      {
        "name": "unlockTime",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnexpectedTransferAmount",
    "inputs": [
      {
        "name": "received",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownEscrow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownTranche",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroTrancheAmount",
    "inputs": []
  }
] as const;
