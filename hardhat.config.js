require("@nomiclabs/hardhat-waffle");
const fs = require('fs');
const privateKey = fs.existsSync(".secret") ? fs.readFileSync(".secret").toString().trim() : "0x0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts: [privateKey]
    },
    bscMainnet: {
      url: "https://bsc-dataseed1.bnbchain.org",
      chainId: 56,
      accounts: [privateKey]
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [privateKey]
    },
    matic: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [privateKey]
    }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};