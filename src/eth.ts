import { KMS } from 'aws-sdk'
import * as asn1 from 'asn1.js'
import { keccak256 } from 'js-sha3'
import { BN } from 'ethereumjs-util'
import * as EthUtil from 'ethereumjs-util'
import Common from 'ethereumjs-common'
import { TransactionOptions } from 'ethereumjs-tx'

import { sign } from './kms'
import { ChainSettings, CreateSignatureParams, SignParams } from './types'

const KNOWN_CHAIN_IDS = new Set([1, 3, 4, 5, 42])

const EcdsaSigAsnParse = asn1.define('EcdsaSig', function (this: any) {
  this.seq().obj(this.key('r').int(), this.key('s').int())
})

const EcdsaPubKey = asn1.define('EcdsaPubKey', function (this: any) {
  this.seq().obj(
    this.key('algo').seq().obj(this.key('a').objid(), this.key('b').objid()),
    this.key('pubKey').bitstr()
  )
})

const recoverPubKeyFromSig = (msg: Buffer, r: BN, s: BN, v: number) => {
  const rBuffer = r.toBuffer()
  const sBuffer = s.toBuffer()
  const pubKey = EthUtil.ecrecover(msg, v, rBuffer, sBuffer)
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

const getV = (msg: Buffer, r: BN, s: BN, expectedEthAddr: string) => {
  let v = 27
  let pubKey = recoverPubKeyFromSig(msg, r, s, v)
  if (pubKey != expectedEthAddr) {
    v = 28
    pubKey = recoverPubKeyFromSig(msg, r, s, v)
  }

  return v
}

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

export const createSignature = async ({
  keyId,
  message,
  address
}: CreateSignatureParams) => {
  const { r, s } = await getRS({ keyId, message })
  const v = getV(message, r, s, address)

  return {
    r: r.toBuffer(),
    s: s.toBuffer(),
    v: v
  }
}

export const createTxOptions = ({ chainId, hardfork }: ChainSettings) => {
  const chain = chainId
  let txOptions: TransactionOptions

  if (typeof chain !== 'undefined' && KNOWN_CHAIN_IDS.has(chain)) {
    txOptions = { chain }
  } else if (typeof chain !== 'undefined') {
    const common = Common.forCustomChain(
      1,
      {
        name: 'custom chain',
        chainId: chain
      },
      hardfork
    )
    txOptions = { common }
  }
  return txOptions
}
