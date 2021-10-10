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
          providerOrUrl: process.env.PROVIDER,
          accessKeyId: process.env.ACCESSKEYID,
          secretAccessKey: process.env.SECRETACCESSKEY,
          region: process.env.REGION
        }),
      network_id: 3,
      confirmations: 2,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: '0.8.3'
    }
  }
}
