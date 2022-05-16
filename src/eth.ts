import { KMS } from 'aws-sdk'
import * as asn1 from 'asn1.js'
import { keccak256 } from 'js-sha3'
import { BN } from 'ethereumjs-util'
import * as EthUtil from 'ethereumjs-util'

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

export const recoverPubKeyFromSig = (
  msg: Buffer,
  r: BN,
  s: BN,
  v: number,
  chainId?: number | undefined
) => {
  const rBuffer = r.toBuffer()
  const sBuffer = s.toBuffer()
  const pubKey = EthUtil.ecrecover(msg, v, rBuffer, sBuffer, chainId)
  const addrBuf = EthUtil.pubToAddress(pubKey)
  const RecoveredEthAddr = EthUtil.bufferToHex(addrBuf)

  return RecoveredEthAddr
}

const getRS = async (signParams: SignParams) => {
  const signature = await sign(signParams)

  if (signature.Signature == undefined) {
    throw new Error('Signature is undefined.')
  }

  const decoded = EcdsaSigAsnParse.decode(signature.Signature, 'der')
  const r: BN = decoded.r
  let s: BN = decoded.s

  const secp256k1N = new BN(
    'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
    16
  )
  const secp256k1halfN = secp256k1N.div(new BN(2))

  if (s.gt(secp256k1halfN)) {
    s = secp256k1N.sub(s)
    return { r, s }
  }

  return { r, s }
}

const getV = (
  msg: Buffer,
  r: EthUtil.BN,
  s: EthUtil.BN,
  expectedEthAddr: string
) => {
  let v = 27;
  let pubKey = recoverPubKeyFromSig(msg, r, s, v);
  if (pubKey !== expectedEthAddr) {
    v = 28;
    pubKey = recoverPubKeyFromSig(msg, r, s, v);
  }
  return new EthUtil.BN(v - 27);
};

export const getEthAddressFromPublicKey = (
  publicKey: KMS.PublicKeyType
): string => {
  const res = EcdsaPubKey.decode(publicKey, 'der')
  let pubKeyBuffer: Buffer = res.pubKey.data

  pubKeyBuffer = pubKeyBuffer.slice(1, pubKeyBuffer.length)

  const address = keccak256(pubKeyBuffer)
  const buf2 = Buffer.from(address, 'hex')
  const EthAddr = '0x' + buf2.slice(-20).toString('hex')

  return EthAddr
}

export const createSignature = async (sigParams: CreateSignatureParams) => {
  const { keyId, message, address, txOpts, kmsInstance } = sigParams

  const { r, s } = await getRS({ keyId, message, kmsInstance })
  let v = getV(message, r, s, address)

  // unsignedTxImplementsEIP155
  if (txOpts && txOpts.gteHardfork('spuriousDragon') && !txOpts.gteHardfork('london')) {
    v = v.iadd(txOpts.chainIdBN().muln(2).addn(8))
  }

  return {
    r: r.toBuffer(),
    s: s.toBuffer(),
    v: v
  }
}
