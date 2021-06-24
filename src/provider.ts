import ProviderEngine from 'web3-provider-engine'
import FiltersSubprovider from 'web3-provider-engine/subproviders/filters'
import NonceSubProvider from 'web3-provider-engine/subproviders/nonce-tracker'
import HookedSubprovider from 'web3-provider-engine/subproviders/hooked-wallet'
import ProviderSubprovider from 'web3-provider-engine/subproviders/provider'
import RpcProvider from 'web3-provider-engine/subproviders/rpc'
import WebsocketProvider from 'web3-provider-engine/subproviders/websocket'

import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from 'ethereum-protocol'
import { BN } from 'ethereumjs-util'
import * as EthUtil from 'ethereumjs-util'
import { Transaction, TxData } from 'ethereumjs-tx'

import { URL } from 'url'
import { KeyIdType } from 'aws-sdk/clients/kms'

import { getPublicKey } from './kms'
import { KMSProviderConstructor } from './types'
import { createTxOptions, getEthereumAddress, createSignature } from './eth'

const singletonNonceSubProvider = new NonceSubProvider()

class KMSProvider {
  private keyId: KeyIdType
  private address: string
  private addressHash: Buffer
  private chainId?: number
  private initializedChainId: Promise<void>
  private initializedAddress: Promise<void>
  private hardfork: string

  public engine: ProviderEngine

  constructor({
    keyId,
    providerOrUrl,
    shareNonce = true,
    pollingInterval = 4000,
    chainId,
    chainSettings = {}
  }: KMSProviderConstructor) {
    this.keyId = keyId
    this.engine = new ProviderEngine({
      pollingInterval
    })

    if (!KMSProvider.isValidProvider(providerOrUrl)) {
      throw new Error(
        [
          `Malformed provider URL: '${providerOrUrl}'`,
          'Please specify a correct URL, using the http, https, ws, or wss protocol.',
          ''
        ].join('\n')
      )
    }

    this.initializedAddress = this.initializeAddress()

    if (
      typeof chainId !== 'undefined' ||
      (chainSettings && typeof chainSettings.chainId !== 'undefined')
    ) {
      this.chainId = chainId || chainSettings.chainId
      this.initializedChainId = Promise.resolve()
    } else {
      this.initializedChainId = this.initializeChainId()
    }
    this.hardfork =
      chainSettings && chainSettings.hardfork
        ? chainSettings.hardfork
        : 'istanbul'

    const self = this

    this.engine.addProvider(
      new HookedSubprovider({
        async getAccounts(cb: any) {
          await self.initializedAddress
          cb(null, [self.address])
        },
        async signTransaction(txParams: any, cb: any) {
          await self.initializedAddress
          await self.initializedChainId

          const ethAddressSignature = await createSignature({
            keyId: self.keyId,
            message: self.addressHash,
            address: self.address
          })

          const signedTxParams: TxData = {
            ...txParams,
            ...ethAddressSignature
          }

          const txOptions = createTxOptions({
            chainId: self.chainId,
            hardfork: self.hardfork
          })

          const tx = new Transaction(signedTxParams, txOptions)

          const txHash = tx.hash(false)

          const txSignature = await createSignature({
            keyId: self.keyId,
            message: txHash,
            address: self.address
          })

          tx.r = txSignature.r
          tx.s = txSignature.s
          tx.v = new BN(txSignature.v).toBuffer()

          const rawTx = `0x${tx.serialize().toString('hex')}`

          if (cb) {
            cb(null, rawTx)
          } else {
            return rawTx
          }
        },

        async signMessage({ data, from }: any, cb: any) {
          await self.initializedAddress

          if (!data) {
            cb('No data to sign')
          }
          if (self.address !== from) {
            cb('Account not found')
          }

          const dataBuff = EthUtil.toBuffer(data)
          const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff)

          const { r, s, v } = await createSignature({
            keyId: self.keyId,
            message: msgHashBuff,
            address: self.address
          })
          const rpcSig = EthUtil.toRpcSig(v, r, s)

          cb(null, rpcSig)
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args)
        }
      })
    )

    !shareNonce
      ? this.engine.addProvider(new NonceSubProvider())
      : this.engine.addProvider(singletonNonceSubProvider)

    this.engine.addProvider(new FiltersSubprovider())

    if (typeof providerOrUrl === 'string') {
      const url = providerOrUrl

      const providerProtocol = (new URL(url).protocol || 'http:').toLowerCase()

      switch (providerProtocol) {
        case 'ws:':
        case 'wss:':
          this.engine.addProvider(new WebsocketProvider({ rpcUrl: url }))
          break
        default:
          this.engine.addProvider(new RpcProvider({ rpcUrl: url }))
      }
    } else {
      const provider = providerOrUrl
      this.engine.addProvider(new ProviderSubprovider(provider))
    }

    this.engine.start((err: any) => {
      if (err) throw err
    })
  }

  private async initializeAddress(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const KMSKey = await getPublicKey(this.keyId)
        this.address = getEthereumAddress(KMSKey.PublicKey)
        this.addressHash = EthUtil.keccak(Buffer.from(this.address))

        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  private initializeChainId(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.engine.sendAsync(
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_chainId',
          params: []
        },
        (error: any, response: JSONRPCResponsePayload & { error?: any }) => {
          if (error) {
            reject(error)
            return
          } else if (response.error) {
            reject(response.error)
            return
          }
          if (isNaN(parseInt(response.result, 16))) {
            const message =
              'When requesting the chain id from the node, it' +
              `returned the malformed result ${response.result}.`
            throw new Error(message)
          }
          this.chainId = parseInt(response.result, 16)
          resolve()
        }
      )
    })
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback
  ): void {
    Promise.all([this.initializedChainId, this.initializedAddress]).then(() => {
      this.engine.sendAsync(payload, callback)
    })
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback
  ): void {
    Promise.all([this.initializedChainId, this.initializedAddress]).then(() => {
      this.engine.sendAsync(payload, callback)
    })
  }

  public async getAddress(): Promise<string> {
    await this.initializedAddress
    return this.address
  }

  public static isValidProvider(provider: string | any): boolean {
    const validProtocols = ['http:', 'https:', 'ws:', 'wss:']

    if (typeof provider === 'string') {
      const url = new URL(provider.toLowerCase())
      return !!validProtocols.includes(url.protocol || '')
    }

    return true
  }
}

export = KMSProvider
