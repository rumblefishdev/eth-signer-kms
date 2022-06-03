import AWS from 'aws-sdk'
import { getEthAddressFromKMS, KMSProvider } from '../src'
import { utils, providers, Wallet } from 'ethers'
import Common, { Hardfork } from '@ethereumjs/common'

describe('KMSSinger', () => {
  let kms: AWS.KMS
  let keyId: string
  let walletAddress: string
  const providerUrl = process.env.GANACHE_ENDPOINT

  const provider = new providers.JsonRpcProvider(providerUrl)
  beforeAll(async () => {
    kms = new AWS.KMS({
      endpoint: process.env.KMS_ENDPOINT,
      region: 'local',
      accessKeyId: 'AKIAXTTRUF7NU7KDMIED',
      secretAccessKey: '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'
    })
    const createResponse = await kms
      .createKey({
        KeyUsage: 'SIGN_VERIFY',
        CustomerMasterKeySpec: 'ECC_SECG_P256K1'
      })
      .promise()

    keyId = createResponse.KeyMetadata.KeyId
    walletAddress = await getEthAddressFromKMS({ kmsInstance: kms, keyId })
    const wallet = Wallet.fromMnemonic(
      process.env.MNEMONIC,
      `m/44'/60'/0'/0/0`
    ).connect(provider)
    const tx = await wallet.sendTransaction({
      to: walletAddress,
      value: utils.parseEther('10')
    })
    await tx.wait()
  })

  it('should sign transaction using KMS', async () => {
    expect(walletAddress).toMatch(/0x[0-9a-fA-f]{40}/)
    const customCommon = Common.custom(
      {
        name: 'test',
        url: providerUrl,
        comment: 'test',
        chainId: 1337,
        hardforks: [{ name: Hardfork.London, block: 0 }]
      },
      {
        baseChain: 'mainnet'
      }
    )

    const kmsProvider = new KMSProvider({
      providerOrUrl: providerUrl,
      keyId: keyId,
      kmsInstance: kms,
      chainSettings: {
        customChains: [
          {
            name: customCommon.chainName(),
            hardforks: customCommon.hardforks(),
            chainId: customCommon.chainIdBN(),
            comment: 'custom',
            networkId: customCommon.networkIdBN(),
            url: providerUrl,
            genesis: customCommon.genesis(),
            bootstrapNodes: customCommon.bootstrapNodes()
          }
        ],
        hardfork: Hardfork.London
      }
    })

    const ethKmsProvider = new providers.Web3Provider(
      kmsProvider as unknown as providers.ExternalProvider
    ).getSigner()
    const balance = await ethKmsProvider.getBalance()
    expect(balance).toEqual(utils.parseEther('10'))

    const someWallet = Wallet.createRandom()
    await ethKmsProvider.sendUncheckedTransaction({
      to: someWallet.address,
      value: utils.parseEther('1'),
      type: 2,
      maxFeePerGas: utils.parseUnits('1', 'gwei')
    })

    const targetBalance = await provider.getBalance(someWallet.address)
    expect(targetBalance).toEqual(utils.parseEther('1'))

    kmsProvider.stopBlockPolling()
  })
})
