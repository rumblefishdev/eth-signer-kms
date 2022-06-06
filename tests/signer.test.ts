import AWS from 'aws-sdk'
import { getEthAddressFromKMS, KMSSigner } from '../src'
import { utils, providers, Wallet } from 'ethers'
import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  hashPersonalMessage,
  publicToAddress
} from 'ethereumjs-util'

describe('KMSSinger', () => {
  let kms: AWS.KMS
  let keyId: string
  let walletAddress: string
  let kmsSigner: KMSSigner
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
    kmsSigner = new KMSSigner(provider, keyId, kms)
  })

  it('should sign transaction using KMS', async () => {
    expect(walletAddress).toMatch(/0x[0-9a-fA-f]{40}/)
    const balance = await kmsSigner.getBalance()
    expect(balance).toEqual(utils.parseEther('10'))

    const someWallet = Wallet.createRandom()
    await kmsSigner.sendTransaction({
      to: someWallet.address,
      value: utils.parseEther('1'),
      type: 2,
      maxFeePerGas: utils.parseUnits('1', 'gwei')
    })

    const targetBalance = await provider.getBalance(someWallet.address)
    expect(targetBalance).toEqual(utils.parseEther('1'))
  })

  it('should sign message using KMS', async () => {
    const message = 'hi'
    const signature = await kmsSigner.signMessage(message)
    const { v, r, s } = fromRpcSig(signature)

    const messageBuffer = Buffer.from(message)
    const messageHash = hashPersonalMessage(messageBuffer)

    const publicKey = ecrecover(messageHash, v, r, s)
    const addrBuffer = publicToAddress(publicKey)
    const recoveredAddress = bufferToHex(addrBuffer)
    expect(walletAddress.toLowerCase()).toEqual(recoveredAddress.toLowerCase())
  })

  it('should sign message with utf signs using KMS', async () => {
    const message = 'zażółć gęślą jaźń'

    const signature = await kmsSigner.signMessage(message)
    const { v, r, s } = fromRpcSig(signature)

    const messageBuffer = Buffer.from(message)
    const messageHash = hashPersonalMessage(messageBuffer)

    const publicKey = ecrecover(messageHash, v, r, s)
    const addrBuffer = publicToAddress(publicKey)
    const recoveredAddress = bufferToHex(addrBuffer)
    expect(walletAddress.toLowerCase()).toEqual(recoveredAddress.toLowerCase())
  })
})
