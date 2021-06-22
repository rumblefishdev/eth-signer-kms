import { KMS } from 'aws-sdk'

export type SignParams = Pick<KMS.SignRequest, 'KeyId' | 'Message'>

export const kms = new KMS()

export const getPublicKey = async (KeyId: KMS.GetPublicKeyRequest['KeyId']) =>
  kms.getPublicKey({ KeyId }).promise()

export const sign = async ({ KeyId, Message }: SignParams) => {
  return await kms
    .sign({
      KeyId,
      Message,
      SigningAlgorithm: 'ECDSA_SHA-256',
      MessageType: 'DIGEST'
    })
    .promise()
}
