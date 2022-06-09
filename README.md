# @rumblefishdev/eth-signer-kms

Web3 signer that derives address and signs transactions using [AWS KMS](https://aws.amazon.com/kms/).

## Install
```
$ npm i @rumblefishdev/eth-signer-kms
```

## Requirements
```
aws-sdk
```

In order to work properly AWS KMS managed key must be:
- asymmetric
- able to sign and verify
- ECC_SECG_P256K1 specified


## Usage

#### * Before use, make sure that AWS SDK is properly configured! Find out how to do it [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).


KMSSigner is an [ethers](https://docs.ethers.io/v5/api/signer/) `Signer` instance that uses AWS KMS stored keys to sign ethereum transactions.

`keyId` can be obtained via `KMS` package of `aws-sdk` or directly via AWS console.
https://github.com/ethereumjs/ethereumjs-monorepo

### Parameters:

| Parameter | Type | Default | Required | Description |
| ------ | ---- | ------- | ----------- | ----------- |
|`keyId`|`string`| `null`| [x] | Key ID of AWS KMS managed private key |
| `provider` | `providers.Provider` | `null` | [x] | [Official doc](https://docs.ethers.io/v5/api/providers/provider/) |
|`kmsInstance` | `AWS.KMS` | `new AWS.KMS()` | [ ] | KMS instance from [Official doc](https://www.npmjs.com/package/aws-sdk)

## Examples

##### KmsSigner
- [KmsSigner initialization](https://github.com/rumblefishdev/eth-signer-kms/blob/master/tests/signer.test.ts#L50)
```
new KMSSigner(provider, keyId, kms)
```

- [signMessage](https://github.com/rumblefishdev/eth-signer-kms/blob/master/tests/signer.test.ts#L72)
```
await kmsSigner.signMessage(...)
```

- [_signTypedData](https://github.com/rumblefishdev/eth-signer-kms/blob/master/tests/signer.test.ts#L102)
```
await kmsSigner._signTypedData(...)
```
##### function getEthAddressFromKMS
- [getEthAddressFromKMS](https://github.com/rumblefishdev/eth-signer-kms/blob/master/tests/signer.test.ts#L39)
```
await getEthAddressFromKMS(...)
```

## Migration from v1.7.0 to v2.0.0:
`KMSProvider` class became `KMSSigner`, as its instance no longer creates provider but receives one in constructor.

That approach extracts provider dependency from the package and as a result makes it more flexible in terms of use and testing.

### Version 1.7.0:

| Parameter | Type | Default | Required | Description |
| ------ | ---- | ------- | ----------- | ----------- |
|`keyId`|`string`| `null`| [x] | Key ID of AWS KMS managed private key |
| `providerOrUrl` | `string/object` | `null` | [x] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |
|`chainSettings` | `Common` | `{}` | [ ] | Common object used to configure tx options. If chainId is not passed, it will be obtained automatically via `eth_chainId`. For details instructions please refer to [Common](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common) and [Tx]() official docs|
| `shareNonce` | `boolean` | `true` | [ ] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |
| `pollingInterval` | `number` | `4000` | [ ] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |

## Credits:

[@lucashenning](https://github.com/lucashenning/aws-kms-ethereum-signing)
[@truffle team](https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider)