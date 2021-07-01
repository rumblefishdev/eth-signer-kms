import { config } from 'dotenv'
import { ethers } from 'ethers'
import { KMSProvider } from '../../src'
import { KMSToken__factory } from './types/ethers-contracts'

config()

const getSigner = async () => {
  try {
    console.log('Initiating KMSProvider...')
    const kmsProvider = new KMSProvider({
      keyId: process.env.KEYID,
      providerOrUrl: 'wss://ropsten.infura.io/ws/v3/' + process.env.INFURAKEY
    })

    console.log('KMSProvider initialized')
    const signer = new ethers.providers.Web3Provider(kmsProvider).getSigner()

    return signer
  } catch (e) {
    throw e
  }
}

const exampleTransaction = async () => {
  const signer = await getSigner()
  const myAddress = await signer.getAddress()
  console.log(`KMSProvider returned public key: ${myAddress}`)

  const tokenInstance = KMSToken__factory.connect(
    process.env.TOKEN_ADDRESS,
    signer
  )

  console.log('Getting tokens from faucet...')
  const tx = await tokenInstance.faucet()

  console.log('Waiting for confirmation...')
  const { status } = await tx.wait()

  if (!!status) {
    console.log('Checking balance...')
    const tx = await tokenInstance.balanceOf(myAddress)

    console.log(`Balance of ${myAddress} is ${tx.toString()}`)
  }
}

exampleTransaction().then(() => {
  process.exit(0)
})
