import AWS from 'aws-sdk'
import { utils, Signer, providers, BigNumber } from 'ethers'
import { keccak256 } from '@ethersproject/keccak256'
import { createSignature } from './eth'
import { getEthAddressFromKMS } from './kms'
import { hashPersonalMessage } from 'ethereumjs-util'

export class KMSSigner extends Signer {
  private address: string

  constructor(
    public provider: providers.Provider,
    public keyId: string,
    private kmsInstance?: AWS.KMS
  ) {
    super()
    this.keyId = keyId
    this.kmsInstance = kmsInstance ?? new AWS.KMS()
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      this.address = await getEthAddressFromKMS({
        keyId: this.keyId,
        kmsInstance: this.kmsInstance
      })
    }
    return this.address
  }

  async signMessage(message: utils.Bytes | string): Promise<string> {
    if (typeof message === 'string') {
      message = utils.toUtf8Bytes(message)
    }
    const messageBuffer = Buffer.from(utils.hexlify(message).slice(2), 'hex')
    const hash = hashPersonalMessage(messageBuffer).toString('hex')

    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: `0x${hash}`,
      address: await this.getAddress()
    })

    return utils.joinSignature(sig)
  }

  async signTransaction(
    transaction: providers.TransactionRequest
  ): Promise<string> {
    const tx = await utils.resolveProperties(transaction)
    const baseTx: utils.UnsignedTransaction = {
      chainId: tx.chainId || undefined,
      data: tx.data || undefined,
      gasLimit: tx.gasLimit || undefined,
      gasPrice: tx.gasPrice || undefined,
      nonce: tx.nonce ? BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to || undefined,
      value: tx.value || undefined,
      type: tx.type,
      maxFeePerGas: tx.maxFeePerGas || undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas || undefined
    }

    const unsignedTx = utils.serializeTransaction(baseTx)
    const hash = keccak256(utils.arrayify(unsignedTx))

    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
      address: await this.getAddress()
    })

    const result = utils.serializeTransaction(baseTx, sig)
    return result
  }

  connect(provider: providers.Provider): Signer {
    return new KMSSigner(provider, this.keyId, this.kmsInstance)
  }
}
