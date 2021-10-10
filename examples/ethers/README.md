# Example usage with ethers js

#### * Before use, make sure that AWS SDK is properly configured! Find out how to do it [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).

If you don't have `TOKEN_ADDRESS` yet, please run [Truffle example]() 
### How to run
1. `$ npm install`
2. Create `.env`:
```
# Original
KEYID=your key id
INFURAKEY=your infura API key
TOKEN_ADDRESS=KMS Token address

# New
KEYID=your key id
PROVIDER=your provider url
ACCESSKEYID=your aws access key id
SECRETACCESSKEY=your aws secrect access key
REGION=your aws service region
TOKEN_ADDRESS=KMS Token address
```
3. `$ npm start`
