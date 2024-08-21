require('dotenv').config();
const { EventHubConsumerClient, earliestEventPosition, latestEventPosition } = require("@azure/event-hubs");
const { fullPipeline, convertPipeline, uploadStreamToAzure } = require('./audioController.js');

//const connectionString = String(process.env.CONNECTIONSTRING);
const eventHubName = "urls";
const consumerGroup = EventHubConsumerClient.defaultConsumerGroupName;

const { TranscoderPipeline } = require('./videoController.js')
const { PassThrough } = require('stream');

const Producer = require('../producer/producer.js');
const { azure } = require('../../uploadAzureFunctions/index.js');




async function receiveMessages() {
    const consumerClient = new EventHubConsumerClient(consumerGroup, process.env.EVENTHUB_CONNECTIONSTRING,eventHubName);

    consumerClient.subscribe({
        processEvents: async (events, context) => {
            for (const event of events) {
                let eventData;
                try {
                } catch (error) {
                    eventData = event.body.toString(); // Fall back to string if JSON parsing fails
                }

                console.log(`Received event: ${event.body}`);
                if (event.body === undefined) {
                    console.log("event data is undefined, Pipeline will not be executed")
                    }
                    else {
                        console.log('Executing Pipeline')
                        
                    
                    
                        //TranscoderPipeline(event.body)
                    
                    try {
                        /*

                        let metaData = await fullPipeline(event.body)
                        //console.log(metaData.filename)
                        
                        const [_, webVTT] = await convertPipeline(metaData.filename)
                        console.log('Log in consumer File Index\n'+webVTT)
                        
                        const webVTTStream = new PassThrough()
                        
                        webVTTStream.end(webVTT)
                        
                        const fileName = 'caption_for-' + metaData.filename.replace('.wav', '.vtt')
                        
                        azure.uploadStreamToAzure(fileName, webVTTStream, 'videocaptions')
                        
                            .then( array => {
                            let webVTT = array[1]
                            console.log(webVTT)
                            })
                        */
                       //console.log(`${metaData} should not be undefined` )

                    } catch (error) {
                        console.log(`Error uploading file to azure ${error}`)
                    }
                                

                }

            }
        },
        processError: async (err, context) => {
            console.error(`Error processing events: ${err}`);
        }
    }, { startPosition: latestEventPosition });

    // Handling process termination signals to close the consumer client gracefully
    const shutdown = async () => {
        console.log("Shutting down consumer client...");
        await consumerClient.close();
        process.exit();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

receiveMessages();
