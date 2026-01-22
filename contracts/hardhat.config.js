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
        runs: 200,
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
      // accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      ledgerAccounts: process.env.LEDGER_ADDRESS ? [process.env.LEDGER_ADDRESS] : [],
      gasPrice: 25000000000,
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337,
      forking: {
        url: "https://api.avax.network/ext/bc/C/rpc",
        enabled: false,
      },
    },
  },
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY || "",
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
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
