import { KMS } from 'aws-sdk'

export type SignParams = {
  keyId: KMS.SignRequest['KeyId']
  message: string
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
}
