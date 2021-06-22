import ProviderEngine from 'web3-provider-engine'
import FiltersSubprovider from 'web3-provider-engine/subproviders/filters'
import NonceSubProvider from 'web3-provider-engine/subproviders/nonce-tracker'
import HookedSubprovider from 'web3-provider-engine/subproviders/hooked-wallet'
import ProviderSubprovider from 'web3-provider-engine/subproviders/provider'
import RpcProvider from 'web3-provider-engine/subproviders/rpc'
import WebsocketProvider from 'web3-provider-engine/subproviders/websocket'

import HDWalletProvider from '@truffle/hdwallet-provider'
import {
  ChainId,
  Hardfork
} from '@truffle/hdwallet-provider/dist/constructor/types'
import { CommonOptions } from '@truffle/hdwallet-provider/dist/constructor/Constructor'

import { URL } from 'url'
import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from 'ethereum-protocol'
import ethJSWallet from 'ethereumjs-wallet'
import { KeyIdType } from 'aws-sdk/clients/kms'

type KMSProviderConstructor = Pick<
  CommonOptions,
  | 'shareNonce'
  | 'providerOrUrl'
  | 'pollingInterval'
  | 'chainId'
  | 'chainSettings'
> & {
  keyId: KeyIdType
}

const singletonNonceSubProvider = new NonceSubProvider()

class KMSProvider {
  private KeyId: KeyIdType
  private wallets: { [address: string]: ethJSWallet }
  private addresses: string[]
  private chainId?: ChainId
  private initialized: Promise<void>
  private hardfork: Hardfork
  public engine: ProviderEngine

  constructor({
    keyId,
    providerOrUrl,
    shareNonce,
    pollingInterval,
    chainId,
    chainSettings
  }: KMSProviderConstructor) {
    // Init
    this.wallets = {}
    this.addresses = []
    this.engine = new ProviderEngine({
      pollingInterval
    })

    // Validation
    if (!HDWalletProvider.isValidProvider(providerOrUrl)) {
      throw new Error(
        [
          `Malformed provider URL: '${providerOrUrl}'`,
          'Please specify a correct URL, using the http, https, ws, or wss protocol.',
          ''
        ].join('\n')
      )
    }

    // TODO: Obtain address from KMS!

    const tmpAccounts = this.addresses
    const tmpWallets = this.wallets

    // ChainID
    if (
      typeof chainId !== 'undefined' ||
      (chainSettings && typeof chainSettings.chainId !== 'undefined')
    ) {
      this.chainId = chainId || chainSettings.chainId
      this.initialized = Promise.resolve()
    } else {
      this.initialized = this.initialize()
    }

    this.hardfork =
      chainSettings && chainSettings.hardfork
        ? chainSettings.hardfork
        : 'istanbul'

    // Nonce
    !shareNonce
      ? this.engine.addProvider(new NonceSubProvider())
      : this.engine.addProvider(singletonNonceSubProvider)

    this.engine.addProvider(new FiltersSubprovider())

    // Provider protocol
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

    // Required by the provider engine.
    this.engine.start((err: any) => {
      if (err) throw err
    })
  }
  // End of constructor

  private initialize(): Promise<void> {
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
    this.initialized.then(() => {
      this.engine.send(payload, callback)
    })
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback
  ): void {
    this.initialized.then(() => {
      this.engine.sendAsync(payload, callback)
    })
  }
}

export = KMSProvider
