import { KMS, AWSError } from 'aws-sdk'
import { SignParams, PromiseResult } from './types'
import { getEthAddressFromPublicKey } from './eth'

export const kms = (
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): KMS => {
  return new KMS({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region,
    apiVersion: 'latest'
  })
}

export const getPublicKey = (
  KeyId: KMS.GetPublicKeyRequest['KeyId'],
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<PromiseResult<KMS.GetPublicKeyResponse, AWSError>> =>
  kms(accessKeyId, secretAccessKey, region).getPublicKey({ KeyId }).promise()

export const getEthAddressFromKMS = async (
  keyId: KMS.GetPublicKeyRequest['KeyId'],
  accessKeyId: string,
  secretAccessKey: string,
  region: string
) => {
  const KMSKey = await getPublicKey(keyId, accessKeyId, secretAccessKey, region)

  return getEthAddressFromPublicKey(KMSKey.PublicKey)
}

export const sign = (
  signParams: SignParams,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<PromiseResult<KMS.SignResponse, AWSError>> => {
  const { keyId, message } = signParams

  return kms(accessKeyId, secretAccessKey, region)
    .sign({
      KeyId: keyId,
      Message: message,
      SigningAlgorithm: 'ECDSA_SHA_256',
      MessageType: 'DIGEST'
    })
    .promise()
}
