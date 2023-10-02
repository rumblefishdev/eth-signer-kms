import { KMSClient } from '@aws-sdk/client-kms'
import { utils, Signer, providers, BigNumber } from 'ethers'
import { keccak256 } from '@ethersproject/keccak256'
import { _TypedDataEncoder } from '@ethersproject/hash'

import { createSignature } from './eth'
import { getEthAddressFromKMS } from './kms'
import { hashPersonalMessage } from 'ethereumjs-util'
import {
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer'

export class KMSSigner extends Signer implements TypedDataSigner {
  private address: string

  constructor(
    public provider: providers.Provider,
    public keyId: string,
    private kmsInstance?: KMSClient
  ) {
    super()
    this.keyId = keyId
    this.kmsInstance = kmsInstance ?? new KMSClient({})
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

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const hash = _TypedDataEncoder.hash(domain, types, value)
    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
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

    if (baseTx.type === 0) {
      delete baseTx.maxFeePerGas
      delete baseTx.maxPriorityFeePerGas
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
