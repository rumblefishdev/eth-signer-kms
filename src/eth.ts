import * as asn1 from 'asn1.js'

import { recoverAddress, computeAddress } from "ethers"
import { sign } from './kms'
import { CreateSignatureParams, SignParams } from './types'


const EcdsaSigAsnParse = asn1.define('EcdsaSig', function (this: any) {
  this.seq().obj(this.key('r').int(), this.key('s').int())
})

const EcdsaPubKey = asn1.define('EcdsaPubKey', function (this: any) {
  this.seq().obj(
    this.key('algo').seq().obj(this.key('a').objid(), this.key('b').objid()),
    this.key('pubKey').bitstr()
  )
})

const getRS = async (signParams: SignParams) => {
  const signature = await sign(signParams)

  if (signature.Signature == undefined) {
    throw new Error('Signature is undefined.')
  }

  const decoded = EcdsaSigAsnParse.decode(
    Buffer.from(signature.Signature),
    'der'
  )

  const r = BigInt(`0x${decoded.r.toString('hex')}`)
  let s = BigInt(`0x${decoded.s.toString('hex')}`)

  const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
  const secp256k1halfN = secp256k1N / BigInt(2)

  if (s > secp256k1halfN) {
    s = secp256k1N - s
  }

  return {
    r: `0x${r.toString(16)}`,
    s: `0x${s.toString(16)}`
  }
}

const getRecoveryParam = (
  msg: string,
  r: string,
  s: string,
  expectedEthAddr: string
) => {
  const formatted = msg
  let recoveryParam: number
  for (recoveryParam = 0; recoveryParam <= 1; recoveryParam++) {
    const address = recoverAddress(formatted, {
      r,
      s,
      v: recoveryParam
    }).toLowerCase()
    if (address !== expectedEthAddr.toLowerCase()) {
      continue
    }
    return recoveryParam
  }
  throw new Error('Failed to calculate recovery param')
}

export const getEthAddressFromPublicKey = (publicKey: Uint8Array): string => {
  const res = EcdsaPubKey.decode(Buffer.from(publicKey))

  const pubKeyBuffer: Buffer = res.pubKey.data

  const address = computeAddress(`0x${pubKeyBuffer.toString('hex')}`)
  return address
}

export const createSignature = async ({
  keyId,
  message,
  address,
  kmsInstance
}: CreateSignatureParams) => {
  const { r, s } = await getRS({ keyId, message, kmsInstance })
  const recoveryParam = getRecoveryParam(message, r, s, address)

  return {
    r: r,
    s: s,
    v: recoveryParam
  }
}
