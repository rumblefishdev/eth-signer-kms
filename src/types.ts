import { KMS } from 'aws-sdk'

export type SignParams = {
  keyId: KMS.SignRequest['KeyId']
  message: Buffer
}

export type CreateSignatureParams = SignParams & {
  address: string
}
