
const AZURE = require("@azure/storage-blob");
const { PassThrough } = require('stream')

const fs = require('fs');
const path = require('path');


class AzureInstance {
    #blobServiceClient
    #Active = false

    /**
     * Blob service instancing using an existing client instance
     * @param { AZURE.BlobServiceClient} blobServiceClient 
     */
    constructor(blobServiceClient) {
        if(blobServiceClient !== undefined && this.#Active === false){
            this.#blobServiceClient = blobServiceClient;
            this.#Active = true
        }else if(this.#Active === true){
            throw new Error("Blob instance is already active")
        }
    }

    /**
     * @returns {boolean}
     */
    hasInstance(){
        return this.#Active
    }
    /**
     *Instanciating a new blob service with using the account name and sasToken
     * @param {string} accountName
     * @param {string} sasToken
     */
    setBlobWithAccountNameAndSasToken(accountName, sasToken) {
        if((accountName && sasToken) && this.#Active === false){
            this.#blobServiceClient = new AZURE.BlobServiceClient(`https://${accountName}.blob.core.windows.net?${sasToken}`);
            this.#Active = true
        }else if(this.#Active === true){
            throw new Error("Blob instance is already active")
        }
    }
    /**
     * Uploads a stream to Azure Blob Storage in chunks.
     *
     * @param {string} filename - The name of the file to upload.
     * @param {PassThrough} stream - The stream containing the file data.
     * @param {string} dest - The destination container name.
     * @returns {Promise<string>} - The URL of the uploaded file.
    */
    async uploadStreamToAzure(filename, stream, dest) {
        console.log("destination:", dest);
        console.log("filename:", filename);
        console.log("filename type:", typeof filename);

        const blockIDs = [];
        const captionContainerClient = this.#blobServiceClient.getContainerClient(dest);
        const blockBlobClient = captionContainerClient.getBlockBlobClient(filename);

        let blockNumber = 0;
        const blockSize = 4 * 1024 * 1024;
        const bufferArray = [];

        return new Promise(async (resolve, rejects) => {

            stream.on('data', chunk => {
                bufferArray.push(chunk);
            });

            stream.on('error', (err) => {
                console.error('Stream error:', err);
                rejects();
            });

            stream.on('end', async () => {
                const buffer = Buffer.concat(bufferArray);
                let offset = 0;


                while (offset < buffer.length) {
                    const chunk = buffer.slice(offset, Math.min(offset + blockSize, buffer.length));
                    const blockID = this.#generateID(blockNumber);
                    blockIDs.push(blockID);

                    await blockBlobClient.stageBlock(blockID, chunk, chunk.length);
                    blockNumber++;
                    offset += chunk.length;
                }
                await blockBlobClient.commitBlockList(blockIDs);
                
                //{blobHTTPHeaders: { blobContentType: 'text/vtt' }}

                //console.log('File uploaded to:', file_URL);
                const url = `https://${process.env.ACCOUNT_NAME}.blob.core.windows.net/${dest}/${filename}`;
                resolve(url);


            });
        });
    }
    /**
     *
     * @param {string} blobname
     * @param {string} container
     * @returns {Promise<NodeJS.ReadableStream>}
     */
    async downloadAudioFromAzure(container, blobname) {
        const { decode } = require('wav-decoder');

        const containerClient = this.#blobServiceClient.getContainerClient(container);
        const blockBlobClient = containerClient.getBlobClient(blobname);
        const blobresponse = await blockBlobClient.download(0);

        const chunks = [];
        const stream = blobresponse.readableStreamBody;

        stream.on('data', (chunk) => chunks.push(chunk));

        stream.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            try {
                const wavData = await decode(buffer);
                console.log('Audio Format:', wavData.sampleRate, 'Hz');
                console.log('Channels:', wavData.channelData.length);
                console.log('Bit Depth:', wavData.bitDepth);
            } catch (err) {
                console.error('Error decoding WAV file:', err);
            }
        });
        stream.on('error', (err) => console.error('Error reading stream:', err));

        return blobresponse.readableStreamBody;
    }


    async  uploadFolder(folderPath, destinationFolder,localFolderPath) {
        const files = fs.readdirSync(folderPath);
        
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Recursively upload subdirectories
                await this.uploadFolder(filePath, destinationFolder,localFolderPath);
            } else {
                // Upload file
                await this.#uploadFile(filePath, destinationFolder,localFolderPath);
            }
        }
    }
    
    async  #uploadFile(filePath, destinationFolder,localFolderPath) {
        // Construct the blob name with the destination folder
        const relativePath = path.relative(localFolderPath, filePath).replace(/\\/g, '/');
        const blobName = path.join(destinationFolder, relativePath).replace(/\\/g, '/');
        const containerClient = this.#blobServiceClient.getContainerClient('hlsstreaming')
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        console.log(`Uploading ${filePath} as ${blobName}`);
        
        // Upload file to Blob Storage
        const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
        console.log(`Uploaded blob ${blobName} successfully`, uploadBlobResponse.requestId);
    }
    
    /**
     *
     * @param {string} filename
     * @param {Buffer} buffer
     * @returns {string}
     */
    #generateID(blockNumber) {
        const prefix = 'block-';
        let bloackId = prefix + blockNumber.toString().padStart(5, '0');
        bloackId = Buffer.from(bloackId, 'utf-8').toString('base64');
        return bloackId;
    }
}


module.exports = {
    AzureInstance
} 