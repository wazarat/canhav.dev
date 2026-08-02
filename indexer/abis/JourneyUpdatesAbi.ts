// Generated from contracts/out/JourneyUpdates.sol/JourneyUpdates.json — regenerate after contract changes.
export const JourneyUpdatesAbi = [
  {
    "type": "function",
    "name": "MAX_MILESTONE_INDEX",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "postUpdate",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "milestoneIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "updateHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "MilestoneUpdate",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "author",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "milestoneIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "updateHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
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
    "name": "ZeroToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroUpdateHash",
    "inputs": []
  }
] as const;
