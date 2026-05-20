import * as asn1 from 'asn1.js'
import { recoverAddress, computeAddress, Signature, hexlify } from 'ethers'

import { sign } from './kms'
import { CreateSignatureParams, SignParams } from './types'

const SECP256K1_N = BigInt(
  '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
)

const SECP256K1_HALF_N = SECP256K1_N / BigInt(2)

const toCanonicalS = (s: bigint): bigint => {
  return s > SECP256K1_HALF_N ? SECP256K1_N - s : s
}

const toPaddedHex = (value: bigint): string => {
  return `0x${value.toString(16).padStart(64, '0')}`
}

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
  const s = toCanonicalS(BigInt(`0x${decoded.s.toString('hex')}`))

  return {
    r: toPaddedHex(r),
    s: toPaddedHex(s)
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

const readDerInteger = (
  bytes: Uint8Array,
  offset: number
): { value: Uint8Array; offset: number } => {
  //
  // INTEGER tag
  //
  if (bytes[offset++] !== 0x02) {
    throw new Error('invalid DER integer')
  }

  const length = bytes[offset++]

  let value = bytes.slice(offset, offset + length)

  //
  // DER INTEGER is signed, so positive numbers
  // sometimes contain leading 0x00.
  //
  if (value[0] === 0x00) {
    value = value.slice(1)
  }

  return {
    value,
    offset: offset + length
  }
}

export const parseKmsDerSignature = (derSignature: Uint8Array): Signature => {
  let offset = 0

  //
  // SEQUENCE tag
  //
  if (derSignature[offset++] !== 0x30) {
    throw new Error('invalid DER sequence')
  }

  //
  // sequence length
  //
  offset++

  const rResult = readDerInteger(derSignature, offset)

  const sResult = readDerInteger(derSignature, rResult.offset)

  const r = BigInt(hexlify(rResult.value))
  const s = toCanonicalS(BigInt(hexlify(sResult.value)))

  return Signature.from({
    r: toPaddedHex(r),
    s: toPaddedHex(s),
    v: 27
  })
}

export const withRecoveryBit = (
  digest: string,
  sig: Signature,
  expectedAddress: string
): Signature => {
  for (const yParity of [0, 1]) {
    const candidate = Signature.from({
      r: sig.r,
      s: sig.s,
      yParity: yParity as 0 | 1
    })

    const recovered = recoverAddress(digest, candidate)

    if (recovered.toLowerCase() === expectedAddress.toLowerCase()) {
      return candidate
    }
  }

  throw new Error('cannot determine recovery bit')
}
