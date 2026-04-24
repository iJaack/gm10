require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ledger");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Minimize contract size (V2 is near the 24KB deployment limit)
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    // Avalanche C-Chain Mainnet
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      // accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], // Legacy private key
      ledgerAccounts: process.env.LEDGER_ADDRESS ? [process.env.LEDGER_ADDRESS] : [],
      gasPrice: 25000000000, // 25 gwei
    },
    // Avalanche Fuji Testnet
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      // Use PRIVATE_KEY for software wallet deployment, or LEDGER for hardware wallet
      ...(process.env.PRIVATE_KEY
        ? { accounts: [process.env.PRIVATE_KEY] }
        : { ledgerAccounts: process.env.LEDGER_ADDRESS ? [process.env.LEDGER_ADDRESS] : [] }),
      gasPrice: 25000000000,
    },
    // Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      ...(process.env.PRIVATE_KEY
        ? { accounts: [process.env.PRIVATE_KEY] }
        : { ledgerAccounts: process.env.LEDGER_ADDRESS ? [process.env.LEDGER_ADDRESS] : [] }),
      gasPrice: 50000000000, // 50 gwei
    },
    // Polygon Amoy Testnet
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      ...(process.env.PRIVATE_KEY
        ? { accounts: [process.env.PRIVATE_KEY] }
        : { ledgerAccounts: process.env.LEDGER_ADDRESS ? [process.env.LEDGER_ADDRESS] : [] }),
      gasPrice: 25000000000,
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    avalancheFork: {
      url: "http://127.0.0.1:8545",
      chainId: 43114,
    },
    hardhat: {
      chainId: 31337,
      hardfork: "cancun",
      allowUnlimitedContractSize: true, // V2 is ~127 bytes over EIP-170; allow in tests
      chains: {
        43113: {
          hardforkHistory: {
            cancun: 1,
          },
        },
      },
      forking: {
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        enabled: false,
      },
    },
  },
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY || "snowtrace-placeholder",
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "snowtrace-placeholder",
      polygon: process.env.POLYGONSCAN_API_KEY || "polygonscan-placeholder",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "polygonscan-placeholder",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "AVAX",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
