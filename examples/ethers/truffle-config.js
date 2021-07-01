/* eslint-disable @typescript-eslint/no-var-requires */
require('ts-node/register')
require('dotenv').config()

const { KMSProvider } = require('@rumblefishdev/eth-signer-kms')

module.exports = {
  networks: {
    ropsten: {
      provider: () =>
        new KMSProvider({
          keyId: process.env.KEYID,
          providerOrUrl:
            'wss://ropsten.infura.io/ws/v3/' + process.env.INFURAKEY
        }),
      network_id: 3,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: '0.8.3'
    }
  }
}
