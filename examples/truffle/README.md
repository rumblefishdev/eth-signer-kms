# Example migration with Truffle

#### * Before use, make sure that AWS SDK is properly configured! Find out how to do it [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).

### How to run
1. `$ npm install`
2. Create `.env`:
```
# Original
KEYID=your key id
INFURAKEY=your infura API key

# New
KEYID=your key id
PROVIDER=your provider url
ACCESSKEYID=your aws access key id
SECRETACCESSKEY=your aws secrect access key
REGION=your aws service region
```
3. `$ npm run compile`
4. `$ npm run migrate -- --network ropsten`

This example uses `ropsten` network but feel free to give it a try on any network config of your choice by modifying `truffle-config.js` 