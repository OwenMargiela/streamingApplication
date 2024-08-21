require('dotenv').config()
const fs = require('fs');
const path = require('path');

const containerName = 'hlsstreaming'
const localFolderPath = '/home/spaceriot/STREAMINGAPP/stream-pipe-output_hls_LIMC';
const accountName = process.env.ACCOUNT_NAME;
const sasToken = process.env.SAS_TOKEN;



const AZURE = require("@azure/storage-blob");
const blobServiceClient = new AZURE.BlobServiceClient(`https://${accountName}.blob.core.windows.net?${sasToken}`);
const containerClient = blobServiceClient.getContainerClient(containerName);

async function uploadFolder(folderPath, containerClient, destinationFolder) {
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Recursively upload subdirectories
            await uploadFolder(filePath, containerClient, destinationFolder);
        } else {
            // Upload file
            await uploadFile(filePath, containerClient, destinationFolder);
        }
    }
}

async function uploadFile(filePath, containerClient, destinationFolder) {
    // Construct the blob name with the destination folder
    const relativePath = path.relative(localFolderPath, filePath).replace(/\\/g, '/');
    const blobName = path.join(destinationFolder, relativePath).replace(/\\/g, '/');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log(`Uploading ${filePath} as ${blobName}`);
    
    // Upload file to Blob Storage
    const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
    console.log(`Uploaded blob ${blobName} successfully`, uploadBlobResponse.requestId);
}

async function main() {
    try {
        // Ensure the container exists
        await containerClient.createIfNotExists();
        const filename = localFolderPath.split('/')
        const destination = filename[4]
        
        // Start the upload process
        await uploadFolder(localFolderPath, containerClient,destination)
        console.log('Folder uploaded successfully');
    } catch (error) {
        console.error('Error uploading folder:', error.message);
    }
}

main();
