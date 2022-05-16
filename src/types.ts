import { KMS } from 'aws-sdk'
import Common, { CommonOpts } from '@ethereumjs/common'

export type SignParams = {
  keyId: KMS.SignRequest['KeyId']
  message: Buffer
  kmsInstance: KMS
}

export type GetEthAddressFromKMSparams = {
  keyId: KMS.SignRequest['KeyId']
  kmsInstance: KMS
}

export type GetPublicKeyParams = {
  keyId: KMS.SignRequest['KeyId']
  kmsInstance: KMS
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
  providerOrUrl: string
  shareNonce?: boolean
  pollingInterval?: number
  chainSettings?: ChainSettings
  kmsInstance?: KMS
}
