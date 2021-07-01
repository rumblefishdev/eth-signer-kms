import { KMS } from 'aws-sdk'
import { SignParams } from './types'
import { getEthAddressFromPublicKey } from './eth'

export const kms = new KMS()

const AWSTimeout = <T extends any>(promise: T, ms?: number): T => {
  if (ms) {
    const timeout = new Promise(() => {
      const id = setTimeout(() => {
        clearTimeout(id)
        throw new Error(
          'AWS KMS request failed. Did you set AWS credentials/region config?'
        )
      }, ms)
    })

    return Promise.race([timeout, promise]) as T
  } else {
    return promise
  }
}

export const getPublicKey = (
  KeyId: KMS.GetPublicKeyRequest['KeyId'],
  awsTimeout?: number
) => AWSTimeout(kms.getPublicKey({ KeyId }).promise(), awsTimeout)

export const getEthAddressFromKMS = async (
  keyId: KMS.GetPublicKeyRequest['KeyId'],
  awsTimeout?: number
) => {
  const KMSKey = await getPublicKey(keyId, awsTimeout)

  return getEthAddressFromPublicKey(KMSKey.PublicKey)
}

export const sign = (signParams: SignParams) => {
  const { keyId, message } = signParams

  return kms
    .sign({
      KeyId: keyId,
      Message: message,
      SigningAlgorithm: 'ECDSA_SHA_256',
      MessageType: 'DIGEST'
    })
    .promise()
}
