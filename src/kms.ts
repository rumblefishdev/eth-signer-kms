import { getBytes } from 'ethers'

import {
  SignCommand,
  SignCommandOutput,
  GetPublicKeyCommand,
  GetPublicKeyCommandOutput
} from '@aws-sdk/client-kms'

import {
  SignParams,
  GetPublicKeyParams,
  GetEthAddressFromKMSparams
} from './types'
import { getEthAddressFromPublicKey } from './eth'

export const getPublicKey = (
  getPublicKeyParams: GetPublicKeyParams
): Promise<GetPublicKeyCommandOutput> => {
  const { keyId, kmsInstance } = getPublicKeyParams
  const command = new GetPublicKeyCommand({ KeyId: keyId })

  return kmsInstance.send(command)
}
export const getEthAddressFromKMS = async (
  getEthAddressFromKMSparams: GetEthAddressFromKMSparams
): Promise<string> => {
  const { keyId, kmsInstance } = getEthAddressFromKMSparams
  const KMSKey = await getPublicKey({ keyId, kmsInstance })

  return getEthAddressFromPublicKey(KMSKey.PublicKey)
}

export const sign = async (
  signParams: SignParams
): Promise<SignCommandOutput> => {
  const { keyId, message, kmsInstance } = signParams
  const formatted = Buffer.from(getBytes(message))

  const command = new SignCommand({
    KeyId: keyId,
    Message: formatted,
    SigningAlgorithm: 'ECDSA_SHA_256',
    MessageType: 'DIGEST'
  })

  return kmsInstance.send(command)
}
