const fs = require('fs');
const { spawn } = require('child_process');
//const { PassThrough } = require('stream');

// Define specs
const specs = [
    { resolution: '1280x720', bitrate: '2500k', audioBitrate: '192k', dir: 'output_720' },
    { resolution: '854x480', bitrate: '1000k', audioBitrate: '128k', dir: 'output_480' },
    { resolution: '320x180', bitrate: '500k', audioBitrate: '64k', dir: 'output_180' }
];

//const outputDir = 'path/to/output/dir';
const videoBuffer = fs.readFileSync('/home/spaceriot/STREAMINGAPP/LIMC.mp4'); // Adjust this path as needed

async function processSpec1(spec,i) {
    let logfile = fs.createWriteStream(`${spec.dir}.log`, { flags: 'a' });
    let m3u8File = fs.createWriteStream(`${spec.resolution}.m3u8`, { flags: 'a' });
    console.log(spec)
    await new Promise((resolve, reject) => {
        const command = [
            '-i', 'pipe:0',
            '-c:v', 'libx264', '-b:v', spec.bitrate, '-s', spec.resolution, '-profile:v', 'baseline',
            '-c:a', 'aac', '-b:a', spec.audioBitrate, '-ac', '2',
            '-f', 'hls',
            '-hls_time', '4',
            '-hls_list_size', '10',
            '-hls_flags', 'independent_segments',
            '-hls_segment_type', 'mpegts',
            '-hls_playlist_type', 'vod',
            'pipe:1'
        ];
        
        const ffmpeg = spawn('ffmpeg', command, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        ffmpeg.stdin.write(videoBuffer);
        ffmpeg.stdin.end();
        
        ffmpeg.stdout.pipe(logfile);
        ffmpeg.stderr.pipe(m3u8File);
        
        let binfile = fs.createWriteStream(`${spec.resolution}.bin`, { flags: 'a' });
        ffmpeg.stdout.pipe(binfile);
        
        ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    console.error(`FFmpeg process exited with code ${code}`);
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                } else {
                    console.log(`HLS encoding for ${spec.dir} complete.`);
                    resolve();
                }
            });
            
            ffmpeg.on('error', (error) => {
                console.error(`Error during video encoding: ${error.message}`);
                reject(error);
            });
        });
        
    }

    async function run() {
        //console.log("begin 2")
        try {
            
            for (let i = 0; i < specs.length; i++) {
            await processSpec1(specs[i],i)
           }

          
        
    } catch (error) {
        console.error(`Failed to process ${specs[0].dir}: ${error.message}`);
    }
    
    console.log('All processing complete.');
}
run()

function main(){
    console.log('main run')
    try {
        
        fs.readFile('/home/spaceriot/STREAMINGAPP/output_180.log', (err, data) => {
            if (err) throw err;
            
        // Assuming binary data is separated or identifiable, extract it
        // For demonstration purposes, you may need to adjust the regex based on actual patterns
        const binarySectionRegex = /#START_BINARY([\s\S]*?)#END_BINARY/;
        const binaryMatch = data.toString().match(binarySectionRegex);
        const binaryContent = binaryMatch ? binaryMatch[1] : '';
        
        if (binaryContent) {
            fs.writeFile('binarydata.bin', binaryContent, (err) => {
                if (err) throw err;
                console.log('Binary data saved.');
          });
        }else{
            console.log("No content")
        }
    });
} catch (error) {
    console.log(error)
}
}

//main()