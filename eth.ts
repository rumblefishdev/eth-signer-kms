import BN from 'bn.js'
import { KMS } from 'aws-sdk'
import * as asn1 from 'asn1.js'
import { keccak256 } from 'js-sha3'
import * as EthUtil from 'ethereumjs-util'

import { sign, SignParams } from './kms'

const EcdsaSigAsnParse = asn1.define('EcdsaSig', function (this: any) {
  this.seq().obj(this.key('r').int(), this.key('s').int())
})

const EcdsaPubKey = asn1.define('EcdsaPubKey', function (this: any) {
  this.seq().obj(
    this.key('algo').seq().obj(this.key('a').objid(), this.key('b').objid()),
    this.key('pubKey').bitstr()
  )
})

export const getEthereumAddress = (publicKey: KMS.PublicKeyType): string => {
  const res = EcdsaPubKey.decode(publicKey, 'der')
  let pubKeyBuffer: Buffer = res.pubKey.data

  pubKeyBuffer = pubKeyBuffer.slice(1, pubKeyBuffer.length)

  const address = keccak256(pubKeyBuffer)
  const buf2 = Buffer.from(address, 'hex')
  const EthAddr = '0x' + buf2.slice(-20).toString('hex')

  return EthAddr
}

const findEthereumSig = async (signParams: SignParams) => {
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

const recoverPubKeyFromSig = (msg: Buffer, r: BN, s: BN, v: number) => {
  const rBuffer = r.toBuffer()
  const sBuffer = s.toBuffer()
  const pubKey = EthUtil.ecrecover(msg, v, rBuffer, sBuffer)
  const addrBuf = EthUtil.pubToAddress(pubKey)
  const RecoveredEthAddr = EthUtil.bufferToHex(addrBuf)

  return RecoveredEthAddr
}

const findRightKey = (msg: Buffer, r: BN, s: BN, expectedEthAddr: string) => {
  let v = 27
  let pubKey = recoverPubKeyFromSig(msg, r, s, v)
  if (pubKey != expectedEthAddr) {
    v = 28
    pubKey = recoverPubKeyFromSig(msg, r, s, v)
  }

  return { pubKey, v }
}
