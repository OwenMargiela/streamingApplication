require('dotenv').config()
const { AzureInstance } = require('./azureUploadHelper.js')

const accountName = process.env.ACCOUNT_NAME;
const sasToken = process.env.SAS_TOKEN;

const azure = new AzureInstance()
azure.setBlobWithAccountNameAndSasToken(accountName,sasToken)


module.exports = {
    azure
}



