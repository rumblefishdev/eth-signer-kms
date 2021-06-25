const KMSToken = artifacts.require('KMSToken')

module.exports = async function (deployer) {
  deployer.deploy(KMSToken, 'KMSToken', 'KMS')
} as Truffle.Migration

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export {}
