import { KMSClient } from '@aws-sdk/client-kms'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider, TransactionRequest } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { Bytes } from "@ethersproject/bytes"
import { keccak256 } from '@ethersproject/keccak256'
import { arrayify, hexlify, joinSignature } from "@ethersproject/bytes";
import { hashMessage, _TypedDataEncoder } from '@ethersproject/hash'
import { UnsignedTransaction, serialize as serializeTransaction } from "@ethersproject/transactions";

import { createSignature } from './eth'
import { getEthAddressFromKMS } from './kms'
import {
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer'

export class KMSSigner extends Signer implements TypedDataSigner {
  private address: string

  constructor(
    public provider: Provider,
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

  async signMessage(message: Bytes | string): Promise<string> {
    const messageBuffer = Buffer.from(hexlify(message).slice(2), 'hex')
    let hash = hashMessage(messageBuffer)
    if (!hash.startsWith('0x')) hash = `0x${hash}`

    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
      address: await this.getAddress()
    })

    return joinSignature(sig)
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

    return joinSignature(sig)
  }

  async signTransaction(
    tx: TransactionRequest
  ): Promise<string> {

    const baseTx: UnsignedTransaction = {
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

    const unsignedTx = serializeTransaction(baseTx)
    const hash = keccak256(arrayify(unsignedTx))

    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
      address: await this.getAddress()
    })

    const result = serializeTransaction(baseTx, sig)
    return result
  }

  connect(provider: Provider): Signer {
    return new KMSSigner(provider, this.keyId, this.kmsInstance)
  }
}
