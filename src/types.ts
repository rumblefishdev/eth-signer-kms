import { KMS } from 'aws-sdk'

export type SignParams = {
  keyId: KMS.SignRequest['KeyId']
  message: Buffer
}

export type CreateSignatureParams = SignParams & {
  address: string
}

export type ChainSettings = {
  hardfork?: string
  chainId?: number
}

export type KMSProviderConstructor = {
  keyId: KMS.KeyIdType
  providerOrUrl: string
  shareNonce?: boolean
  pollingInterval?: number
  chainId?: number
  chainSettings?: ChainSettings
}
