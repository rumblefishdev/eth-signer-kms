import { KMS } from 'aws-sdk'
import { SignParams } from './types'

export const kms = new KMS()

export const getPublicKey = (KeyId: KMS.GetPublicKeyRequest['KeyId']) =>
  kms.getPublicKey({ KeyId }).promise()

export const sign = ({ keyId, message }: SignParams) => {
  return kms
    .sign({
      KeyId: keyId,
      Message: message,
      SigningAlgorithm: 'ECDSA_SHA_256',
      MessageType: 'DIGEST'
    })
    .promise()
}
