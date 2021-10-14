import { KMS, Response } from 'aws-sdk'
import Common, { CommonOpts } from '@ethereumjs/common'

export type SignParams = {
  keyId: KMS.SignRequest['KeyId']
  message: Buffer
}

export type CreateSignatureParams = SignParams & {
  address: string
  txOpts?: Common
}

export type ChainSettings = Omit<CommonOpts, 'chain'> & {
  chain?: CommonOpts['chain']
}

export type KMSProviderConstructor = {
  keyId: KMS.KeyIdType
  accessKeyId: string
  secretAccessKey: string
  region: string
  providerOrUrl: string
  shareNonce?: boolean
  pollingInterval?: number
  chainSettings?: ChainSettings
}

export type PromiseResult<D, E> = D & { $response: Response<D, E> }
