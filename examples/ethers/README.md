# Example usage with ethers js

#### * Before use, make sure that AWS SDK is properly configured! Find out how to do it [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).

### How to run
1. `$ npm install`
2. Create `.env`:
```
KEYID=your key id
INFURAKEY=your infura API key
TOKEN_ADDRESS=your KMS Token address
```

3. `$ npm run compile`
4. If you don't have `KMS_TOKEN_ADDRESS` from [Truffle example]() then run `$ npm run migrate -- --network ropsten` to get the contract address, otherwise skip this step.
5. `$ npm start`

This example uses `ropsten` network but feel free to give it a try on any network config of your choice by modifying `truffle-config.js` 