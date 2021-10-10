import ProviderEngine from 'web3-provider-engine'
import FiltersSubprovider from 'web3-provider-engine/subproviders/filters'
import HookedSubprovider from 'web3-provider-engine/subproviders/hooked-wallet'
import ProviderSubprovider from 'web3-provider-engine/subproviders/provider'
import RpcProvider from 'web3-provider-engine/subproviders/rpc'
import WebsocketProvider from 'web3-provider-engine/subproviders/websocket'

import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from 'ethereum-protocol'
import Common from '@ethereumjs/common'
import * as EthUtil from 'ethereumjs-util'
import { TransactionFactory } from '@ethereumjs/tx'

import { URL } from 'url'
import { KeyIdType } from 'aws-sdk/clients/kms'

import { createSignature } from './eth'
import { getEthAddressFromKMS } from './kms'
import { KMSProviderConstructor } from './types'

export class KMSProvider {
  private keyId: KeyIdType
  private address: string
  private chainId: number
  private accessKeyId: string
  private secretAccessKey: string
  private region: string
  private initializedChainId: Promise<void>
  private initializedAddress: Promise<void>
  public engine: ProviderEngine

  constructor({
    keyId,
    providerOrUrl,
    accessKeyId,
    secretAccessKey,
    region,
    pollingInterval = 4000,
    chainSettings = {}
  }: KMSProviderConstructor) {
    this.keyId = keyId
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.region = region
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

    if (chainSettings.chain) {
      this.initializedChainId = Promise.resolve()
    } else {
      this.initializedChainId = this.initializeChainId()
    }

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

          txParams.gasLimit = txParams.gas
          delete txParams.gas

          const txOptions = new Common({
            ...chainSettings,
            chain: chainSettings.chain || self.chainId
          })

          const tx = TransactionFactory.fromTxData(txParams, {
            common: txOptions
          })

          const txSignature = await createSignature(
            {
              keyId: self.keyId,
              message: tx.getMessageToSign(),
              address: self.address,
              txOpts: txOptions
            },
            self.accessKeyId,
            self.secretAccessKey,
            self.region
          )

          const signedTx = TransactionFactory.fromTxData(
            {
              ...txParams,
              ...txSignature
            },
            {
              common: txOptions
            }
          )

          const rawTx = `0x${signedTx.serialize().toString('hex')}`

          if (cb) {
            cb(null, rawTx)
          } else {
            return rawTx
          }
        },
        // Uses pre EIP 155 v calculation
        async signMessage({ data, from }: any, cb: any) {
          await self.initializedAddress
          await self.initializedChainId

          if (!data) {
            cb('No data to sign')
          }
          if (self.address !== from) {
            cb('Account not found')
          }

          const dataBuff = EthUtil.toBuffer(data)
          const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff)

          const { r, s, v } = await createSignature(
            {
              keyId: self.keyId,
              message: msgHashBuff,
              address: self.address
            },
            self.accessKeyId,
            self.secretAccessKey,
            self.region
          )

          const rpcSig = EthUtil.toRpcSig(v.toNumber(), r, s)

          cb(null, rpcSig)
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args)
        },
        signTypedMessage(...args: any[]) {
          this.signMessage(...args)
        }
      })
    )

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
        this.address = await getEthAddressFromKMS(
          this.keyId,
          this.accessKeyId,
          this.secretAccessKey,
          this.region
        )
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
