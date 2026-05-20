import {
  Signature,
  TransactionRequest,
  toUtf8Bytes,
  TypedDataDomain,
  TypedDataField,
  JsonRpcApiProvider,
  hashMessage,
  TypedDataEncoder,
  Transaction,
  copyRequest,
  resolveProperties,
  resolveAddress,
  assertArgument,
  getAddress,
  TransactionLike,
  AbstractSigner,
  assert,
  Provider,
  Authorization,
  AuthorizationRequest,
  encodeRlp,
  toBeHex,
  concat,
  keccak256
} from 'ethers'

import { KMSClient } from '@aws-sdk/client-kms'

import { getEthAddressFromKMS, sign } from './kms'
import { createSignature, parseKmsDerSignature, withRecoveryBit } from './eth'

export class KMSSigner extends AbstractSigner<JsonRpcApiProvider> {
  static async create(
    provider: JsonRpcApiProvider,
    keyId: string,
    kmsInstance: KMSClient
  ) {
    const address = await getEthAddressFromKMS({
      keyId: keyId,
      kmsInstance: kmsInstance
    })
    return new KMSSigner(provider, address, keyId, kmsInstance)
  }

  constructor(
    provider: JsonRpcApiProvider,
    public address: string,
    public keyId: string,
    private kmsInstance: KMSClient
  ) {
    super(provider)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  connect(_provider: null | Provider): KMSSigner {
    assert(false, 'cannot reconnect JsonRpcSigner', 'UNSUPPORTED_OPERATION', {
      operation: 'signer.connect'
    })
  }

  async getAddress(): Promise<string> {
    return this.address
  }

  async signMessage(_message: string | Uint8Array): Promise<string> {
    const message =
      typeof _message === 'string' ? toUtf8Bytes(_message) : _message
    const hash = hashMessage(message)

    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
      address: await this.getAddress()
    })

    return Signature.from(sig).serialized
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const hash = TypedDataEncoder.hash(domain, types, value)
    const sig = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: hash,
      address: await this.getAddress()
    })

    return Signature.from(sig).serialized
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    tx = copyRequest(tx)

    // Replace any Addressable or ENS name with an address
    const { to, from } = await resolveProperties({
      to: tx.to ? resolveAddress(tx.to, this) : undefined,
      from: tx.from ? resolveAddress(tx.from, this) : undefined
    })

    if (to != null) {
      tx.to = to
    }
    if (from != null) {
      tx.from = from
    }

    if (tx.from != null) {
      assertArgument(
        getAddress(<string>tx.from) === this.address,
        'transaction from address mismatch',
        'tx.from',
        tx.from
      )
      delete tx.from
    }

    // Build the transaction
    const btx = Transaction.from(<TransactionLike<string>>tx)
    btx.signature = await createSignature({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: btx.unsignedHash,
      address: await this.getAddress()
    })

    return btx.serialized
  }

  public async authorize(
    authorization: AuthorizationRequest
  ): Promise<Authorization> {
    const provider = this.provider
    if (!provider) {
      throw new Error('missing provider')
    }

    const chainId = (await provider.getNetwork()).chainId

    const resolved = await resolveProperties({
      address: authorization.address.toString(),
      nonce: BigInt(authorization.nonce!),
      chainId: chainId
    })

    const encoded = encodeRlp([
      toBeHex(resolved.chainId),
      resolved.address,
      toBeHex(resolved.nonce)
    ])

    const digest = keccak256(concat(['0x05', encoded]))

    const derSignature = await sign({
      kmsInstance: this.kmsInstance,
      keyId: this.keyId,
      message: digest
    })
    if (derSignature.Signature == undefined) {
      throw new Error('missing signature')
    }
    let sig = parseKmsDerSignature(derSignature.Signature)

    sig = Signature.from(sig)

    sig = withRecoveryBit(digest, sig, await this.getAddress())

    return {
      ...resolved,
      signature: sig
    }
  }
}
