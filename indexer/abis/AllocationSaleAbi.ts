// Generated from contracts/out/AllocationSale.sol/AllocationSale.json — regenerate after contract changes.
export const AllocationSaleAbi = [
  {
    "type": "function",
    "name": "BPS_DENOMINATOR",
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
    "name": "buy",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "claimProceeds",
    "inputs": [
      {
        "name": "saleId",
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
    "name": "createSale",
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
        "name": "price",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "allocation",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "startTime",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "endTime",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "perWalletCap",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "tranchesIn",
        "type": "tuple[]",
        "internalType": "struct AllocationSale.ProceedsTrancheInput[]",
        "components": [
          {
            "name": "milestoneIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
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
        "name": "saleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nextSaleId",
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
    "name": "proceedsTranches",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct AllocationSale.ProceedsTranche[]",
        "components": [
          {
            "name": "milestoneIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "claimed",
            "type": "bool",
            "internalType": "bool"
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
    "name": "purchasedBy",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reclaimUnsold",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sale",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AllocationSale.Sale",
        "components": [
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
          },
          {
            "name": "price",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "allocation",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "sold",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "perWalletCap",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "startTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "endTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "unsoldReclaimed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "raised",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "remainingProceeds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "unclaimedTranches",
            "type": "uint8",
            "internalType": "uint8"
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
        "name": "saleId",
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
    "type": "event",
    "name": "ProceedsClaimed",
    "inputs": [
      {
        "name": "saleId",
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
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProceedsTranchePlanned",
    "inputs": [
      {
        "name": "saleId",
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
        "name": "bps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
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
    "name": "SaleCreated",
    "inputs": [
      {
        "name": "saleId",
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
      },
      {
        "name": "price",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "allocation",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "startTime",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "endTime",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "perWalletCap",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TokensPurchased",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cost",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UnsoldReclaimed",
    "inputs": [
      {
        "name": "saleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AllocationExceeded",
    "inputs": [
      {
        "name": "remaining",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyReclaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BpsSumInvalid",
    "inputs": [
      {
        "name": "sum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EthTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InexactPayment",
    "inputs": [
      {
        "name": "sent",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cost",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
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
    "name": "SaleNotEnded",
    "inputs": [
      {
        "name": "endTime",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "SaleNotStarted",
    "inputs": [
      {
        "name": "startTime",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "SaleOver",
    "inputs": [
      {
        "name": "endTime",
        "type": "uint64",
        "internalType": "uint64"
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
    "name": "UnknownSale",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownTranche",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WalletCapExceeded",
    "inputs": [
      {
        "name": "cap",
        "type": "uint128",
        "internalType": "uint128"
      }
    ]
  },
  {
    "type": "error",
    "name": "WindowInvalid",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAllocation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroBps",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroPrice",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroPurchase",
    "inputs": []
  }
] as const;
