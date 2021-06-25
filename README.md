# @rumblefishdev/eth-signer-kms

Web3 provider that derives address and signs transactions using [AWS KMS](https://aws.amazon.com/kms/).

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


KMSProvider can be used as a standalone Web3 provider and within Truffle config. It's based on [@truffle/hdwallet-provider](https://www.npmjs.com/package/@truffle/hdwallet-provider) so wallet non-related params (`providerOrUrl`, `shareNonce`, `poolingInterval` and `chainId`) remain the same. 

`keyId` can be obtained via `KMS` package of `aws-sdk` or directly via AWS console.


### Parameters:

| Parameter | Type | Default | Required | Description |
| ------ | ---- | ------- | ----------- | ----------- |
|`keyId`|`string`| `null`| [x] | Key ID of AWS KMS managed private key. |
| `providerOrUrl` | `string/object` | `null` | [x] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |
| `shareNonce` | `boolean` | `true` | [ ] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |
| `pollingInterval` | `number` | `4000` | [ ] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |
| `chainId` | `number/string` | `undefined` | [ ] | [Official doc](https://github.com/trufflesuite/truffle/blob/develop/packages/hdwallet-provider/README.md#instantiation) |

## Examples
[Truffle usage example - TODO](https://github.com/rumblefishdev/eth-signer-kms)
[Web3 provider usage - TODO](https://github.com/rumblefishdev/eth-signer-kms)

## Credits:

[@lucashenning](https://github.com/lucashenning/aws-kms-ethereum-signing)
[@truffle team](https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider)


