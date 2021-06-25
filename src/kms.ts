import { KMS } from 'aws-sdk'
import { SignParams } from './types'
import { getEthAddressFromPublicKey } from './eth'

export const kms = new KMS()

export const getPublicKey = (KeyId: KMS.GetPublicKeyRequest['KeyId']) =>
  kms.getPublicKey({ KeyId }).promise()

export const getEthAddressFromKMS = async (
  keyId: KMS.GetPublicKeyRequest['KeyId']
) => {
  const KMSKey = await getPublicKey(keyId)
  return getEthAddressFromPublicKey(KMSKey.PublicKey)
}

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
