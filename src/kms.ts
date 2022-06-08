import {
  SignParams,
  GetEthAddressFromKMSparams,
  GetPublicKeyParams
} from './types'
import { getEthAddressFromPublicKey } from './eth'
import { utils } from 'ethers'

export const getPublicKey = (getPublicKeyParams: GetPublicKeyParams) => {
  const { keyId, kmsInstance } = getPublicKeyParams
  return kmsInstance.getPublicKey({ KeyId: keyId }).promise()
}
export const getEthAddressFromKMS = async (
  getEthAddressFromKMSparams: GetEthAddressFromKMSparams
) => {
  const { keyId, kmsInstance } = getEthAddressFromKMSparams
  const KMSKey = await getPublicKey({ keyId, kmsInstance })

  return getEthAddressFromPublicKey(KMSKey.PublicKey)
}

export const sign = (signParams: SignParams) => {
  const { keyId, message, kmsInstance } = signParams
  const formatted = Buffer.from(utils.arrayify(message))
  return kmsInstance
    .sign({
      KeyId: keyId,
      Message: formatted,
      SigningAlgorithm: 'ECDSA_SHA_256',
      MessageType: 'DIGEST'
    })
    .promise()
}
